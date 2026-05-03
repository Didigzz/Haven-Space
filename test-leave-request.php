<?php
/**
 * Test script to debug leave request issue
 */

require_once __DIR__ . '/functions/src/Core/bootstrap.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    echo "✓ Database connection successful\n\n";
    
    // Test boarder ID (from JWT: user_id = 3)
    $boarderId = 3;
    
    // Check if boarder exists
    $userQuery = "SELECT id, first_name, last_name, email, boarder_status FROM users WHERE id = ? LIMIT 1";
    $stmt = $pdo->prepare($userQuery);
    $stmt->execute([$boarderId]);
    $user = $stmt->fetch();
    
    if ($user) {
        echo "✓ Boarder found:\n";
        echo "  ID: {$user['id']}\n";
        echo "  Name: {$user['first_name']} {$user['last_name']}\n";
        echo "  Email: {$user['email']}\n";
        echo "  Status: {$user['boarder_status']}\n\n";
    } else {
        echo "✗ Boarder not found\n\n";
        exit(1);
    }
    
    // Check for active tenancy
    $tenancyQuery = "
        SELECT 
            a.id as application_id,
            a.status,
            a.deleted_at,
            r.id as room_id,
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
    
    if ($tenancy) {
        echo "✓ Active tenancy found:\n";
        echo "  Application ID: {$tenancy['application_id']}\n";
        echo "  Status: {$tenancy['status']}\n";
        echo "  Room ID: {$tenancy['room_id']}\n";
        echo "  Property ID: {$tenancy['property_id']}\n";
        echo "  Property Name: {$tenancy['property_name']}\n";
        echo "  Landlord ID: {$tenancy['landlord_id']}\n";
        echo "  Landlord Name: {$tenancy['landlord_first_name']} {$tenancy['landlord_last_name']}\n\n";
    } else {
        echo "✗ No active tenancy found\n";
        echo "  Checking all applications for this boarder:\n\n";
        
        $allAppsQuery = "
            SELECT id, room_id, status, deleted_at, created_at
            FROM applications
            WHERE boarder_id = ?
            ORDER BY created_at DESC
        ";
        $stmt = $pdo->prepare($allAppsQuery);
        $stmt->execute([$boarderId]);
        $allApps = $stmt->fetchAll();
        
        if ($allApps) {
            foreach ($allApps as $app) {
                echo "  - App ID: {$app['id']}, Room: {$app['room_id']}, Status: {$app['status']}, Deleted: " . ($app['deleted_at'] ? 'Yes' : 'No') . "\n";
            }
        } else {
            echo "  No applications found for this boarder\n";
        }
        echo "\n";
        exit(1);
    }
    
    // Check conversations table structure
    echo "Checking conversations table structure:\n";
    $tableQuery = "DESCRIBE conversations";
    $stmt = $pdo->query($tableQuery);
    $columns = $stmt->fetchAll();
    foreach ($columns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }
    echo "\n";
    
    // Check messages table structure
    echo "Checking messages table structure:\n";
    $tableQuery = "DESCRIBE messages";
    $stmt = $pdo->query($tableQuery);
    $columns = $stmt->fetchAll();
    foreach ($columns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }
    echo "\n";
    
    echo "✓ All checks passed!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
