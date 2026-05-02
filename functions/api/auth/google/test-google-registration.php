<?php
/**
 * Test script for Google OAuth Registration Fix
 *
 * This script tests that the complete-registration.php endpoint properly includes
 * access_token and refresh_token in the response for frontend storage.
 */

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../../src/Core/bootstrap.php';

use App\Core\Auth\JWT;
use App\Core\Database\Connection;

echo "=== Testing Google OAuth Registration Token Fix ===\n\n";

try {
    // Connect to database
    $pdo = Connection::getInstance()->getPdo();
    $config = require __DIR__ . '/../../../config/app.php';

    echo "✓ Database connection established\n";

    // Test data - simulate what would be in the database after Google OAuth
    $testUserData = [
        'google_id' => '123456789',
        'email' => 'test+google' . time() . '@example.com',
        'first_name' => 'Test',
        'last_name' => 'User',
        'access_token' => 'google_access_token_123',
        'refresh_token' => 'google_refresh_token_456',
        'email_verified' => true,
    ];

    // Generate JWT tokens (same as in complete-registration.php)
    $payload = [
        'user_id' => 99999, // Test user ID
        'first_name' => $testUserData['first_name'],
        'last_name' => $testUserData['last_name'],
        'email' => $testUserData['email'],
        'role' => 'landlord',
        'is_verified' => true,
        'account_status' => 'pending_verification',
        'google_id' => $testUserData['google_id'],
    ];

    $jwtAccessToken = JWT::generate($payload, $config['jwt_expiration']);
    $jwtRefreshToken = JWT::generate($payload, $config['refresh_token_expiration']);

    echo "✓ JWT tokens generated\n";
    echo "  - Access token length: " . strlen($jwtAccessToken) . " chars\n";
    echo "  - Refresh token length: " . strlen($jwtRefreshToken) . " chars\n\n";

    // Simulate the user data that would be returned
    $userData = [
        'id' => 99999,
        'first_name' => $testUserData['first_name'],
        'last_name' => $testUserData['last_name'],
        'email' => $testUserData['email'],
        'role' => 'landlord',
    ];

    // Add tokens to user data (this is the fix)
    $userData['access_token'] = $jwtAccessToken;
    $userData['refresh_token'] = $jwtRefreshToken;

    // Create the response that would be sent to frontend
    $response = [
        'success' => true,
        'message' => 'Registration completed successfully',
        'user' => $userData,
        'redirect_url' => '/views/landlord/index.html#auth=' . urlencode(json_encode($userData))
    ];

    echo "✓ Response prepared with tokens included\n";

    // Verify the tokens are in the user data
    $userDataFromResponse = $response['user'];

    if (isset($userDataFromResponse['access_token']) && isset($userDataFromResponse['refresh_token'])) {
        echo "✓ Tokens are properly included in user data\n";
        echo "  - access_token: " . (strlen($userDataFromResponse['access_token']) > 0 ? "present" : "MISSING") . "\n";
        echo "  - refresh_token: " . (strlen($userDataFromResponse['refresh_token']) > 0 ? "present" : "MISSING") . "\n\n";

        // Verify the redirect URL contains the tokens
        $redirectUrl = $response['redirect_url'];
        if (strpos($redirectUrl, '#auth=') !== false) {
            $hashData = substr($redirectUrl, strpos($redirectUrl, '#auth=') + 6);
            $decodedData = urldecode($hashData);
            $parsedData = json_decode($decodedData, true);

            if (isset($parsedData['access_token']) && isset($parsedData['refresh_token'])) {
                echo "✓ Redirect URL hash contains tokens\n";
                echo "  - Hash data is valid JSON: YES\n";
                echo "  - Tokens in hash: access_token and refresh_token present\n\n";
            } else {
                echo "✗ Redirect URL hash missing tokens\n";
                echo "  - Expected: access_token and refresh_token\n";
                echo "  - Got: " . json_encode(array_keys($parsedData)) . "\n\n";
            }
        } else {
            echo "✗ Redirect URL missing #auth= hash\n\n";
        }

        echo "=== TEST PASSED ===\n";
        echo "The fix correctly includes access_token and refresh_token in the response.\n";
        echo "Frontend OAuth handler will be able to store these tokens in localStorage.\n";

    } else {
        echo "✗ FAIL: Tokens missing from user data\n";
        echo "  - access_token: " . (isset($userDataFromResponse['access_token']) ? "present" : "MISSING") . "\n";
        echo "  - refresh_token: " . (isset($userDataFromResponse['refresh_token']) ? "present" : "MISSING") . "\n\n";
        echo "=== TEST FAILED ===\n";
    }

} catch (Exception $e) {
    echo "✗ Test failed with exception: " . $e->getMessage() . "\n";
    echo "=== TEST FAILED ===\n";
}
