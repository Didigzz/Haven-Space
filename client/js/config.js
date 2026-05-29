// Haven Space Configuration
// Automatically detects environment and sets appropriate Worker API endpoints

const DEFAULT_WORKER_API_URL = 'https://haven-space-api.floresaybaez574.workers.dev';
const LOCAL_WORKER_API_URL = 'http://localhost:8787';

/**
 * Detect current environment based on hostname and URL patterns
 */
function detectEnvironment() {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  }

  return 'production';
}

/**
 * Get API base URL based on detected environment and environment variables
 */
function getApiBaseUrl() {
  const urlOverride = new URLSearchParams(window.location.search).get('apiBaseUrl');

  if (urlOverride && urlOverride.trim() !== '') {
    localStorage.setItem('havenSpaceApiBaseUrl', urlOverride.trim());
    return urlOverride.trim();
  }

  const storedOverride = localStorage.getItem('havenSpaceApiBaseUrl');

  if (storedOverride && storedOverride.trim() !== '') {
    return storedOverride.trim();
  }

  const globalOverride = window.HAVEN_SPACE_API_BASE_URL;

  if (globalOverride && String(globalOverride).trim() !== '') {
    return String(globalOverride).trim();
  }

  const env = detectEnvironment();

  const apiUrls = {
    production: DEFAULT_WORKER_API_URL,
    local: LOCAL_WORKER_API_URL,
  };

  return apiUrls[env] || LOCAL_WORKER_API_URL;
}

/**
 * Get current environment name for debugging
 */
function getCurrentEnvironment() {
  return detectEnvironment();
}

const CONFIG = {
  // Backend API URL - automatically determined based on environment
  API_BASE_URL: getApiBaseUrl(),

  // Current environment (local, production, etc.)
  ENV: getCurrentEnvironment(),

  // Environment detection helper
  isProduction: () => detectEnvironment() === 'production',
  isLocal: () => detectEnvironment().startsWith('local'),
};

// Environment info available via CONFIG.ENV

export default CONFIG;
