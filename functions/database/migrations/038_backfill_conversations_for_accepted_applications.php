<?php
/**
 * Backfill conversations for existing accepted applications
 * 
 * This script creates conversations between landlords and boarders
 * for all existing accepted applications that don't have conversations yet.
 */

require_once __DIR__ . '/../../vendor/autoload.php';

use App\Core\Database\Connection;
use App\Modules\Message\Services\MessageService;

try {
    $pdo = Connection::getInstance()->getPdo();
    $messageService = new MessageService();
    
    echo "Starting conversation backfill for accepted applications...\n\n";
    
    // Get all accepted applications with landlord and boarder details
    $stmt = $pdo->prepare("
        SELECT DISTINCT
            a.id as application_id,
            a.landlord_id,
            a.boarder_id,
            a.status,
            CONCAT(l.first_name, ' ', l.last_name) as landlord_name,
            CONCAT(b.first_name, ' ', b.last_name) as boarder_name
        FROM applications a
        JOIN users l ON a.landlord_id = l.id
        JOIN users b ON a.boarder_id = b.id
        WHERE a.status IN ('accepted', 'confirmed')
        AND a.deleted_at IS NULL
        ORDER BY a.id
    ");
    $stmt->execute();
    $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($applications) . " accepted/confirmed applications\n\n";
    
    $created = 0;
    $existing = 0;
    $errors = 0;
    
    foreach ($applications as $app) {
        try {
            // Check if conversation already exists
            $checkStmt = $pdo->prepare("
                SELECT cp1.conversation_id 
                FROM conversation_participants cp1
                JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
                JOIN conversations c ON cp1.conversation_id = c.id
                WHERE cp1.user_id = ? AND cp2.user_id = ? AND c.type = 'direct'
                LIMIT 1
            ");
            $checkStmt->execute([$app['landlord_id'], $app['boarder_id']]);
            $existingConv = $checkStmt->fetch();
            
            if ($existingConv) {
                echo "✓ Conversation already exists between {$app['landlord_name']} and {$app['boarder_name']}\n";
                $existing++;
                continue;
            }
            
            // Create conversation
            $conversationId = $messageService->getOrCreateConversation(
                $app['landlord_id'],
                $app['boarder_id']
            );
            
            echo "✓ Created conversation #{$conversationId} between {$app['landlord_name']} (landlord) and {$app['boarder_name']} (boarder)\n";
            $created++;
            
        } catch (Exception $e) {
            echo "✗ Error creating conversation for application #{$app['application_id']}: " . $e->getMessage() . "\n";
            $errors++;
        }
    }
    
    echo "\n";
    echo "========================================\n";
    echo "Backfill Complete!\n";
    echo "========================================\n";
    echo "Created: $created conversations\n";
    echo "Already existed: $existing conversations\n";
    echo "Errors: $errors\n";
    echo "========================================\n";
    
} catch (Exception $e) {
    echo "Fatal error: " . $e->getMessage() . "\n";
    exit(1);
}
