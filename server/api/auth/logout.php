<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';

header('Content-Type: application/json');

// Clear cookies by setting expiration in the past
setcookie('access_token', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);

setcookie('refresh_token', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);

echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);
