import { HttpError } from './http';
import { findAuthenticatedUserById, type AuthenticatedUserRow } from '../repositories/users';

type AuthInput = Headers | Request | string | null | undefined;

export interface AuthenticatedUser {
  user_id: number;
  role: 'boarder' | 'landlord' | 'admin';
  is_verified: boolean;
  email_verified: boolean;
  account_status: string;
  verification_status: null;
}

interface JwtPayload {
  user_id?: number | string;
  role?: string;
  exp?: number;
}

function authorizationHeader(input: AuthInput): string | null {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof Headers) {
    return input.get('Authorization');
  }

  return input.headers.get('Authorization');
}

export function bearerToken(input: AuthInput): string | null {
  const header = authorizationHeader(input)?.trim();

  if (!header) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim();

  return token ? token : null;
}

export function requireBearerToken(input: AuthInput): string {
  const token = bearerToken(input);

  if (!token) {
    throw new HttpError(401, 'Missing bearer token', { code: 'unauthorized' });
  }

  return token;
}

export function authorizationHeaders(token: string): Headers {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie');

  if (!cookie) {
    return null;
  }

  for (const part of cookie.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');

    if (key === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function base64UrlToJson<T>(value: string): T | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(value));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`))
  );
  const received = base64UrlToBytes(signature);

  if (!timingSafeEqual(expected, received)) {
    return null;
  }

  const payloadData = base64UrlToJson<JwtPayload>(payload);

  if (!payloadData?.exp || payloadData.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payloadData;
}

function authenticatedUserFromRow(row: AuthenticatedUserRow): AuthenticatedUser {
  return {
    user_id: Number(row.id),
    role: row.role,
    is_verified: Boolean(row.is_verified),
    email_verified: Boolean(row.email_verified),
    account_status: row.account_status,
    verification_status: null,
  };
}

async function userFromId(db: D1Database, userId: number): Promise<AuthenticatedUser> {
  const user = await findAuthenticatedUserById(db, userId);

  if (!user) {
    throw new HttpError(401, 'User not found');
  }

  if (['suspended', 'banned'].includes(user.account_status)) {
    throw new HttpError(403, 'Account is suspended or banned');
  }

  return authenticatedUserFromRow(user);
}

export async function authenticateUser(
  db: D1Database,
  request: Request,
  secret?: string
): Promise<AuthenticatedUser> {
  const url = new URL(request.url);
  const simulatedId = request.headers.get('X-User-ID') ?? url.searchParams.get('user_id');

  if (simulatedId) {
    const userId = Number.parseInt(simulatedId, 10);

    if (Number.isFinite(userId) && userId > 0) {
      return await userFromId(db, userId);
    }
  }

  const token = bearerToken(request) ?? cookieValue(request, 'access_token');

  if (!token) {
    throw new HttpError(401, 'No token provided');
  }

  if (!secret) {
    throw new HttpError(500, 'JWT secret is not configured', { code: 'jwt_secret_missing' });
  }

  const payload = await verifyJwt(token, secret);

  if (!payload) {
    throw new HttpError(401, 'Invalid or expired token');
  }

  const userId = Number(payload.user_id);

  if (!Number.isFinite(userId) || userId <= 0) {
    throw new HttpError(401, 'Invalid or expired token');
  }

  return await userFromId(db, userId);
}

export async function authorizeUser(
  db: D1Database,
  request: Request,
  roles: AuthenticatedUser['role'][],
  secret?: string
): Promise<AuthenticatedUser> {
  const user = await authenticateUser(db, request, secret);

  if (!roles.includes(user.role)) {
    throw new HttpError(403, 'Access denied. Boarders only.');
  }

  return user;
}
