<?php

/**
 * Test Script for Verify Reset Code Endpoint
 * This script tests the verify reset code functionality
 */

// Set the content type to JSON
header('Content-Type: application/json');

// Test data - use the email and code from the database
$testEmail = 'qwenzy23061@gmail.com';
$testCode = '728501'; // Use the code from check_reset_requests.php

// Create a cURL request to the verify reset code endpoint
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/auth/verify-reset-code');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'email' => $testEmail,
    'code' => $testCode
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Output the response
echo "Testing verify reset code for: {$testEmail}\n";
echo "Code: {$testCode}\n";
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

    if (isset($data['valid']) && $data['valid']) {
        echo "\n✅ Code is valid!\n";
        echo "User ID: {$data['user_id']}\n";
        echo "Request ID: {$data['request_id']}\n";
    }
} else {
    echo "\nError: Invalid JSON response\n";
}
