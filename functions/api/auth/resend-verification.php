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

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

$email = $data['email'] ?? '';

if (empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

$pdo = Connection::getInstance()->getPdo();

try {
    // Find user with email
    $stmt = $pdo->prepare('
        SELECT id, email_verified, first_name, last_name
        FROM users
        WHERE email = ? AND deleted_at IS NULL
    ');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Don't reveal if email exists or not for security
        echo json_encode([
            'success' => true,
            'message' => 'If an account with this email exists, a verification email has been sent.'
        ]);
        exit;
    }

    if ($user['email_verified']) {
        echo json_encode([
            'success' => true,
            'message' => 'Email is already verified.',
            'alreadyVerified' => true
        ]);
        exit;
    }

    // Generate new verification token
    $emailVerificationToken = bin2hex(random_bytes(32));
    $emailVerificationExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));

    // Update user with new token
    $stmt = $pdo->prepare('
        UPDATE users
        SET email_verification_token = ?,
            email_verification_expires = ?,
            updated_at = NOW()
        WHERE id = ?
    ');
    $stmt->execute([$emailVerificationToken, $emailVerificationExpires, $user['id']]);

    // Send email verification email using PHPMailer
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
        $mail->Subject = "Verify Your Email Address";
        $verificationLink = "http://localhost/verify-email?token={$emailVerificationToken}";

        $mail->Body = "
            <p>Hello,</p>
            <p>Please click the following link to verify your email address:</p>
            <p><a href='{$verificationLink}'>{$verificationLink}</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not request this, please ignore this email.</p>
        ";

        $mail->AltBody = "Hello, Please click the following link to verify your email address: {$verificationLink}";

        $mail->send();
        error_log("Email verification email sent to {$email}");

        echo json_encode([
            'success' => true,
            'message' => 'Verification email sent successfully. Please check your inbox.'
        ]);
    } catch (PHPMailer\PHPMailer\Exception $e) {
        error_log('Mailer Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to send verification email. Please try again.']);
    }

} catch (\PDOException $e) {
    error_log('Resend verification error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send verification email. Please try again.']);
}
