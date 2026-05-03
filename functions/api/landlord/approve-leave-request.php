<?php
/**
 * Landlord Approve Leave Request API
 * Allows landlords to approve a boarder's leave request
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Authenticate user and authorize as landlord
$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

// Get request body
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (empty($input['application_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Application ID is required']);
    exit;
}

$applicationId = (int) $input['application_id'];

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Verify the application belongs to this landlord and has a pending leave request
    $checkQuery = "
        SELECT 
            a.id, 
            a.leave_request_status, 
            a.intended_leave_date,
            a.boarder_id,
            u.first_name,
            u.last_name
        FROM applications a
        JOIN users u ON a.boarder_id = u.id
        WHERE a.id = ?
        AND a.landlord_id = ?
        AND a.leave_request_status = 'pending'
        AND a.deleted_at IS NULL
    ";
    
    $stmt = $pdo->prepare($checkQuery);
    $stmt->execute([$applicationId, $landlordId]);
    $application = $stmt->fetch();
    
    if (!$application) {
        http_response_code(404);
        echo json_encode(['error' => 'Leave request not found or already processed']);
        exit;
    }
    
    // Update leave request status to approved
    $updateQuery = "
        UPDATE applications
        SET leave_request_status = 'approved',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ";
    
    $stmt = $pdo->prepare($updateQuery);
    $stmt->execute([$applicationId]);
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Leave request approved successfully',
        'data' => [
            'application_id' => $applicationId,
            'boarder_name' => $application['first_name'] . ' ' . $application['last_name'],
            'intended_leave_date' => $application['intended_leave_date']
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Approve leave request error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to approve leave request']);
}
