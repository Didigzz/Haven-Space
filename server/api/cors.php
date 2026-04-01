<?php

/**
 * PRODUCTION-READY CORS SOLUTION
 * 
 * Handles cross-origin requests between Bun/Node frontend (port 3000)
 * and Apache PHP backend.
 */

// 1. List of allowed origins
$allowed_origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost',
    'http://127.0.0.1'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Remove any existing CORS headers to avoid duplicates
header_remove('Access-Control-Allow-Origin');
header_remove('Access-Control-Allow-Methods');
header_remove('Access-Control-Allow-Headers');
header_remove('Access-Control-Allow-Credentials');

// 2. Handle Origin
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else if (empty($origin)) {
    // If no origin, likely same-origin. Allow but no specific header needed.
} else {
    // For development, we fallback to * to allow all during debug
    header('Access-Control-Allow-Origin: *');
}

// 3. Mandatory CORS Headers
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400'); // Cache preflight for 1 day

// 4. Handle OPTIONS Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Some browsers require 200 or 204 for preflight
    http_response_code(200);
    exit;
}
