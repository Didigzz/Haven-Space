<?php

/**
 * Verify Reset Code
 * Handles verification of password reset codes
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';

use App\Core\Database\Connection;

// Get input data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['email']) || empty($data['code'])) {
    json_response(400, ['error' => 'Email and code are required']);
    exit;
}

$email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
$code = trim($data['code']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, ['error' => 'Invalid email format']);
    exit;
}

if (!preg_match('/^\d{6}$/', $code)) {
    json_response(400, ['error' => 'Invalid code format']);
    exit;
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Find the reset request
    $stmt = $pdo->prepare(
        'SELECT id, user_id, expires_at, attempts
         FROM password_reset_requests
         WHERE email = ? AND reset_code = ? AND is_used = FALSE
         LIMIT 1'
    );
    $stmt->execute([$email, $code]);
    $request = $stmt->fetch();

    if (!$request) {
        json_response(404, ['error' => 'Invalid or expired reset code']);
        exit;
    }

    // Check if code has expired
    if ($request['expires_at'] < time()) {
        json_response(400, ['error' => 'Reset code has expired']);
        exit;
    }

    // Check attempts
    if ($request['attempts'] >= 5) {
        json_response(400, ['error' => 'Too many attempts. Please request a new code']);
        exit;
    }

    // Increment attempts
    $updateStmt = $pdo->prepare(
        'UPDATE password_reset_requests SET attempts = attempts + 1 WHERE id = ?'
    );
    $updateStmt->execute([$request['id']]);

    json_response(200, [
        'message' => 'Reset code verified successfully',
        'valid' => true,
        'user_id' => $request['user_id'],
        'request_id' => $request['id']
    ]);

} catch (Exception $e) {
    error_log('Verify reset code error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to verify reset code']);
}
