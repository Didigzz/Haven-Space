const DEFAULT_WORKER_API_URL = 'https://haven-space-api.floresaybaez574.workers.dev';
const LOCAL_WORKER_API_URL = 'http://localhost:8000';

function detectEnvironment(): 'local' | 'production' {
  if (typeof window === 'undefined') return 'production';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'local';
  return 'production';
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = new URLSearchParams(window.location.search).get('apiBaseUrl');
    if (override && override.trim() !== '') {
      localStorage.setItem('havenSpaceApiBaseUrl', override.trim());
      return override.trim();
    }
    const stored = localStorage.getItem('havenSpaceApiBaseUrl');
    if (stored && stored.trim() !== '') return stored.trim();
  }
  return detectEnvironment() === 'local' ? LOCAL_WORKER_API_URL : DEFAULT_WORKER_API_URL;
}
