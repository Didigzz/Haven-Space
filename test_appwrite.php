<?php

/**
 * Test Script for Appwrite Client
 * This script tests if the Appwrite Client class is properly loaded
 */

require_once __DIR__ . '/functions/vendor/autoload.php';

try {
    // Try to create an Appwrite Client instance
    $client = new Appwrite\Client();

    echo "✅ Appwrite Client class loaded successfully!\n";
    echo "Client instance created: " . get_class($client) . "\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
