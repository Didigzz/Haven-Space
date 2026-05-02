<?php

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/SMTP.php';
require_once __DIR__ . '/../../vendor/phpmailer/phpmailer/src/Exception.php';

$emailConfig = require __DIR__ . '/../../config/email.php';

header('Content-Type: application/json');

use App\Core\Database\Connection;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['email']) || empty(trim($input['email']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Email is required']);
        exit;
    }

    $email = trim($input['email']);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        exit;
    }

    $pdo = Connection::getInstance()->getPdo();

    // Check if user exists
    $stmt = $pdo->prepare('SELECT id, google_id, password_hash FROM users WHERE email = ? AND deleted_at IS NULL');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode([
            'error'      => 'No account found with this email address. Please check your email or sign up.',
            'error_code' => 'EMAIL_NOT_FOUND',
        ]);
        exit;
    }

    // Generate a 6-digit reset code
    $resetCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = time() + (15 * 60); // 15 minutes from now

    // Check if there's an existing reset request for this user
    $existingStmt = $pdo->prepare('SELECT id FROM password_reset_requests WHERE user_id = ? AND expires_at > ? AND is_used = FALSE');
    $existingStmt->execute([$user['id'], time()]);
    $existing = $existingStmt->fetch();

    if ($existing) {
        // Update existing request
        $updateStmt = $pdo->prepare('UPDATE password_reset_requests SET reset_code = ?, expires_at = ?, attempts = 0, created_at = ? WHERE id = ?');
        $updateStmt->execute([$resetCode, $expiresAt, time(), $existing['id']]);
    } else {
        // Create new reset request
        $insertStmt = $pdo->prepare('INSERT INTO password_reset_requests (user_id, email, reset_code, expires_at, attempts, is_used, created_at) VALUES (?, ?, ?, ?, 0, FALSE, ?)');
        $insertStmt->execute([$user['id'], $email, $resetCode, $expiresAt, time()]);
    }

    // Send email with reset code using PHPMailer
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = $emailConfig['smtp']['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $emailConfig['smtp']['username'];
        $mail->Password   = $emailConfig['smtp']['password'];
        $mail->SMTPSecure = $emailConfig['smtp']['secure'] === 'ssl' ? PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS : PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $emailConfig['smtp']['port'];

        // Recipients
        $mail->setFrom($emailConfig['from']['email'], $emailConfig['from']['name']);
        $mail->addAddress($email);

        // Content
        $mail->isHTML(true);
        $mail->Subject = "Password Reset Code";

        $mail->Body = "
            <p>Hello,</p>
            <p>This is your password reset code: <b>{$resetCode}</b></p>
            <p>This code will expire in 15 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        ";

        $mail->AltBody = "Hello, Use the code below to reset your password";

        $mail->send();

        // Check if this is a Google OAuth user
        $isGoogleUser = !empty($user['google_id']) && empty($user['password_hash']);

        if ($isGoogleUser) {
            echo json_encode([
                'message' => 'Password setup instructions sent to your email',
                'is_google_user' => true,
                'action' => 'password_setup'
            ]);
        } else {
            echo json_encode([
                'message' => 'Reset code has been sent to your email'
            ]);
        }
    } catch (PHPMailer\PHPMailer\Exception $e) {
        error_log('Mailer Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to send reset code. Please try again later.']);
    }

} catch (Exception $e) {
    error_log('Forgot password error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
