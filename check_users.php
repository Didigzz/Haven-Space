<?php
require_once __DIR__ . '/functions/vendor/autoload.php';

use App\Core\Database\Connection;

$pdo = Connection::getInstance()->getPdo();

echo "=== USERS IN SYSTEM ===\n\n";

$stmt = $pdo->query("
    SELECT u.id, u.email, u.first_name, u.last_name, ur.role_name
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.deleted_at IS NULL
    ORDER BY ur.role_name, u.id
");

$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($users as $user) {
    echo "{$user['role_name']}: {$user['first_name']} {$user['last_name']} ({$user['email']}) - ID: {$user['id']}\n";
}

echo "\n=== ACCEPTED APPLICATIONS ===\n\n";

$stmt = $pdo->query("
    SELECT 
        a.id,
        a.status,
        l.email as landlord_email,
        CONCAT(l.first_name, ' ', l.last_name) as landlord_name,
        b.email as boarder_email,
        CONCAT(b.first_name, ' ', b.last_name) as boarder_name
    FROM applications a
    JOIN users l ON a.landlord_id = l.id
    JOIN users b ON a.boarder_id = b.id
    WHERE a.status IN ('accepted', 'confirmed')
    AND a.deleted_at IS NULL
");

$apps = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($apps as $app) {
    echo "Application #{$app['id']} ({$app['status']})\n";
    echo "  Landlord: {$app['landlord_name']} ({$app['landlord_email']})\n";
    echo "  Boarder: {$app['boarder_name']} ({$app['boarder_email']})\n\n";
}

echo "=== CONVERSATIONS ===\n\n";

$stmt = $pdo->query("
    SELECT 
        c.id,
        c.title,
        c.type,
        GROUP_CONCAT(CONCAT(u.first_name, ' ', u.last_name, ' (', ur.role_name, ')') SEPARATOR ', ') as participants
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    JOIN users u ON cp.user_id = u.id
    JOIN user_roles ur ON u.role_id = ur.id
    GROUP BY c.id
");

$convs = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($convs as $conv) {
    echo "Conversation #{$conv['id']}: {$conv['title']} ({$conv['type']})\n";
    echo "  Participants: {$conv['participants']}\n\n";
}
