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
