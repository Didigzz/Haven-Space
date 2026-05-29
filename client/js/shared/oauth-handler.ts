/**
 * Universal OAuth Redirect Handler
 * Handles OAuth callback data in URL hash fragment across all pages
 * Must be called BEFORE any auth checks to ensure tokens are stored
 */

import { getBasePath, getBoarderRedirectPath } from './routing.ts';

function userDisplayName(user) {
  return (
    user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'User'
  );
}

export function normalizeAuthPayload(authData) {
  const authUser = authData?.user || authData || {};
  const id = authUser.id || authUser.user_id;
  const boarderStatus = authUser.boarder_status || authUser.boarderStatus || 'new';

  return {
    accessToken: authData?.access_token || authData?.token || '',
    refreshToken: authData?.refresh_token || '',
    user: {
      ...authUser,
      id,
      user_id: id,
      first_name: authUser.first_name || '',
      last_name: authUser.last_name || '',
      name: userDisplayName(authUser),
      email: authUser.email || '',
      role: authUser.role || 'boarder',
      boarder_status: boarderStatus,
      boarderStatus,
    },
  };
}

export function persistAuthSession(authData) {
  const { accessToken, refreshToken, user } = normalizeAuthPayload(authData);

  if (!user.id || !accessToken) {
    throw new Error('Incomplete authentication response');
  }

  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('user_id', String(user.id));
  localStorage.setItem('token', accessToken);

  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }

  if (user.role === 'boarder') {
    localStorage.setItem('boarder_acceptance_status', user.boarder_status || 'new');
  }

  return user;
}

export function redirectForAuthenticatedUser(user) {
  const basePath = getBasePath();

  if (user.role === 'admin') {
    window.location.href = `${basePath}admin/index.html`;
    return;
  }

  if (user.role === 'landlord') {
    window.location.href = `${basePath}landlord/index.html`;
    return;
  }

  window.location.href = getBoarderRedirectPath(user);
}

/**
 * Handle Google OAuth redirect with user data in hash fragment
 * @returns {boolean} True if OAuth redirect was handled, false otherwise
 */
export function handleOAuthRedirect() {
  try {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#auth=')) {
      const authData = hash.substring(6); // Remove '#auth='
      const decodedData = decodeURIComponent(authData);
      persistAuthSession(JSON.parse(decodedData));

      // Clean up the hash from URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );

      return true; // Indicates OAuth redirect was handled
    }
  } catch (error) {
    console.error('Error handling OAuth redirect:', error);
  }

  return false; // No OAuth redirect handled
}

/**
 * Initialize OAuth handler - call this at the top of every page
 * Returns a promise that resolves when OAuth handling is complete
 */
export function initOAuthHandler() {
  return new Promise(resolve => {
    const handled = handleOAuthRedirect();
    // Small delay to ensure localStorage is written
    if (handled) {
      setTimeout(() => resolve(handled), 50);
    } else {
      resolve(handled);
    }
  });
}
