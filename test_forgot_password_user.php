<?php

/**
 * Test Script for Forgot Password Endpoint with Specific User
 * This script tests the forgot password functionality with a specific user
 */

// Set the content type to JSON
header('Content-Type: application/json');

// Test email - using an existing user
$testEmail = 'qwenzy23061@gmail.com';

// Create a cURL request to the forgot password endpoint
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/auth/forgot-password');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => $testEmail]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Output the response
echo "Testing forgot password for: {$testEmail}\n";
echo "HTTP Status Code: {$httpCode}\n";
echo "Response: {$response}\n";

// Decode the response
$data = json_decode($response, true);

if (json_last_error() === JSON_ERROR_NONE) {
    if (isset($data['message'])) {
        echo "\nSuccess: {$data['message']}\n";
    }

    if (isset($data['error'])) {
        echo "\nError: {$data['error']}\n";
    }
} else {
    echo "\nError: Invalid JSON response\n";
}
