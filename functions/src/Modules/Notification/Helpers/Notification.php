<?php

namespace App\Modules\Notification\Helpers;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

/**
 * Notification Helper
 * Simple notification system for logging and triggering notifications
 * Can be extended for email, push, and SMS notifications
 */
class Notification
{
    /**
     * Send a notification (currently logs, can be extended for email/push)
     *
     * @param int $userId The user to notify
     * @param string $type Notification type (status_change, comment, new_request, etc.)
     * @param string $title Notification title
     * @param string $message Notification message
     * @param array $metadata Additional metadata
     * @param string|null $email Recipient email address
     * @param bool $sendEmail Whether to send email notification
     */
    public static function send(int $userId, string $type, string $title, string $message, array $metadata = [], ?string $email = null, bool $sendEmail = false): void
    {
        // Log the notification
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'metadata' => $metadata,
        ];

        error_log('[NOTIFICATION] ' . json_encode($logEntry));

        // Send email notification if requested
        if ($sendEmail && $email) {
            self::sendEmailNotification($email, $title, $message);
        }

        // TODO: Integrate with database notification table
        // TODO: Integrate with push notification service (Firebase, etc.)
        // TODO: Integrate with SMS service (Twilio, etc.)
    }

    /**
     * Send email notification using PHPMailer
     *
     * @param string $email Recipient email address
     * @param string $title Email subject
     * @param string $message Email message
     */
    private static function sendEmailNotification(string $email, string $title, string $message): void
    {
        $emailConfig = require __DIR__ . '/../../../../config/email.php';

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
            $mail->addAddress($email);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $title;

            $mail->Body = "
                <p>Hello,</p>
                <p>{$message}</p>
            ";

            $mail->AltBody = "Hello, {$message}";

            $mail->send();
            error_log("Email notification sent to {$email}");
        } catch (Exception $e) {
            error_log('Mailer Error: ' . $e->getMessage());
        }
    }

    /**
     * Notify boarder when maintenance request status changes
     */
    public static function notifyBoarderStatusChange(int $boarderId, int $requestId, string $oldStatus, string $newStatus, string $requestTitle): void
    {
        $title = 'Maintenance Request Status Updated';
        $message = "Your maintenance request \"$requestTitle\" status has been changed from \"$oldStatus\" to \"$newStatus\".";

        self::send(
            $boarderId,
            'maintenance_status_change',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ]
        );
    }

    /**
     * Notify landlord when a new maintenance request is submitted
     */
    public static function notifyLandlordNewRequest(int $landlordId, int $requestId, string $requestTitle, string $boarderName): void
    {
        $title = 'New Maintenance Request';
        $message = "$boarderName submitted a new maintenance request: \"$requestTitle\".";

        self::send(
            $landlordId,
            'maintenance_new_request',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'request_title' => $requestTitle,
                'boarder_name' => $boarderName,
            ]
        );
    }

    /**
     * Notify user when a comment is added to a maintenance request
     */
    public static function notifyComment(int $recipientId, int $requestId, string $commentAuthor, string $requestTitle, string $userType): void
    {
        $title = 'New Comment on Maintenance Request';
        $message = "$commentAuthor added a comment to \"$requestTitle\".";

        self::send(
            $recipientId,
            'maintenance_comment',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'request_title' => $requestTitle,
                'comment_author' => $commentAuthor,
                'user_type' => $userType,
            ]
        );
    }

    /**
     * Notify boarder when their request is assigned to a contractor
     */
    public static function notifyContractorAssigned(int $boarderId, int $requestId, int $contractorId, string $requestTitle): void
    {
        $title = 'Contractor Assigned to Your Request';
        $message = "A contractor has been assigned to your maintenance request: \"$requestTitle\".";

        self::send(
            $boarderId,
            'maintenance_contractor_assigned',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'contractor_id' => $contractorId,
            ]
        );
    }

    /**
     * Notify landlord when an urgent request is submitted
     */
    public static function notifyUrgentRequest(int $landlordId, int $requestId, string $requestTitle, string $boarderName): void
    {
        $title = 'URGENT: Maintenance Request Requires Immediate Attention';
        $message = "$boarderName submitted an urgent maintenance request: \"$requestTitle\". Please review as soon as possible.";

        self::send(
            $landlordId,
            'maintenance_urgent_request',
            $title,
            $message,
            [
                'request_id' => $requestId,
                'request_title' => $requestTitle,
                'boarder_name' => $boarderName,
            ]
        );
    }
}
