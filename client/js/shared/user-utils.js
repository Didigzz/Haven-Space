/**
 * User Utilities
 * Provides helper functions for managing user data across the application
 */

/**
 * Get user data from localStorage with fallback to JWT token
 * This ensures user data is always available even if localStorage was cleared
 *
 * @returns {Object|null} User object or null if not authenticated
 */
export function getUser() {
  // Try to get user from localStorage first
  let user = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      user = JSON.parse(userStr);
      if (user && user.id) {
        return user;
      }
    }
  } catch (e) {
    console.error('Failed to parse user from localStorage:', e);
  }

  // If no user in localStorage, try to reconstruct from JWT token
  const token = localStorage.getItem('token');
  if (token && token !== 'google-oauth-token') {
    try {
      // Decode JWT to get user data
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.user_id) {
          // Reconstruct user object from JWT payload
          user = {
            id: payload.user_id,
            first_name: payload.first_name || '',
            last_name: payload.last_name || '',
            name:
              `${payload.first_name || ''} ${payload.last_name || ''}`.trim() ||
              payload.email ||
              'User',
            email: payload.email || '',
            role: payload.role || 'boarder',
            boarder_status: payload.boarder_status || 'new',
            boarderStatus: payload.boarder_status || 'new',
            is_verified: payload.is_verified || false,
            account_status: payload.account_status || 'active',
          };

          // Store reconstructed user data in localStorage for future use
          localStorage.setItem('user', JSON.stringify(user));
          return user;
        }
      }
    } catch (e) {
      console.error('Failed to decode JWT token:', e);
    }
  }

  return null;
}

/**
 * Check if user is authenticated
 *
 * @returns {boolean} True if user is authenticated, false otherwise
 */
export function isAuthenticated() {
  const user = getUser();
  const token = localStorage.getItem('token');
  return !!(user && user.id && token);
}

/**
 * Get user ID
 *
 * @returns {number|null} User ID or null if not authenticated
 */
export function getUserId() {
  const user = getUser();
  return user ? user.id : null;
}

/**
 * Get user role
 *
 * @returns {string|null} User role or null if not authenticated
 */
export function getUserRole() {
  const user = getUser();
  return user ? user.role : null;
}

/**
 * Update user data in localStorage
 *
 * @param {Object} updates - Partial user object with fields to update
 */
export function updateUser(updates) {
  const user = getUser();
  if (user) {
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    // Dispatch event for other components to update
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
  }
}

/**
 * Clear user data (logout)
 */
export function clearUser() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('haven_state');
  localStorage.removeItem('boarder_acceptance_status');
}
