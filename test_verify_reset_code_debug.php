<?php

/**
 * Debug Script for Verify Reset Code Endpoint
 * This script tests the verify reset code functionality with error output
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
$error = curl_error($ch);
curl_close($ch);

// Output the response
echo "Testing verify reset code for: {$testEmail}\n";
echo "Code: {$testCode}\n";
echo "HTTP Status Code: {$httpCode}\n";
echo "cURL Error: {$error}\n";
echo "Response: " . ($response ?: '(empty)') . "\n";

// Try to decode the response
$data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo "\nJSON Decode Error: " . json_last_error_msg() . "\n";
    echo "Raw Response Length: " . strlen($response) . "\n";
    echo "Raw Response (hex): " . bin2hex($response) . "\n";
}
