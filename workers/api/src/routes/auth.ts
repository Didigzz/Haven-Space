import { Hono, type Context } from 'hono';
import { compare, hash } from 'bcryptjs';

import type { Env } from '../env';
import { authenticateUser, cookieValue, signJwt, verifyJwt } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { readJsonObject, type JsonRecord } from '../lib/validation';
import {
  createLandlordProfile,
  createGoogleUserAccount,
  createUserAccount,
  determineBoarderStatus,
  findAuthUserByEmail,
  findUserAccountByGoogleId,
  findUserAccountByEmail,
  findUserAccountById,
  updateGoogleIdentity,
  type UserAccountRow,
} from '../repositories/users';

const authRoutes = new Hono<{ Bindings: Env }>();
const accessTokenSeconds = 60 * 60;
const refreshTokenSeconds = 60 * 60 * 24 * 30;
const googleStateCookieName = 'google_oauth_state';
const googleStateSeconds = 10 * 60;
const googleAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
const googleTokenEndpoint = 'https://oauth2.googleapis.com/token';
const googleUserInfoEndpoint = 'https://openidconnect.googleapis.com/v1/userinfo';

type OAuthAction = 'login' | 'signup';
type OAuthRole = 'boarder' | 'landlord';

interface GoogleStatePayload {
  type?: string;
  action?: string;
  role?: string;
  origin?: string;
  nonce?: string;
  exp?: number;
}

interface GoogleTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GoogleProfileResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const email = value.trim();
  return email ? email.toLowerCase() : null;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function stringField(body: JsonRecord, field: string): string {
  const value = body[field];

  return typeof value === 'string' ? value.trim() : '';
}

function missingRequired(body: JsonRecord, fields: string[]): boolean {
  return fields.some(field => !stringField(body, field));
}

function userPayload(user: UserAccountRow): Record<string, unknown> {
  return {
    user_id: Number(user.id),
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    is_verified: Boolean(user.is_verified),
    account_status: user.account_status,
    verification_status:
      user.role === 'landlord' ? (user.is_verified ? 'approved' : 'pending') : null,
  };
}

async function authTokens(user: UserAccountRow, secret?: string) {
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  const payload = userPayload(user);
  const accessToken = await signJwt(payload, secret, accessTokenSeconds);
  const refreshToken = await signJwt(payload, secret, refreshTokenSeconds);

  return { accessToken, refreshToken };
}

function authCookie(name: string, value: string, maxAge: number, env: Env): string {
  const secure = env.APP_ENV === 'production' ? '; Secure' : '';

  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function authResponse(
  env: Env,
  body: unknown,
  accessToken: string,
  refreshToken: string,
  status = 200
): Response {
  const response = jsonResponse(body, status);
  response.headers.append(
    'Set-Cookie',
    authCookie('access_token', accessToken, accessTokenSeconds, env)
  );
  response.headers.append(
    'Set-Cookie',
    authCookie('refresh_token', refreshToken, refreshTokenSeconds, env)
  );

  return response;
}

function transientCookie(name: string, value: string, maxAge: number, env: Env): string {
  const secure = env.APP_ENV === 'production' ? '; Secure' : '';

  return `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function redirectResponse(location: string, headers?: Headers): Response {
  const responseHeaders = headers ? new Headers(headers) : new Headers();
  responseHeaders.set('Location', location);

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
}

function randomToken(bytes = 24): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);

  let binary = '';
  for (const value of values) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function configuredOrigins(env: Env): string[] {
  return (env.APP_ORIGIN || env.ALLOWED_ORIGINS || env.APP_BASE_URL || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function parseOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalhostOrigin(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

function allowFrontendOrigin(env: Env, requestedOrigin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes(requestedOrigin)) {
    return true;
  }

  const isProduction = env.APP_ENV === 'production';
  return (
    !isProduction &&
    isLocalhostOrigin(requestedOrigin) &&
    allowedOrigins.some(origin => isLocalhostOrigin(origin))
  );
}

function frontendOrigin(c: Context<{ Bindings: Env }>): string {
  const allowedOrigins = configuredOrigins(c.env);
  const requestedOrigin =
    parseOrigin(c.req.query('origin') ?? null) ?? parseOrigin(c.req.header('Referer') ?? null);

  if (requestedOrigin && allowFrontendOrigin(c.env, requestedOrigin, allowedOrigins)) {
    return requestedOrigin;
  }

  return allowedOrigins[0] ?? 'http://localhost:3000';
}

function frontendUrl(origin: string, path: string): string {
  return new URL(path, origin.endsWith('/') ? origin : `${origin}/`).toString();
}

function authErrorRedirect(
  env: Env,
  origin: string,
  action: OAuthAction,
  message: string
): Response {
  const path = action === 'signup' ? '/auth/signup.html' : '/auth/login.html';
  const url = new URL(path, origin.endsWith('/') ? origin : `${origin}/`);
  url.searchParams.set('error', message);

  return redirectResponse(url.toString(), clearGoogleStateHeaders(env));
}

function clearGoogleStateHeaders(env: Env): Headers {
  const headers = new Headers();
  headers.append('Set-Cookie', transientCookie(googleStateCookieName, '', 0, env));
  return headers;
}

function oauthAction(value: string | undefined): OAuthAction {
  return value === 'signup' ? 'signup' : 'login';
}

function oauthRole(value: string | undefined): OAuthRole {
  return value === 'landlord' ? 'landlord' : 'boarder';
}

function googleRedirectUri(c: Context<{ Bindings: Env }>): string {
  return c.env.GOOGLE_REDIRECT_URI || new URL('/api/auth/google/callback', c.req.url).toString();
}

function requireGoogleConfig(c: Context<{ Bindings: Env }>) {
  if (!c.env.JWT_SECRET) {
    throw new Error('JWT secret is not configured');
  }

  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured');
  }

  return {
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
    jwtSecret: c.env.JWT_SECRET,
  };
}

function userHashPayload(
  user: Record<string, unknown>,
  accessToken: string,
  refreshToken: string
): string {
  return encodeURIComponent(
    JSON.stringify({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
      ...user,
    })
  );
}

function boarderRedirectPath(user: Record<string, unknown>): string {
  const status = String(user.boarder_status || user.boarderStatus || 'new');

  switch (status) {
    case 'accepted':
      return '/boarder/index.html';
    case 'applied_pending':
    case 'pending_confirmation':
    case 'rejected':
      return '/boarder/applications-dashboard/index.html';
    case 'new':
    case 'browsing':
    default:
      return '/boarder/find-a-room/index.html';
  }
}

function redirectPathForUser(user: Record<string, unknown>): string {
  switch (user.role) {
    case 'admin':
      return '/admin/index.html';
    case 'landlord':
      return '/landlord/index.html';
    case 'boarder':
    default:
      return boarderRedirectPath(user);
  }
}

async function formatUserResponse(db: D1Database, user: UserAccountRow) {
  const response: Record<string, unknown> = {
    id: Number(user.id),
    user_id: Number(user.id),
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    is_verified: Boolean(user.is_verified),
    email_verified: Boolean(user.email_verified),
    account_status: user.account_status,
    avatar_url: user.avatar_url,
    phone_number: user.phone_number,
    verification_status:
      user.role === 'landlord' ? (user.is_verified ? 'approved' : 'pending') : null,
  };

  if (user.role === 'boarder') {
    response.boarder_status = await determineBoarderStatus(db, Number(user.id));
  }

  return response;
}

function validatePhilippinePhone(value: string): boolean {
  const clean = value.replace(/\D/g, '');

  return /^(63|0)?9\d{9}$/.test(clean);
}

async function createGoogleState(
  secret: string,
  input: { action: OAuthAction; role: OAuthRole; origin: string; nonce: string }
): Promise<string> {
  return await signJwt(
    {
      type: 'google_oauth_state',
      action: input.action,
      role: input.role,
      origin: input.origin,
      nonce: input.nonce,
    },
    secret,
    googleStateSeconds
  );
}

async function verifiedGoogleState(
  c: Context<{ Bindings: Env }>,
  state: string | null
): Promise<GoogleStatePayload | null> {
  if (!state || !c.env.JWT_SECRET) {
    return null;
  }

  const payload = await verifyJwt(state, c.env.JWT_SECRET);

  if (
    !payload ||
    payload.type !== 'google_oauth_state' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.origin !== 'string'
  ) {
    return null;
  }

  const cookieNonce = cookieValue(c.req.raw, googleStateCookieName);

  if (!cookieNonce || cookieNonce !== payload.nonce) {
    return null;
  }

  return payload;
}

async function googleTokens(c: Context<{ Bindings: Env }>, code: string): Promise<string> {
  const { clientId, clientSecret } = requireGoogleConfig(c);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: googleRedirectUri(c),
  });

  const response = await fetch(googleTokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }

  return data.access_token;
}

async function googleProfile(accessToken: string): Promise<GoogleProfileResponse> {
  const response = await fetch(googleUserInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = (await response.json()) as GoogleProfileResponse;

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Google profile request failed');
  }

  return data;
}

function profileEmailVerified(profile: GoogleProfileResponse): boolean {
  return profile.email_verified === true || profile.email_verified === 'true';
}

function splitGoogleName(profile: GoogleProfileResponse): { firstName: string; lastName: string } {
  const given = profile.given_name?.trim() ?? '';
  const family = profile.family_name?.trim() ?? '';

  if (given || family) {
    return {
      firstName: given || 'Google',
      lastName: family || 'User',
    };
  }

  const parts = (profile.name || profile.email || 'Google User').trim().split(/\s+/);

  return {
    firstName: parts[0] || 'Google',
    lastName: parts.slice(1).join(' ') || 'User',
  };
}

async function userFromGoogleProfile(
  db: D1Database,
  profile: GoogleProfileResponse,
  action: OAuthAction,
  role: OAuthRole
): Promise<UserAccountRow> {
  const googleId = profile.sub?.trim();
  const email = normalizeEmail(profile.email);

  if (!googleId || !email) {
    throw new Error('Google did not return a usable profile');
  }

  if (!profileEmailVerified(profile)) {
    throw new Error('Google account email is not verified');
  }

  const byGoogleId = await findUserAccountByGoogleId(db, googleId);

  if (byGoogleId) {
    return byGoogleId;
  }

  const byEmail = await findUserAccountByEmail(db, email);

  if (byEmail) {
    if (byEmail.google_id && byEmail.google_id !== googleId) {
      throw new Error('This email is already linked to another Google account');
    }

    await updateGoogleIdentity(db, Number(byEmail.id), {
      googleId,
      googlePicture: profile.picture ?? null,
    });

    const linked = await findUserAccountById(db, Number(byEmail.id));

    if (!linked) {
      throw new Error('Unable to load linked Google account');
    }

    return linked;
  }

  if (role === 'landlord') {
    throw new Error('Please create landlord accounts with the landlord signup form.');
  }

  const { firstName, lastName } = splitGoogleName(profile);
  const userId = await createGoogleUserAccount(db, {
    firstName,
    lastName,
    email,
    googleId,
    googlePicture: profile.picture ?? null,
    role,
    accountStatus: 'active',
    isVerified: 1,
    emailVerified: 1,
    boarderStatus: action === 'signup' || action === 'login' ? 'new' : null,
  });
  const created = await findUserAccountById(db, userId);

  if (!created) {
    throw new Error('Unexpected Google signup error');
  }

  return created;
}

async function handleGoogleAuthorize(c: Context<{ Bindings: Env }>): Promise<Response> {
  const action = oauthAction(c.req.query('action'));
  const role = oauthRole(c.req.query('role'));
  const origin = frontendOrigin(c);
  let clientId: string;
  let jwtSecret: string;

  try {
    const config = requireGoogleConfig(c);
    clientId = config.clientId;
    jwtSecret = config.jwtSecret;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google OAuth is not configured';
    return authErrorRedirect(c.env, origin, action, message);
  }

  const nonce = randomToken();
  const state = await createGoogleState(jwtSecret, {
    action,
    role,
    origin,
    nonce,
  });
  const url = new URL(googleAuthEndpoint);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', googleRedirectUri(c));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');

  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    transientCookie(googleStateCookieName, nonce, googleStateSeconds, c.env)
  );

  return redirectResponse(url.toString(), headers);
}

async function handleGoogleCallback(c: Context<{ Bindings: Env }>): Promise<Response> {
  const state = await verifiedGoogleState(c, c.req.query('state') ?? null);
  const fallbackOrigin = frontendOrigin(c);
  const origin =
    state?.origin && configuredOrigins(c.env).includes(state.origin)
      ? state.origin
      : fallbackOrigin;
  const action = oauthAction(state?.action);

  if (c.req.query('error')) {
    return authErrorRedirect(
      c.env,
      origin,
      action,
      c.req.query('error_description') || 'Google login was cancelled'
    );
  }

  if (!state) {
    return authErrorRedirect(
      c.env,
      origin,
      action,
      'Google login session expired. Please try again.'
    );
  }

  const code = c.req.query('code');

  if (!code) {
    return authErrorRedirect(c.env, origin, action, 'Google did not return an authorization code.');
  }

  try {
    const db = requireD1(c.env);
    const googleAccessToken = await googleTokens(c, code);
    const profile = await googleProfile(googleAccessToken);
    const user = await userFromGoogleProfile(db, profile, action, oauthRole(state.role));

    if (['suspended', 'banned'].includes(user.account_status)) {
      return authErrorRedirect(
        c.env,
        origin,
        action,
        'This account is suspended or banned. Contact support if you believe this is a mistake.'
      );
    }

    const { accessToken, refreshToken } = await authTokens(user, c.env.JWT_SECRET);
    const formattedUser = await formatUserResponse(db, user);
    const redirectUrl = new URL(redirectPathForUser(formattedUser), `${origin}/`);
    redirectUrl.hash = `auth=${userHashPayload(formattedUser, accessToken, refreshToken)}`;

    const headers = clearGoogleStateHeaders(c.env);
    headers.append(
      'Set-Cookie',
      authCookie('access_token', accessToken, accessTokenSeconds, c.env)
    );
    headers.append(
      'Set-Cookie',
      authCookie('refresh_token', refreshToken, refreshTokenSeconds, c.env)
    );

    return redirectResponse(redirectUrl.toString(), headers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Google login failed. Please try again.';

    return authErrorRedirect(c.env, origin, action, message);
  }
}

authRoutes.post('/auth/check-email', async c => {
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);

  if (!email) {
    return errorResponse(400, 'Email is required');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  const user = await findAuthUserByEmail(requireD1(c.env), email);

  if (!user) {
    return jsonResponse({
      exists: false,
      is_google_account: false,
    });
  }

  return jsonResponse({
    exists: true,
    is_google_account: Boolean(user.google_id) && !user.password_hash,
  });
});

async function handleRegister(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const firstName = stringField(body, 'firstName');
  const lastName = stringField(body, 'lastName');
  const email = normalizeEmail(body.email);
  const password = stringField(body, 'password');
  const role = stringField(body, 'role');

  if (!firstName || !lastName || !email || !password || !role) {
    return errorResponse(400, 'Missing required fields');
  }

  if (role !== 'boarder' && role !== 'landlord') {
    return errorResponse(400, 'Invalid role');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  if (password.length < 8) {
    return errorResponse(400, 'Password must be at least 8 characters long');
  }

  if (role === 'landlord') {
    if (
      missingRequired(body, [
        'businessName',
        'city',
        'province',
        'phoneNumber',
        'idType',
        'idNumber',
      ])
    ) {
      return errorResponse(400, 'Missing required landlord profile fields');
    }

    if (!validatePhilippinePhone(stringField(body, 'phoneNumber'))) {
      return errorResponse(400, 'Invalid Philippine mobile number format');
    }
  }

  const existing = await findUserAccountByEmail(db, email);

  if (existing) {
    return jsonResponse(
      {
        success: false,
        error: 'Email already exists',
        message:
          'This email address is already registered. Please use a different email or try logging in instead.',
      },
      409
    );
  }

  const passwordHash = await hash(password, 10);
  const userId = await createUserAccount(db, {
    firstName,
    lastName,
    email,
    passwordHash,
    role,
    accountStatus: role === 'landlord' ? 'pending_verification' : 'active',
    isVerified: role === 'landlord' ? 0 : 1,
    emailVerified: role === 'landlord' ? 0 : 1,
    boarderStatus: role === 'boarder' ? 'new' : null,
  });

  if (role === 'landlord') {
    await createLandlordProfile(db, {
      userId,
      boardingHouseName: stringField(body, 'businessName'),
      boardingHouseDescription: stringField(body, 'businessDescription'),
    });
  }

  const user = await findUserAccountById(db, userId);

  if (!user) {
    return errorResponse(500, 'Unexpected registration error');
  }

  const { accessToken, refreshToken } = await authTokens(user, c.env.JWT_SECRET);
  const responseData: Record<string, unknown> = {
    success: true,
    message:
      role === 'landlord'
        ? 'Landlord account created successfully. Please check your email to verify your account, then complete the verification process.'
        : 'Boarder account created successfully. Please check your email to verify your account.',
    access_token: accessToken,
    refresh_token: refreshToken,
    user: await formatUserResponse(db, user),
    nextSteps:
      role === 'landlord'
        ? [
            'Verify your email address',
            'Upload required verification documents',
            'Wait for admin approval (24-48 hours)',
            'Start listing your properties',
          ]
        : [
            'Verify your email address',
            'Complete your profile (optional)',
            'Start browsing available rooms',
          ],
  };

  return authResponse(c.env, responseData, accessToken, refreshToken);
}

async function handleLogin(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);
  const password = stringField(body, 'password');

  if (!email || !password) {
    return errorResponse(400, 'Missing email or password');
  }

  const user = await findUserAccountByEmail(db, email);

  if (!user) {
    return jsonResponse(
      {
        error: 'Account does not exist',
        message: 'This account does not exist. Please sign up first.',
      },
      401
    );
  }

  if (!user.password_hash && user.google_id) {
    return errorResponse(401, 'This account was registered with Google. Please use Google login.');
  }

  if (!user.password_hash || !(await compare(password, user.password_hash))) {
    return jsonResponse(
      {
        error: 'Wrong password',
        message: 'The password you entered is incorrect. Please try again.',
      },
      401
    );
  }

  if (['suspended', 'banned'].includes(user.account_status)) {
    return errorResponse(
      403,
      'This account is suspended or banned. Contact support if you believe this is a mistake.'
    );
  }

  const { accessToken, refreshToken } = await authTokens(user, c.env.JWT_SECRET);

  return authResponse(
    c.env,
    {
      success: true,
      access_token: accessToken,
      user: await formatUserResponse(db, user),
    },
    accessToken,
    refreshToken
  );
}

async function handleMe(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const authUser = await authenticateUser(db, c.req.raw, c.env.JWT_SECRET);
  const user = await findUserAccountById(db, authUser.user_id);

  if (!user) {
    return errorResponse(401, 'User not found');
  }

  return jsonResponse({
    success: true,
    user: await formatUserResponse(db, user),
  });
}

authRoutes.post('/auth/register', handleRegister);
authRoutes.post('/api/auth/register', handleRegister);
authRoutes.post('/auth/login', handleLogin);
authRoutes.post('/api/auth/login', handleLogin);
authRoutes.get('/auth/me', handleMe);
authRoutes.get('/api/auth/me', handleMe);
authRoutes.get('/auth/google/authorize', handleGoogleAuthorize);
authRoutes.get('/api/auth/google/authorize', handleGoogleAuthorize);
authRoutes.get('/auth/google/callback', handleGoogleCallback);
authRoutes.get('/api/auth/google/callback', handleGoogleCallback);

export default authRoutes;
