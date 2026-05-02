<?php
/**
 * Boarder Payment Submission API
 * POST /api/payments/submit - Boarder submits payment details for the active bill
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

try {
    $user = Middleware::authorize(['boarder']);
    $boarderId = (int) $user['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        json_response(400, ['error' => 'Invalid JSON body']);
    }

    $referenceNumber = trim((string) ($input['reference_number'] ?? ''));
    $paymentMethod = trim((string) ($input['payment_method'] ?? 'gcash'));
    $paidDate = trim((string) ($input['paid_date'] ?? date('Y-m-d')));
    $reportedAmount = isset($input['amount']) ? (float) $input['amount'] : 0.0;
    $paymentId = isset($input['payment_id']) && $input['payment_id'] !== null ? (int) $input['payment_id'] : null;

    if ($referenceNumber === '' || strlen($referenceNumber) < 6) {
        json_response(400, ['error' => 'Reference number must be at least 6 characters']);
    }

    if ($reportedAmount <= 0) {
        json_response(400, ['error' => 'Payment amount must be greater than 0']);
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $paidDate) || strtotime($paidDate) === false) {
        json_response(400, ['error' => 'Invalid payment date']);
    }

    $allowedMethods = ['gcash', 'bank', 'card', 'cash', 'other'];
    if (!in_array($paymentMethod, $allowedMethods, true)) {
        $paymentMethod = 'other';
    }

    $pdo = Connection::getInstance()->getPdo();
    $pdo->beginTransaction();

    if ($paymentId) {
        $stmt = $pdo->prepare("SELECT * FROM payments WHERE id = ? AND boarder_id = ? FOR UPDATE");
        $stmt->execute([$paymentId, $boarderId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT *
            FROM payments
            WHERE boarder_id = ? AND status IN ('pending', 'overdue')
            ORDER BY due_date ASC
            LIMIT 1
            FOR UPDATE
        ");
        $stmt->execute([$boarderId]);
    }

    $payment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$payment) {
        // Create the current bill if the accepted boarder has no pending payment yet.
        $appStmt = $pdo->prepare("
            SELECT
                a.boarder_id,
                r.id AS room_id,
                r.price,
                p.id AS property_id,
                p.landlord_id
            FROM applications a
            INNER JOIN rooms r ON a.room_id = r.id
            INNER JOIN properties p ON r.property_id = p.id
            WHERE a.boarder_id = ? AND a.status = 'accepted' AND a.deleted_at IS NULL
            LIMIT 1
        ");
        $appStmt->execute([$boarderId]);
        $application = $appStmt->fetch(PDO::FETCH_ASSOC);

        if (!$application) {
            $pdo->rollBack();
            json_response(404, ['error' => 'No active bill found for this boarder']);
        }

        $dueDate = date('Y-m-01');
        $insertStmt = $pdo->prepare("
            INSERT INTO payments (boarder_id, landlord_id, room_id, property_id, amount, late_fee, due_date, status, payment_method, reference_number, notes)
            VALUES (?, ?, ?, ?, ?, 0, ?, 'pending', '', '', '')
        ");
        $insertStmt->execute([
            $boarderId,
            (int) $application['landlord_id'],
            (int) $application['room_id'],
            (int) $application['property_id'],
            (float) $application['price'],
            $dueDate,
        ]);

        $newPaymentId = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM payments WHERE id = ? AND boarder_id = ? FOR UPDATE");
        $stmt->execute([$newPaymentId, $boarderId]);
        $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$payment) {
        $pdo->rollBack();
        json_response(404, ['error' => 'Payment not found']);
    }

    if ($payment['status'] === 'paid') {
        $pdo->rollBack();
        json_response(409, ['error' => 'This payment has already been submitted']);
    }

    $amountDue = (float) $payment['amount'] + (float) ($payment['late_fee'] ?? 0);
    if ($reportedAmount + 0.01 < $amountDue) {
        $pdo->rollBack();
        json_response(400, ['error' => 'Payment amount is less than the current amount due']);
    }

    $notes = trim((string) ($payment['notes'] ?? ''));
    $submissionNote = sprintf(
        'Submitted by boarder on %s. Reported amount: %.2f.',
        date('Y-m-d H:i:s'),
        $reportedAmount
    );
    $notes = $notes === '' ? $submissionNote : $notes . "\n" . $submissionNote;

    $updateStmt = $pdo->prepare("
        UPDATE payments
        SET status = 'paid',
            paid_date = ?,
            payment_method = ?,
            reference_number = ?,
            notes = ?
        WHERE id = ? AND boarder_id = ?
    ");
    $updateStmt->execute([
        $paidDate,
        $paymentMethod,
        $referenceNumber,
        $notes,
        (int) $payment['id'],
        $boarderId,
    ]);

    // Create next month's pending bill so both boarder and landlord dashboards stay up to date.
    $currentDueDate = new DateTime($payment['due_date']);
    $nextDueDate = $currentDueDate->modify('+1 month')->format('Y-m-d');

    $existsStmt = $pdo->prepare("SELECT id FROM payments WHERE boarder_id = ? AND due_date = ? LIMIT 1");
    $existsStmt->execute([$boarderId, $nextDueDate]);
    $nextPaymentExists = $existsStmt->fetchColumn();

    if (!$nextPaymentExists) {
        $nextStmt = $pdo->prepare("
            INSERT INTO payments (boarder_id, landlord_id, room_id, property_id, amount, late_fee, due_date, status, payment_method, reference_number, notes)
            VALUES (?, ?, ?, ?, ?, 0, ?, 'pending', '', '', '')
        ");
        $nextStmt->execute([
            $boarderId,
            (int) $payment['landlord_id'],
            (int) $payment['room_id'],
            (int) $payment['property_id'],
            (float) $payment['amount'],
            $nextDueDate,
        ]);
    }

    $fetchStmt = $pdo->prepare("
        SELECT
            p.id,
            p.amount,
            p.late_fee,
            p.due_date,
            p.paid_date,
            p.status,
            p.payment_method,
            p.reference_number,
            pr.title AS property_name,
            r.title AS room_title,
            r.room_number
        FROM payments p
        INNER JOIN rooms r ON p.room_id = r.id
        INNER JOIN properties pr ON p.property_id = pr.id
        WHERE p.id = ?
    ");
    $fetchStmt->execute([(int) $payment['id']]);
    $updatedPayment = $fetchStmt->fetch(PDO::FETCH_ASSOC);

    $pdo->commit();

    json_response(200, [
        'success' => true,
        'message' => 'Payment submitted successfully. It is now visible to your landlord.',
        'data' => $updatedPayment,
    ]);
} catch (\ResponseSentException $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
} catch (Exception $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Boarder payment submit error: ' . $e->getMessage());
    json_response(500, [
        'success' => false,
        'error' => 'Failed to submit payment',
        'message' => $e->getMessage(),
    ]);
}
