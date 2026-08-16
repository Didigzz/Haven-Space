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
 * Role-based redirect target after login/registration. Boarders land on
 * /boarder; the status-aware boarder redirect (find-a-room / applications /
 * confirm-booking) lands with the boarder dashboard in Phase 3.
 */
export function redirectPathForUser(user: AuthUser): '/admin' | '/landlord' | '/boarder' {
  switch (user.role) {
    case 'admin':
      return '/admin';
    case 'landlord':
      return '/landlord';
    case 'boarder':
    default:
      return '/boarder';
  }
}

/**
 * Build the Google OAuth authorize URL for the given action and role.
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
