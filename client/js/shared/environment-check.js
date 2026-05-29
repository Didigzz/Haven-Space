/**
 * Environment Check Utility
 *
 * The frontend and Worker API now run on separate origins during local development,
 * so there is no single "correct" frontend port to enforce.
 */

export function checkEnvironment() {
  return;
}

export function getCorrectUrl() {
  return window.location.href;
}

export function redirectToCorrectServer(autoRedirect = false) {
  void autoRedirect;
  return null;
}
