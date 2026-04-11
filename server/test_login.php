<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/src/Core/bootstrap.php';

use App\Core\Database\Connection;
use App\Core\Auth\JWT;

echo "Testing database connection...\n";

try {
    $pdo = Connection::getInstance()->getPdo();
    echo "✓ Database connected\n";
    
    // Test fetching user
    $stmt = $pdo->prepare('SELECT id, first_name, last_name, email, role FROM users WHERE email = ?');
    $stmt->execute(['john.doe@example.com']);
    $user = $stmt->fetch();
    
    if ($user) {
        echo "✓ User found: {$user['first_name']} {$user['last_name']} ({$user['role']})\n";
    } else {
        echo "✗ User not found\n";
    }
    
    // Test password verification
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE email = ?');
    $stmt->execute(['john.doe@example.com']);
    $hash = $stmt->fetchColumn();
    
    if (password_verify('SecurePass123!', $hash)) {
        echo "✓ Password verified\n";
    } else {
        echo "✗ Password incorrect\n";
    }
    
    // Test JWT
    $config = require_once __DIR__ . '/config/app.php';
    echo "JWT Secret: " . $config['jwt_secret'] . "\n";
    echo "JWT Expiration: " . $config['jwt_expiration'] . "\n";
    
    $payload = [
        'user_id' => $user['id'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'email' => $user['email'],
        'role' => $user['role']
    ];
    
    $token = JWT::generate($payload, $config['jwt_expiration']);
    echo "✓ JWT generated: " . substr($token, 0, 50) . "...\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
