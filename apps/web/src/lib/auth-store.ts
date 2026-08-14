import type { AuthUser } from './types';

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user';

export interface StoredAuth {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

export function getStoredAuth(): StoredAuth {
  if (typeof window === 'undefined') return { token: null, refreshToken: null, user: null };
  try {
    const userRaw = localStorage.getItem(USER_KEY);
    return {
      token: localStorage.getItem(TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_KEY),
      user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
    };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

export function setStoredAuth(
  token: string,
  refreshToken: string | undefined,
  user: AuthUser
): void {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('user_id');
  localStorage.removeItem('haven_state');
}

export function tokenExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const exp = tokenExpiry(token);
  return exp === null ? false : Date.now() / 1000 > exp;
}
