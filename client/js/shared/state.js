/**
 * Simple State Management
 * Stores user authentication state and preferences
 */

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  theme: 'light',
};

// Current state (in-memory)
let currentState = { ...initialState };

/**
 * Get current state
 * @returns {Object} Current state object
 */
export function getState() {
  return { ...currentState };
}

/**
 * Update state
 * @param {Object} newState - Partial state to merge
 */
export function setState(newState) {
  currentState = { ...currentState, ...newState };

  // Persist to localStorage (optional)
  try {
    localStorage.setItem('haven_state', JSON.stringify(currentState));
  } catch (e) {
    console.warn('Failed to persist state to localStorage');
  }

  // Dispatch custom event for state changes
  window.dispatchEvent(new CustomEvent('statechange', { detail: currentState }));
}

/**
 * Load state from localStorage
 */
export function loadState() {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      currentState = {
        ...initialState,
        isAuthenticated: true,
        user: JSON.parse(user),
        token: token,
      };
    } else {
      currentState = { ...initialState };
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
    currentState = { ...initialState };
  }
  return currentState;
}

/**
 * Clear state (logout)
 */
export function clearState() {
  currentState = { ...initialState };
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('haven_state');
  } catch (e) {
    console.warn('Failed to clear state from localStorage', e);
  }
  window.dispatchEvent(new CustomEvent('statechange', { detail: currentState }));
}

/**
 * Create headers for authenticated API requests
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} Headers object with Authorization token if available
 */
export function getAuthHeaders(additionalHeaders = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make an authenticated API request
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  const headers = getAuthHeaders(options.headers);

  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
}

// Load state on module init
loadState();
