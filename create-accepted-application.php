<?php
/**
 * Create an accepted application for testing
 */

require_once __DIR__ . '/functions/src/Core/bootstrap.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Boarder: katgeecover@gmail.com (ID: 3)
    $boarderId = 3;
    
    // Landlord: amlhungrykat@gmail.com (ID: 4)
    $landlordId = 4;
    
    // Get a room from the landlord's property
    $roomQuery = "
        SELECT r.id, r.property_id, p.title as property_title
        FROM rooms r
        JOIN properties p ON r.property_id = p.id
        WHERE p.landlord_id = ?
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($roomQuery);
    $stmt->execute([$landlordId]);
    $room = $stmt->fetch();
    
    if (!$room) {
        echo "No available rooms found for landlord ID: $landlordId\n";
        exit(1);
    }
    
    echo "Found available room:\n";
    echo "  Room ID: {$room['id']}\n";
    echo "  Property ID: {$room['property_id']}\n";
    echo "  Property: {$room['property_title']}\n\n";
    
    // Create an accepted application
    $insertQuery = "
        INSERT INTO applications (boarder_id, landlord_id, room_id, message, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'accepted', NOW(), NOW())
    ";
    
    $message = "I would like to rent this room. This is a test application.";
    
    $stmt = $pdo->prepare($insertQuery);
    $stmt->execute([$boarderId, $landlordId, $room['id'], $message]);
    
    $applicationId = $pdo->lastInsertId();
    
    echo "✓ Created accepted application:\n";
    echo "  Application ID: $applicationId\n";
    echo "  Boarder ID: $boarderId\n";
    echo "  Landlord ID: $landlordId\n";
    echo "  Room ID: {$room['id']}\n";
    echo "  Status: accepted\n\n";
    
    echo "Now you can test the leave request!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
