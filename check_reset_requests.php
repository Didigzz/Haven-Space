<?php

/**
 * Script to Check Password Reset Requests
 * This script checks the password_reset_requests table for recent entries
 */

$db = require __DIR__ . '/functions/config/database.php';

try {
    $pdo = new PDO("mysql:host=" . $db['host'] . ";dbname=" . $db['database'], $db['username'], $db['password']);

    // Get recent password reset requests
    $stmt = $pdo->query("SELECT prr.id, prr.user_id, prr.email, prr.reset_code, prr.expires_at, prr.attempts, prr.is_used, u.first_name, u.last_name FROM password_reset_requests prr JOIN users u ON prr.user_id = u.id WHERE prr.expires_at > UNIX_TIMESTAMP() AND prr.is_used = FALSE ORDER BY prr.created_at DESC LIMIT 5");
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Recent Password Reset Requests:\n";
    echo str_repeat('-', 80) . "\n";

    if (empty($requests)) {
        echo "No active password reset requests found.\n";
    } else {
        foreach ($requests as $request) {
            $expiresIn = $request['expires_at'] - time();
            $minutes = floor($expiresIn / 60);
            $seconds = $expiresIn % 60;

            echo "ID: {$request['id']}\n";
            echo "User: {$request['first_name']} {$request['last_name']} (ID: {$request['user_id']})\n";
            echo "Email: {$request['email']}\n";
            echo "Reset Code: {$request['reset_code']}\n";
            echo "Expires In: {$minutes}m {$seconds}s\n";
            echo "Attempts: {$request['attempts']}\n";
            echo "Used: " . ($request['is_used'] ? 'Yes' : 'No') . "\n";
            echo str_repeat('-', 80) . "\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
