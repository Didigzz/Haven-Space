<?php

/**
 * Reset Password
 * Handles resetting user passwords after code verification
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';

use App\Core\Database\Connection;

// Get input data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['email']) || empty($data['request_id']) || empty($data['new_password'])) {
    json_response(400, ['error' => 'Email, request ID, and new password are required']);
    exit;
}

$email       = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
$requestId   = (int) $data['request_id'];
$newPassword = $data['new_password'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, ['error' => 'Invalid email format']);
    exit;
}

if (strlen($newPassword) < 8) {
    json_response(400, ['error' => 'Password must be at least 8 characters long']);
    exit;
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Find the reset request
    $stmt = $pdo->prepare(
        'SELECT id, user_id, expires_at
         FROM password_reset_requests
         WHERE id = ? AND email = ? AND is_used = FALSE
         LIMIT 1'
    );
    $stmt->execute([$requestId, $email]);
    $request = $stmt->fetch();

    if (!$request) {
        json_response(404, ['error' => 'Invalid or expired reset request']);
        exit;
    }

    // Check if request has expired
    if ($request['expires_at'] < time()) {
        json_response(400, ['error' => 'Reset request has expired']);
        exit;
    }

    $userId = $request['user_id'];

    // Hash the new password and update the user record
    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
    $updateUserStmt = $pdo->prepare(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL'
    );
    $updateUserStmt->execute([$newHash, $userId]);

    if ($updateUserStmt->rowCount() === 0) {
        json_response(404, ['error' => 'User not found']);
        exit;
    }

    // Mark the reset request as used
    $markUsedStmt = $pdo->prepare(
        'UPDATE password_reset_requests SET is_used = TRUE, used_at = ? WHERE id = ?'
    );
    $markUsedStmt->execute([time(), $request['id']]);

    json_response(200, [
        'message' => 'Password has been reset successfully'
    ]);

} catch (Exception $e) {
    error_log('Reset password error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to reset password']);
}
