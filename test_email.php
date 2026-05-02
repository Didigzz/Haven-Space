<?php

/**
 * Test Script for Email Functionality
 * This script tests the email sending functionality using PHPMailer
 */

require_once __DIR__ . '/functions/vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/functions/vendor/phpmailer/phpmailer/src/SMTP.php';
require_once __DIR__ . '/functions/vendor/phpmailer/phpmailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$emailConfig = require __DIR__ . '/functions/config/email.php';

$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host       = $emailConfig['smtp']['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $emailConfig['smtp']['username'];
    $mail->Password   = $emailConfig['smtp']['password'];
    $mail->SMTPSecure = $emailConfig['smtp']['secure'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = $emailConfig['smtp']['port'];

    // Recipients
    $mail->setFrom($emailConfig['from']['email'], $emailConfig['from']['name']);
    $mail->addAddress('floresaybaez574@gmail.com', 'Test Recipient');

    // Content
    $mail->isHTML(true);
    $mail->Subject = "Test Email from Haven Space";

    $mail->Body = "
        <p>Hello,</p>
        <p>This is a test email to verify that the email functionality is working correctly.</p>
        <p>If you receive this email, the setup is successful!</p>
    ";

    $mail->AltBody = "Hello, This is a test email to verify that the email functionality is working correctly.";

    $mail->send();
    echo 'Test email has been sent successfully!';
} catch (Exception $e) {
    echo 'Mailer Error: ' . $mail->ErrorInfo;
}
