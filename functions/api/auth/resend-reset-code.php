<?php

/**
 * Resend Reset Code
 * Handles resending password reset codes
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/SMTP.php';
require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/Exception.php';

$emailConfig = require __DIR__ . '/../../config/email.php';

use App\Core\Database\Connection;

// Get input data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['email'])) {
    json_response(400, ['error' => 'Email is required']);
    exit;
}

$email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, ['error' => 'Invalid email format']);
    exit;
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Check if the user exists
    $userStmt = $pdo->prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
    $userStmt->execute([$email]);
    $user = $userStmt->fetch();

    if (!$user) {
        // Don't reveal whether email exists for security
        json_response(200, ['message' => 'If this email exists, a reset code has been sent']);
        exit;
    }

    // Generate a new reset code
    $resetCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = time() + (15 * 60); // 15 minutes from now

    // Check for an existing active (unused, non-expired) reset request
    $existingStmt = $pdo->prepare(
        'SELECT id FROM password_reset_requests
         WHERE user_id = ? AND is_used = FALSE AND expires_at > ?
         LIMIT 1'
    );
    $existingStmt->execute([$user['id'], time()]);
    $existing = $existingStmt->fetch();

    if ($existing) {
        // Update existing request with a new code
        $updateStmt = $pdo->prepare(
            'UPDATE password_reset_requests
             SET reset_code = ?, expires_at = ?, attempts = 0
             WHERE id = ?'
        );
        $updateStmt->execute([$resetCode, $expiresAt, $existing['id']]);
        $requestId = $existing['id'];
    } else {
        // Create a new reset request
        $insertStmt = $pdo->prepare(
            'INSERT INTO password_reset_requests
             (user_id, email, reset_code, expires_at, attempts, is_used, created_at)
             VALUES (?, ?, ?, ?, 0, FALSE, ?)'
        );
        $insertStmt->execute([$user['id'], $email, $resetCode, $expiresAt, time()]);
        $requestId = $pdo->lastInsertId();
    }

    // Send email with new reset code using PHPMailer
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = $emailConfig['smtp']['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $emailConfig['smtp']['username'];
        $mail->Password   = $emailConfig['smtp']['password'];
        $mail->SMTPSecure = $emailConfig['smtp']['secure'] === 'ssl'
            ? PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $emailConfig['smtp']['port'];

        $mail->setFrom($emailConfig['from']['email'], $emailConfig['from']['name']);
        $mail->addAddress($email);

        $mail->isHTML(true);
        $mail->Subject = 'Password Reset Code';
        $mail->Body    = "
            <p>Hello,</p>
            <p>This is your password reset code: <b>{$resetCode}</b></p>
            <p>This code will expire in 15 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        ";
        $mail->AltBody = "Hello, your password reset code is: {$resetCode}";

        $mail->send();

        json_response(200, [
            'message' => 'A new reset code has been sent to your email',
            'request_id' => $requestId
        ]);
    } catch (PHPMailer\PHPMailer\Exception $e) {
        error_log('Mailer error in resend-reset-code: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to send reset code. Please try again later.']);
    }

} catch (Exception $e) {
    error_log('Resend reset code error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to resend reset code']);
}
