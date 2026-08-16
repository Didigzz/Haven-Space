import { setStoredAuth } from './auth-store';
import { getApiBaseUrl } from './config';
import type { AuthUser } from './types';

/**
 * Parse the `#auth={payload}` hash fragment the Google OAuth callback
 * redirects back to (see the Worker's handleGoogleCallback), persist the
 * session, and return the authenticated user. Returns null when no hash
 * fragment is present or it is malformed. Client-only.
 */
export function handleOAuthHash(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash.startsWith('#auth=')) return null;

  try {
    const raw = decodeURIComponent(hash.slice(6));
    const data = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
      user?: AuthUser;
    };

    if (!data.access_token || !data.user) return null;

    setStoredAuth(data.access_token, data.refresh_token, data.user);

    // Clean the hash so refresh/re-share doesn't re-run the handler.
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search
    );

    return data.user;
  } catch {
    return null;
  }
}

/**
 * Role-based redirect target after login/registration, status-aware for
 * boarders: an accepted-but-unconfirmed application lands the boarder on the
 * confirm-booking page (per the accepted-boarder landing decision); other
 * statuses follow the API's boarderRedirectPath mapping.
 */
export function redirectPathForUser(user: AuthUser): string {
  switch (user.role) {
    case 'admin':
      return '/admin';
    case 'landlord':
      return '/landlord';
    case 'boarder':
    default:
      return boarderRedirectPath(user);
  }
}

function boarderRedirectPath(user: AuthUser): string {
  switch (user.boarder_status) {
    case 'accepted':
      return '/boarder/confirm-booking';
    case 'confirmed':
      return '/boarder';
    case 'applied_pending':
    case 'pending_confirmation':
    case 'rejected':
      return '/boarder/applications';
    case 'new':
    case 'browsing':
    default:
      return '/boarder/find-a-room';
  }
}

/**
 * Build the Google OAuth authorize URL for the given action and role. The role
 * is a hint only — for a brand-new email the role chooser decides.
 */
export function googleAuthorizeUrl(
  action: 'login' | 'signup',
  role: 'boarder' | 'landlord'
): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return `${getApiBaseUrl()}/auth/google/authorize?action=${action}&role=${role}&origin=${encodeURIComponent(
    origin
  )}`;
}

/**
 * Claims carried by the `#google-pending=` fragment the OAuth callback redirects
 * to for brand-new (or not-yet-linked) Google emails. Parsed client-side for
 * display only — the server re-verifies the signed token on completion.
 */
export interface GooglePendingSession {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string | null;
  action: 'login' | 'signup';
  link: boolean;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Parse the unverified claims of a `google_pending` JWT. Returns null when the
 * token is not shaped like a valid pending session.
 */
export function parseGooglePendingToken(token: string): GooglePendingSession | null {
  const payload = decodeJwtPayload(token);
  if (!payload || payload.type !== 'google_pending') return null;
  if (typeof payload.googleId !== 'string' || typeof payload.email !== 'string') return null;

  return {
    googleId: payload.googleId,
    email: payload.email,
    firstName: typeof payload.firstName === 'string' ? payload.firstName : 'Google',
    lastName: typeof payload.lastName === 'string' ? payload.lastName : 'User',
    picture: typeof payload.picture === 'string' ? payload.picture : null,
    action: payload.action === 'signup' ? 'signup' : 'login',
    link: payload.link === true,
  };
}

/**
 * Read the `#google-pending={jwt}` fragment and return the raw token plus its
 * parsed claims, or null when absent/malformed. Client-only.
 */
export function handleGooglePendingHash(): {
  token: string;
  session: GooglePendingSession;
} | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash.startsWith('#google-pending=')) return null;

  try {
    const token = decodeURIComponent(hash.slice('#google-pending='.length));
    const session = parseGooglePendingToken(token);
    if (!session) return null;
    return { token, session };
  } catch {
    return null;
  }
}

/**
 * Remove the `#google-pending=` fragment once consumed so refresh/re-share
 * doesn't re-run the flow (and the JWT doesn't linger in the URL).
 */
export function clearGooglePendingHash(): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname + window.location.search
  );
}

/**
 * Shared `?error=` search-param reader for the auth pages (TanStack
 * validateSearch). Used so the API-provided OAuth failure messages are surfaced
 * as inline banners instead of being silently dropped.
 */
export function authErrorSearch(search: Record<string, unknown>): { error?: string } {
  const error = typeof search.error === 'string' ? search.error.trim() : '';
  return error ? { error } : {};
}
