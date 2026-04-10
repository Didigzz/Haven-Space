<?php
/**
 * Backward compatibility redirect for old Google OAuth redirect_uri
 * 
 * Old redirect_uri: /api/auth/google/callback.php
 * New redirect_uri: /auth/google/callback.php
 * 
 * This file redirects to the actual callback handler.
 */

// Get the query string and forward to the real callback
$queryString = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
header('Location: /auth/google/callback.php?' . $queryString, true, 301);
exit;
