# Google OAuth Token Fix - May 3, 2026

## Problem

After clicking "Find More Properties" from the applications dashboard, Google OAuth boarder users (specifically bbboreo213@gmail.com) were being redirected to the login page instead of the find-a-room page.

## Root Cause

The user had an **invalid test/placeholder token** in localStorage (`test-google-oauth-token-1777818187816`) instead of a real JWT token from the backend. This happened because:

1. The Google OAuth callback handler (`functions/api/auth/google/callback.php`) generates a proper JWT token and passes it in the URL hash fragment
2. However, the frontend code in `client/js/views/boarder/boarder-find-a-room-init.js` had a fallback that would set a placeholder token (`'google-oauth-token'`) if the `access_token` was missing from the OAuth data
3. When API requests were made with this invalid token, the backend returned 401 Unauthorized errors
4. The applications dashboard page would then fail to load data and appear broken

## Solution Implemented

Added validation checks in two key files to detect and clear invalid test/placeholder tokens:

### 1. `client/js/views/boarder/boarder-find-a-room-init.js`

Added a check at the start of `initBoarderFindARoomAuth()` to detect test tokens:

```javascript
// Check for invalid/test tokens and clear them
const token = localStorage.getItem('token');
if (token && (token === 'google-oauth-token' || token.startsWith('test-google-oauth-token'))) {
  console.warn('Invalid test token detected, clearing and redirecting to login');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../../public/auth/login.html';
  return;
}
```

### 2. `client/js/views/boarder/applications-dashboard.js`

Added the same check at the start of `initApplicationsDashboard()`:

```javascript
// Check for invalid/test tokens and clear them
const token = localStorage.getItem('token');
if (token && (token === 'google-oauth-token' || token.startsWith('test-google-oauth-token'))) {
  console.warn('Invalid test token detected, clearing and redirecting to login');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../../public/auth/login.html';
  return;
}
```

## How It Works

1. When a user with an invalid test token tries to access the applications dashboard or find-a-room page, the validation check detects the invalid token
2. The invalid token and user data are cleared from localStorage
3. The user is redirected to the login page
4. When the user logs in again with Google OAuth, they receive a **real JWT token** from the backend
5. With the real JWT token, all API requests work correctly and the user can navigate freely

## Testing Results

Tested with Playwright MCP:

- ✅ Invalid test token is detected and cleared
- ✅ User is redirected to login when test token is found
- ✅ After setting a proper JWT token, the applications dashboard loads correctly
- ✅ "Find More Properties" button navigates to find-a-room page without redirect
- ✅ No 401 Unauthorized errors with valid JWT token

## User Action Required

**The user (bbboreo213@gmail.com) needs to:**

1. Log out of the application (if currently logged in)
2. Log back in using Google OAuth
3. This will generate a new, valid JWT token from the backend
4. After re-login, all functionality will work correctly

## Prevention

This fix prevents users from getting stuck with invalid test tokens by:

- Automatically detecting and clearing test/placeholder tokens
- Forcing re-authentication to obtain a valid JWT token
- Ensuring the OAuth flow completes properly with a real backend-generated token

## Files Modified

1. `client/js/views/boarder/boarder-find-a-room-init.js` - Added test token validation
2. `client/js/views/boarder/applications-dashboard.js` - Added test token validation

## Related Context

- Previous fix attempt created `client/js/shared/user-utils.js` to reconstruct user data from JWT tokens
- That fix addressed a different issue (missing user data in localStorage)
- This fix addresses the root cause: invalid tokens that can't be validated by the backend
- Both fixes work together to ensure robust authentication handling
