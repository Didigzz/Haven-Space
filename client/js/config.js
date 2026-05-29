// Haven Space Configuration
// Automatically detects environment and sets appropriate API endpoints

/**
 * Detect current environment based on hostname and URL patterns
 */
function detectEnvironment() {
  const hostname = window.location.hostname;

  // Production environments
  const productionHosts = [
    'github.io', // GitHub Pages
  ];

  if (
    productionHosts.some(host => hostname.includes(host)) ||
    hostname.includes('render') ||
    hostname.includes('github.io')
  ) {
    return 'production';
  }

  // Local development (XAMPP, Apache)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check if running via PHP built-in server (:8000) or Apache
    const port = window.location.port;

    // PHP built-in server on port 8000
    if (port === '8000') {
      return 'local-dev';
    }

    // Apache/XAMPP - typically on port 80 or no port specified
    // or paths containing haven-space, htdocs, views
    return 'local-apache';
  }

  // Default to local development for unknown hosts
  return 'local-dev';
}

/**
 * Get API base URL based on detected environment and environment variables
 */
function getApiBaseUrl() {
  // Check for VITE_API_BASE_URL environment variable first (Vite/Bun)
  const viteApiUrl = import.meta.env?.VITE_API_BASE_URL;

  if (viteApiUrl && viteApiUrl.trim() !== '') {
    return viteApiUrl.trim();
  }

  const env = detectEnvironment();

  const apiUrls = {
    production: 'https://haven-space.github.io/haven-space', // Default production domain placeholder
    'local-dev': 'http://localhost:8000', // PHP built-in server
    'local-apache': 'http://localhost:8000', // Apache/XAMPP - still use port 8000 for API
  };

  return apiUrls[env] || 'http://localhost:8000';
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
