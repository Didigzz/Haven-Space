/**
 * Runtime route helpers for the static frontend.
 *
 * Cloudflare Pages serves the built output from dist/ at the site root. The
 * source /views/ layout is still supported only as a local fallback.
 */

export function isSourceViewsRuntime(pathname = window.location.pathname) {
  return pathname.includes('/views/');
}

export function getViewBasePath(pathname = window.location.pathname) {
  if (!isSourceViewsRuntime(pathname)) {
    return '/';
  }

  const viewsIndex = pathname.indexOf('/views/');
  return pathname.substring(0, viewsIndex + '/views/'.length);
}

export function viewPath(path) {
  const cleanPath = path.replace(/^\/+/, '');
  const basePath = getViewBasePath();

  if (basePath !== '/') {
    return `${basePath}${cleanPath}`;
  }

  const builtPath = cleanPath.startsWith('public/') ? cleanPath.slice('public/'.length) : cleanPath;
  return `/${builtPath}`;
}

export function getLoginPath() {
  return viewPath('public/auth/login.html');
}

export function getHomePath() {
  return viewPath('public/index.html');
}
