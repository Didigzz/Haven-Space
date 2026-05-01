<?php
/**
 * Update boarder onboarding checklist item
 * 
 * Marks specific onboarding steps as completed or dismisses the entire checklist.
 */

require_once __DIR__ . '/../../src/Core/Database/Connection.php';
require_once __DIR__ . '/../middleware.php';

use App\Core\Database\Connection;
use App\Api\Middleware;

header('Content-Type: application/json');

// Authenticate user and authorize as boarder
$user = Middleware::authorize(['boarder']);
$userId = $user['user_id'];

// Get request body
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

if (!$action) {
    http_response_code(400);
    echo json_encode(['error' => 'Action is required']);
    exit;
}

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Ensure boarder profile exists
    $checkStmt = $pdo->prepare('SELECT id FROM boarder_profiles WHERE user_id = ?');
    $checkStmt->execute([$userId]);
    
    if (!$checkStmt->fetch()) {
        // Create profile if it doesn't exist
        $createStmt = $pdo->prepare('
            INSERT INTO boarder_profiles (user_id, onboarding_completed)
            VALUES (?, FALSE)
        ');
        $createStmt->execute([$userId]);
    }
    
    // Handle different actions
    switch ($action) {
        case 'mark_payment_method_added':
            $stmt = $pdo->prepare('
                UPDATE boarder_profiles
                SET onboarding_payment_method_added = TRUE
                WHERE user_id = ?
            ');
            $stmt->execute([$userId]);
            break;
            
        case 'mark_profile_completed':
            $stmt = $pdo->prepare('
                UPDATE boarder_profiles
                SET onboarding_profile_completed = TRUE
                WHERE user_id = ?
            ');
            $stmt->execute([$userId]);
            break;
            
        case 'mark_house_rules_read':
            $stmt = $pdo->prepare('
                UPDATE boarder_profiles
                SET onboarding_house_rules_read = TRUE
                WHERE user_id = ?
            ');
            $stmt->execute([$userId]);
            break;
            
        case 'dismiss':
            $stmt = $pdo->prepare('
                UPDATE boarder_profiles
                SET onboarding_dismissed_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ');
            $stmt->execute([$userId]);
            break;
            
        case 'complete':
            // Mark all as completed
            $stmt = $pdo->prepare('
                UPDATE boarder_profiles
                SET 
                    onboarding_completed = TRUE,
                    onboarding_payment_method_added = TRUE,
                    onboarding_profile_completed = TRUE,
                    onboarding_house_rules_read = TRUE
                WHERE user_id = ?
            ');
            $stmt->execute([$userId]);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            exit;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Onboarding status updated'
    ]);
    
} catch (Exception $e) {
    error_log('Error updating onboarding status: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update onboarding status']);
}
