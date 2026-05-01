<?php
/**
 * Get boarder onboarding checklist status
 * 
 * Returns the current onboarding completion status for a boarder
 * after their application has been accepted by a landlord.
 */

require_once __DIR__ . '/../../src/Core/Database/Connection.php';
require_once __DIR__ . '/../middleware.php';

use App\Core\Database\Connection;
use App\Api\Middleware;

header('Content-Type: application/json');

// Authenticate user and authorize as boarder
$user = Middleware::authorize(['boarder']);
$userId = $user['user_id'];

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Check if boarder has any accepted applications
    $acceptedAppStmt = $pdo->prepare('
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ? AND status = "accepted" AND deleted_at IS NULL
    ');
    $acceptedAppStmt->execute([$userId]);
    $hasAcceptedApp = $acceptedAppStmt->fetch()['count'] > 0;
    
    // If no accepted application, onboarding not needed
    if (!$hasAcceptedApp) {
        echo json_encode([
            'show_onboarding' => false,
            'reason' => 'no_accepted_application'
        ]);
        exit;
    }
    
    // Get onboarding status from boarder_profiles
    $stmt = $pdo->prepare('
        SELECT 
            onboarding_completed,
            onboarding_payment_method_added,
            onboarding_profile_completed,
            onboarding_house_rules_read,
            onboarding_dismissed_at
        FROM boarder_profiles
        WHERE user_id = ?
    ');
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();
    
    // If no profile exists, create one with default values
    if (!$profile) {
        $createStmt = $pdo->prepare('
            INSERT INTO boarder_profiles (
                user_id, 
                budget_min, 
                budget_max, 
                preferred_location, 
                move_in_date, 
                occupation, 
                bio,
                onboarding_completed
            )
            VALUES (?, 0, 0, "", "1970-01-01", "", "", FALSE)
        ');
        $createStmt->execute([$userId]);
        
        $profile = [
            'onboarding_completed' => false,
            'onboarding_payment_method_added' => false,
            'onboarding_profile_completed' => false,
            'onboarding_house_rules_read' => false,
            'onboarding_dismissed_at' => null
        ];
    }
    
    // Check if boarder has payment method
    $paymentMethodStmt = $pdo->prepare('
        SELECT COUNT(*) as count
        FROM payment_methods
        WHERE user_id = ? AND deleted_at IS NULL
    ');
    $paymentMethodStmt->execute([$userId]);
    $hasPaymentMethod = $paymentMethodStmt->fetch()['count'] > 0;
    
    // Check if profile is completed (has bio and occupation)
    $profileStmt = $pdo->prepare('
        SELECT 
            CASE 
                WHEN bp.bio != "" AND bp.occupation != "" THEN TRUE
                ELSE FALSE
            END as is_completed
        FROM boarder_profiles bp
        WHERE bp.user_id = ?
    ');
    $profileStmt->execute([$userId]);
    $profileData = $profileStmt->fetch();
    $isProfileCompleted = $profileData ? (bool)$profileData['is_completed'] : false;
    
    // Calculate checklist items
    $checklist = [
        'application_accepted' => true, // Always true if we got here
        'payment_method_added' => $hasPaymentMethod || (bool)$profile['onboarding_payment_method_added'],
        'profile_completed' => $isProfileCompleted || (bool)$profile['onboarding_profile_completed'],
        'house_rules_read' => (bool)$profile['onboarding_house_rules_read']
    ];
    
    // Determine if onboarding should be shown
    $allCompleted = $checklist['payment_method_added'] && 
                    $checklist['house_rules_read'];
    
    $showOnboarding = !$allCompleted && 
                      !(bool)$profile['onboarding_completed'] &&
                      $profile['onboarding_dismissed_at'] === null;
    
    echo json_encode([
        'show_onboarding' => $showOnboarding,
        'checklist' => $checklist,
        'onboarding_completed' => (bool)$profile['onboarding_completed'],
        'dismissed_at' => $profile['onboarding_dismissed_at']
    ]);
    
} catch (Exception $e) {
    error_log('Error fetching onboarding status: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch onboarding status']);
}
