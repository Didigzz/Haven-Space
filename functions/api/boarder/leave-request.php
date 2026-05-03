<?php
/**
 * Boarder Leave Request API
 * Handles boarder requests to leave a property by sending a message to the landlord
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

// Authenticate user and authorize as boarder
$user = Middleware::authorize(['boarder']);
$boarderId = $user['user_id'];

// Get request body
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (empty($input['reason']) || empty($input['leave_date']) || empty($input['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Reason, leave date, and message are required']);
    exit;
}

$reason = trim($input['reason']);
$leaveDate = trim($input['leave_date']);
$message = trim($input['message']);

try {
    // Get database connection
    $pdo = Connection::getInstance()->getPdo();
    
    // Get boarder's name
    $userQuery = "SELECT first_name, last_name FROM users WHERE id = ? LIMIT 1";
    $stmt = $pdo->prepare($userQuery);
    $stmt->execute([$boarderId]);
    $userResult = $stmt->fetch();
    
    if (!$userResult) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }
    
    $boarderName = $userResult['first_name'] . ' ' . $userResult['last_name'];
    
    // Find the boarder's current tenancy (accepted application) to get the landlord
    $tenancyQuery = "
        SELECT 
            a.id as application_id,
            r.property_id,
            p.landlord_id,
            p.title as property_name,
            u.first_name as landlord_first_name,
            u.last_name as landlord_last_name
        FROM applications a
        JOIN rooms r ON a.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN users u ON p.landlord_id = u.id
        WHERE a.boarder_id = ? 
        AND a.status = 'accepted'
        AND a.deleted_at IS NULL
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($tenancyQuery);
    $stmt->execute([$boarderId]);
    $tenancy = $stmt->fetch();
    
    if (!$tenancy) {
        http_response_code(404);
        echo json_encode(['error' => 'No active tenancy found. You must be currently renting to submit a leave request.']);
        exit;
    }
    
    $landlordId = $tenancy['landlord_id'];
    $propertyId = $tenancy['property_id'];
    $propertyName = $tenancy['property_name'];
    
    // Format the leave date for display
    $leaveDateFormatted = date('F j, Y', strtotime($leaveDate));
    
    // Create the message text
    $messageText = "🏠 LEAVE REQUEST\n\n";
    $messageText .= "Boarder: {$boarderName}\n";
    $messageText .= "Property: {$propertyName}\n";
    $messageText .= "Reason: {$reason}\n";
    $messageText .= "Intended Leave Date: {$leaveDateFormatted}\n\n";
    $messageText .= "Message:\n{$message}\n\n";
    $messageText .= "---\n";
    $messageText .= "This is an automated leave request notification.";
    
    // Check if a conversation already exists between boarder and landlord for this property
    $conversationQuery = "
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
        WHERE c.property_id = ?
        AND c.type = 'direct'
        AND cp1.user_id = ?
        AND cp2.user_id = ?
        AND cp1.is_active = TRUE
        AND cp2.is_active = TRUE
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($conversationQuery);
    $stmt->execute([$propertyId, $boarderId, $landlordId]);
    $conversation = $stmt->fetch();
    
    $conversationId = null;
    
    if ($conversation) {
        // Use existing conversation
        $conversationId = $conversation['id'];
        
        // Update conversation timestamp
        $updateConvQuery = "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = $pdo->prepare($updateConvQuery);
        $stmt->execute([$conversationId]);
    } else {
        // Create new conversation
        $landlordName = $tenancy['landlord_first_name'] . ' ' . $tenancy['landlord_last_name'];
        $conversationTitle = "Leave Request - {$propertyName}";
        
        $createConvQuery = "
            INSERT INTO conversations (title, type, property_id, created_by, is_system_thread)
            VALUES (?, 'direct', ?, ?, FALSE)
        ";
        
        $stmt = $pdo->prepare($createConvQuery);
        $stmt->execute([$conversationTitle, $propertyId, $boarderId]);
        $conversationId = $pdo->lastInsertId();
        
        // Add both participants to the conversation
        $addParticipantQuery = "
            INSERT INTO conversation_participants (conversation_id, user_id, role, is_active)
            VALUES (?, ?, ?, TRUE)
        ";
        
        // Add boarder
        $stmt = $pdo->prepare($addParticipantQuery);
        $stmt->execute([$conversationId, $boarderId, 'boarder']);
        
        // Add landlord
        $stmt = $pdo->prepare($addParticipantQuery);
        $stmt->execute([$conversationId, $landlordId, 'landlord']);
    }
    
    // Insert the leave request message
    $insertMessageQuery = "
        INSERT INTO messages (conversation_id, sender_id, message_text, has_attachment, is_read)
        VALUES (?, ?, ?, FALSE, FALSE)
    ";
    
    $stmt = $pdo->prepare($insertMessageQuery);
    $stmt->execute([$conversationId, $boarderId, $messageText]);
    $messageId = $pdo->lastInsertId();
    
    // Cancel/delete the application since the boarder is leaving
    $applicationId = $tenancy['application_id'];
    $cancelApplicationQuery = "
        UPDATE applications 
        SET status = 'cancelled', 
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND boarder_id = ?
    ";
    $stmt = $pdo->prepare($cancelApplicationQuery);
    $stmt->execute([$applicationId, $boarderId]);
    
    // Reset boarder status to 'new' so they can browse and apply again
    $updateBoarderStatusQuery = "
        UPDATE users 
        SET boarder_status = 'new',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ";
    $stmt = $pdo->prepare($updateBoarderStatusQuery);
    $stmt->execute([$boarderId]);
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Leave request sent to landlord successfully',
        'data' => [
            'conversation_id' => $conversationId,
            'message_id' => $messageId,
            'landlord_name' => $tenancy['landlord_first_name'] . ' ' . $tenancy['landlord_last_name'],
            'property_name' => $propertyName,
            'leave_date' => $leaveDateFormatted,
            'boarder_status' => 'new'
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Leave request error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send leave request. Please try again later.']);
}
