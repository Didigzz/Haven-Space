/**
 * Authentication header utilities
 * Provides consistent authentication headers for API requests
 */

/**
 * Get authentication headers for API requests
 * Uses JWT token if available, falls back to X-User-ID for development
 * @param {string} fallbackUserId - Fallback user ID for development/testing
 * @returns {Object} Headers object with authentication
 */
export function getAuthHeaders(fallbackUserId = null) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    // Validate token before using it
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // Check if token is expired
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          console.warn('Token expired, falling back to X-User-ID when available');
          const userId = localStorage.getItem('user_id') || fallbackUserId;
          if (userId) headers['X-User-ID'] = userId;
        } else {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } else {
        console.warn('Invalid token format, falling back to X-User-ID when available');
        const userId = localStorage.getItem('user_id') || fallbackUserId;
        if (userId) headers['X-User-ID'] = userId;
      }
    } catch (error) {
      console.warn('Error parsing token, falling back to X-User-ID when available:', error);
      const userId = localStorage.getItem('user_id') || fallbackUserId;
      if (userId) headers['X-User-ID'] = userId;
    }
  } else {
    // Fallback to X-User-ID for development/testing when a user ID is present.
    const userId = localStorage.getItem('user_id') || fallbackUserId;
    if (userId) headers['X-User-ID'] = userId;
  }

  return headers;
}

/**
 * Get authentication headers for fetch requests (without Content-Type)
 * @param {string} fallbackUserId - Fallback user ID for development/testing
 * @returns {Object} Headers object with authentication only
 */
export function getAuthHeadersOnly(fallbackUserId = null) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) {
    // Validate token before using it
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // Check if token is expired
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          console.warn('Token expired, falling back to X-User-ID when available');
          const userId = localStorage.getItem('user_id') || fallbackUserId;
          if (userId) headers['X-User-ID'] = userId;
        } else {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } else {
        console.warn('Invalid token format, falling back to X-User-ID when available');
        const userId = localStorage.getItem('user_id') || fallbackUserId;
        if (userId) headers['X-User-ID'] = userId;
      }
    } catch (error) {
      console.warn('Error parsing token, falling back to X-User-ID when available:', error);
      const userId = localStorage.getItem('user_id') || fallbackUserId;
      if (userId) headers['X-User-ID'] = userId;
    }
  } else {
    // Fallback to X-User-ID for development/testing when a user ID is present.
    const userId = localStorage.getItem('user_id') || fallbackUserId;
    if (userId) headers['X-User-ID'] = userId;
  }

  return headers;
}
