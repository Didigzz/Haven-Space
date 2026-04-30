<?php
require 'functions/vendor/autoload.php';

use App\Core\Database\Connection;

$pdo = Connection::getInstance()->getPdo();

echo "=== Analyzing Table Dependencies ===\n\n";

// Check foreign key constraints
$tables = ['addresses', 'property_reports'];

foreach ($tables as $table) {
    echo "--- $table ---\n";
    
    try {
        // Check row count
        $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
        $count = $stmt->fetchColumn();
        echo "Rows: $count\n";
        
        // Check foreign keys referencing this table
        $stmt = $pdo->prepare("
            SELECT 
                TABLE_NAME,
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME = ?
        ");
        $stmt->execute([$table]);
        $fks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($fks)) {
            echo "Referenced by:\n";
            foreach ($fks as $fk) {
                echo "  - {$fk['TABLE_NAME']}.{$fk['COLUMN_NAME']} (FK: {$fk['CONSTRAINT_NAME']})\n";
            }
        } else {
            echo "Not referenced by any table\n";
        }
        
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
}
