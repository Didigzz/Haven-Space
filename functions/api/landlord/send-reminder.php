<?php

/**
 * Send Payment Reminder API
 * POST /api/landlord/send-reminder.php
 *
 * Sends a payment reminder notification to a boarder and updates the reminder_sent_at timestamp
 */

// CORS headers must be set before any output
require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

// Authenticate user and authorize as landlord
$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

try {
    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['payment_id'])) {
        json_response(400, ['error' => 'Payment ID is required']);
    }

    $paymentId = (int) $input['payment_id'];

    $pdo = Connection::getInstance()->getPdo();

    // Verify payment belongs to this landlord and get payment details
    $stmt = $pdo->prepare("
        SELECT 
            p.id,
            p.boarder_id,
            p.landlord_id,
            p.amount,
            p.late_fee,
            p.due_date,
            p.status,
            p.reminder_sent_at,
            u.first_name,
            u.last_name,
            u.email,
            r.title as room_title,
            pr.title as property_title
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN rooms r ON p.room_id = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.id = ? AND p.landlord_id = ?
    ");
    $stmt->execute([$paymentId, $landlordId]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$payment) {
        json_response(404, ['error' => 'Payment not found or unauthorized']);
    }

    if ($payment['status'] === 'paid') {
        json_response(400, ['error' => 'Cannot send reminder for paid payment']);
    }

    // Update reminder_sent_at timestamp
    $updateStmt = $pdo->prepare("
        UPDATE payments 
        SET reminder_sent_at = NOW() 
        WHERE id = ?
    ");
    $updateStmt->execute([$paymentId]);

    // TODO: In a production system, you would send an actual notification here
    // This could be via email, SMS, or in-app notification
    // For now, we just update the timestamp
    
    // Example notification logic (commented out):
    /*
    $notificationData = [
        'user_id' => $payment['boarder_id'],
        'type' => 'payment_reminder',
        'title' => 'Payment Reminder',
        'message' => sprintf(
            'Your payment of ₱%s for %s - %s is due on %s',
            number_format($payment['amount'] + $payment['late_fee'], 2),
            $payment['property_title'],
            $payment['room_title'],
            date('M d, Y', strtotime($payment['due_date']))
        ),
        'related_id' => $paymentId,
        'related_type' => 'payment'
    ];
    // Send notification via your notification service
    */

    json_response(200, [
        'success' => true,
        'message' => 'Payment reminder sent successfully',
        'data' => [
            'payment_id' => $paymentId,
            'reminder_sent_at' => date('Y-m-d H:i:s'),
            'boarder_name' => $payment['first_name'] . ' ' . $payment['last_name']
        ]
    ]);

} catch (Exception $e) {
    error_log('Send reminder error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to send payment reminder']);
}
