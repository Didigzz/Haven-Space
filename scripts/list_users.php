<?php
$db = require 'server/config/database.php';
try {
    $pdo = new PDO("mysql:host=" . $db['host'] . ";dbname=" . $db['database'], $db['username'], $db['password']);
    
    // Revert user 3 back to original name from user's screen
    $pdo->query("UPDATE users SET first_name='John Paul', last_name='Abecia' WHERE id=3");
    
    $stmt = $pdo->query("SELECT id, first_name, last_name, email, role, google_id FROM users ORDER BY id ASC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "ID | Name | Role | Reg Method | Email\n";
    echo str_repeat('-', 60) . "\n";
    foreach ($users as $u) {
        $method = $u['google_id'] ? "Google Auth" : "Email/Password";
        echo "{$u['id']} | {$u['first_name']} {$u['last_name']} | {$u['role']} | $method | {$u['email']}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
