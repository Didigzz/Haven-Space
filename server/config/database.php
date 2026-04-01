<?php
// Haven Space Database Configuration

return [
    'host' => '127.0.0.1',
    'database' => 'havenspace_db',
    'username' => 'root', // Default XAMPP username
    'password' => '',     // Default XAMPP password (empty)
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
];
