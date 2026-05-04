<?php
// Database connection
$host = '127.0.0.1';
$database = 'havenspace_db';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Creating sample data...\n";

    // Create a sample landlord user
    $stmt = $pdo->prepare("INSERT IGNORE INTO users (id, first_name, last_name, email, role_id, is_verified, email_verified) VALUES (1, 'Juan', 'Dela Cruz', 'landlord@example.com', 2, 1, 1)");
    $stmt->execute();

    // Create a sample boarder user
    $stmt = $pdo->prepare("INSERT IGNORE INTO users (id, first_name, last_name, email, role_id, is_verified, email_verified) VALUES (2, 'Maria', 'Santos', 'boarder@example.com', 1, 1, 1)");
    $stmt->execute();

    // Create sample addresses
    $addresses = [
        ['123 University Ave', '', 'Quezon City', 'Metro Manila', 14.6537, 121.0685],
        ['456 Loyola Heights', '', 'Quezon City', 'Metro Manila', 14.6400, 121.0776],
    ];

    foreach ($addresses as $address) {
