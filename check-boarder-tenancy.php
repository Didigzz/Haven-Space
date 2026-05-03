<?php
/**
 * Check boarder tenancy status
 */

require_once __DIR__ . '/functions/src/Core/bootstrap.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Boarder ID from JWT (katgeecover@gmail.com)
    $boarderId = 3;
    
    echo "Checking tenancy for boarder ID: $boarderId\n\n";
    
    // Check all applications for this boarder
    $query = "
        SELECT 
            a.id,
            a.status,
            a.deleted_at,
            a.created_at,
            r.id as room_id,
            r.title as room_title,
            p.id as property_id,
            p.title as property_title,
            u.id as landlord_id,
            u.first_name as landlord_first_name,
            u.last_name as landlord_last_name
        FROM applications a
        JOIN rooms r ON a.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN users u ON p.landlord_id = u.id
        WHERE a.boarder_id = ?
        ORDER BY a.created_at DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$boarderId]);
    $applications = $stmt->fetchAll();
    
    if (empty($applications)) {
        echo "No applications found for this boarder.\n";
        echo "The boarder needs to apply for a room first.\n";
        exit(0);
    }
    
    echo "Found " . count($applications) . " application(s):\n\n";
    
    foreach ($applications as $app) {
        echo "Application ID: {$app['id']}\n";
        echo "  Status: {$app['status']}\n";
        echo "  Deleted: " . ($app['deleted_at'] ? 'Yes (' . $app['deleted_at'] . ')' : 'No') . "\n";
        echo "  Room: {$app['room_title']} (ID: {$app['room_id']})\n";
        echo "  Property: {$app['property_title']} (ID: {$app['property_id']})\n";
        echo "  Landlord: {$app['landlord_first_name']} {$app['landlord_last_name']} (ID: {$app['landlord_id']})\n";
        echo "  Created: {$app['created_at']}\n";
        echo "\n";
    }
    
    // Check for accepted application
    $acceptedQuery = "
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ?
        AND status = 'accepted'
        AND deleted_at IS NULL
    ";
    
    $stmt = $pdo->prepare($acceptedQuery);
    $stmt->execute([$boarderId]);
    $result = $stmt->fetch();
    
    if ($result['count'] > 0) {
        echo "✓ Boarder has {$result['count']} accepted application(s)\n";
    } else {
        echo "✗ Boarder has NO accepted applications\n";
        echo "  To test the leave request, you need to:\n";
        echo "  1. Apply for a room as this boarder\n";
        echo "  2. Have the landlord accept the application\n";
        echo "  3. Then try the leave request again\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
