<?php

/**
 * Landlord Calendar API
 * GET /api/landlord/calendar - Get calendar events (payments, tenancies, maintenance)
 *
 * Query params:
 *   start_date  YYYY-MM-DD  (default: first day of current month)
 *   end_date    YYYY-MM-DD  (default: last day 3 months ahead)
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

$user       = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    $startDate = $_GET['start_date'] ?? date('Y-m-01');
    $endDate   = $_GET['end_date']   ?? date('Y-m-t', strtotime('+2 months'));

    $events = [];

    // ----------------------------------------------------------------
    // 1. Payment events (due dates)
    // ----------------------------------------------------------------
    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.due_date          AS event_date,
            p.amount,
            p.status,
            p.payment_method,
            p.paid_date,
            CONCAT(u.first_name, ' ', u.last_name) AS boarder_name,
            r.title             AS room_name,
            pr.title            AS property_name
        FROM payments p
        INNER JOIN users u  ON p.boarder_id  = u.id
        INNER JOIN rooms r  ON p.room_id     = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.landlord_id = :landlord_id
          AND p.due_date BETWEEN :start_date AND :end_date
          AND p.status IN ('pending', 'overdue', 'paid')
        ORDER BY p.due_date ASC
    ");
    $stmt->execute([
        'landlord_id' => $landlordId,
        'start_date'  => $startDate,
        'end_date'    => $endDate,
    ]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($payments as $payment) {
        if ($payment['status'] === 'overdue') {
            $color = 'red';
            $title = 'Overdue Payment - ' . $payment['boarder_name'];
        } elseif ($payment['status'] === 'paid') {
            $color = 'green';
            $title = 'Payment Received - ' . $payment['boarder_name'];
        } else {
            $color = 'green';
            $title = 'Rent Due - ' . $payment['boarder_name'];
        }

        $events[] = [
            'id'             => 'payment_' . $payment['id'],
            'title'          => $title,
            'date'           => $payment['event_date'],
            'type'           => 'payment',
            'color'          => $color,
            'description'    => 'Monthly rent payment of ₱' . number_format($payment['amount'], 2)
                                . ' for ' . $payment['property_name'] . ' - ' . $payment['room_name'],
            'tenant'         => $payment['boarder_name'],
            'property'       => $payment['property_name'] . ' - ' . $payment['room_name'],
            'amount'         => '₱' . number_format($payment['amount'], 2),
            'status'         => $payment['status'],
            'payment_method' => $payment['payment_method'],
            'paid_date'      => $payment['paid_date'],
        ];
    }

    // ----------------------------------------------------------------
    // 2. Tenancy events (accepted applications = tenancy start)
    // ----------------------------------------------------------------
    $stmt = $pdo->prepare("
        SELECT
            a.id,
            a.created_at        AS event_date,
            a.status,
            CONCAT(u.first_name, ' ', u.last_name) AS boarder_name,
            r.title             AS room_name,
            pr.title            AS property_name
        FROM applications a
        INNER JOIN users u  ON a.boarder_id  = u.id
        INNER JOIN rooms r  ON a.room_id     = r.id
        INNER JOIN properties pr ON r.property_id = pr.id
        WHERE a.landlord_id = :landlord_id
          AND a.status      = 'accepted'
          AND DATE(a.created_at) BETWEEN :start_date AND :end_date
          AND a.deleted_at IS NULL
        ORDER BY a.created_at ASC
    ");
    $stmt->execute([
        'landlord_id' => $landlordId,
        'start_date'  => $startDate,
        'end_date'    => $endDate,
    ]);
    $tenancies = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($tenancies as $tenancy) {
        $events[] = [
            'id'          => 'tenancy_' . $tenancy['id'],
            'title'       => 'Tenancy Start - ' . $tenancy['boarder_name'],
            'date'        => date('Y-m-d', strtotime($tenancy['event_date'])),
            'type'        => 'tenancy',
            'color'       => 'blue',
            'description' => 'Tenancy begins for ' . $tenancy['property_name'] . ' - ' . $tenancy['room_name'],
            'tenant'      => $tenancy['boarder_name'],
            'property'    => $tenancy['property_name'] . ' - ' . $tenancy['room_name'],
            'action'      => 'Application accepted',
        ];
    }

    // Sort all events by date
    usort($events, fn($a, $b) => strtotime($a['date']) - strtotime($b['date']));

    json_response(200, [
        'success'    => true,
        'events'     => $events,
        'start_date' => $startDate,
        'end_date'   => $endDate,
    ]);

} catch (Exception $e) {
    error_log('Calendar events error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to fetch calendar events']);
}
