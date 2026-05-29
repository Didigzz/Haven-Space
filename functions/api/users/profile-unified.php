<?php

/**
 * User Profile API Endpoints
 * Handles user profile data updates using the database system
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';
require_once __DIR__ . '/../../config/database.php';

use App\Api\Middleware;

// Authenticate user
$user = Middleware::authenticate();
if (!$user) {
    json_response(401, ['error' => 'Unauthorized']);
    return;
}

$method = $_SERVER['REQUEST_METHOD'];

// Get database adapter
$db = getUnifiedDB();

switch ($method) {
    case 'GET':
        getUserProfile($db, $user['user_id']);
        break;
    case 'PUT':
    case 'PATCH':
        updateUserProfile($db, $user['user_id']);
        break;
    default:
        json_response(405, ['error' => 'Method not allowed']);
}

/**
 * Get user profile data
 */
function getUserProfile($db, $userId) {
    try {
        $users = $db->select('users', ['id' => $userId], [
            'fields' => ['id', 'first_name', 'last_name', 'email', 'phone_number', 'avatar_file_id', 'created_at', 'updated_at']
        ]);
        
        if (empty($users)) {
            json_response(404, ['error' => 'User not found']);
            return;
        }
        
        $user = $users[0];
        
        // Get additional profile data if needed
        $profiles = $db->select('boarder_profiles', ['user_id' => $userId]);
        $profile = !empty($profiles) ? $profiles[0] : null;
        
        // Combine user and profile data
        $userData = [
            'id' => $user['id'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'email' => $user['email'],
            'phone' => $user['phone_number'] ?? null,
            'avatar_file_id' => $user['avatar_file_id'] ?? null,
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
            'profile' => $profile
        ];
        
        json_response(200, [
            'success' => true,
            'data' => $userData
        ]);
        
    } catch (Exception $e) {
        error_log("Get user profile error: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to retrieve user profile']);
    }
}

/**
 * Update user profile data
 */
function updateUserProfile($db, $userId) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            json_response(400, ['error' => 'Invalid JSON input']);
            return;
        }
        
        // Validate and sanitize input
        $allowedFields = ['first_name', 'last_name', 'phone_number', 'avatar_file_id'];
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updateData[$field] = $input[$field];
            }
        }
        
        if (empty($updateData)) {
            json_response(400, ['error' => 'No valid fields to update']);
            return;
        }
        
        // Add updated timestamp
        $updateData['updated_at'] = date('Y-m-d H:i:s');
        
        // Update user
        $affectedRows = $db->update('users', $updateData, ['id' => $userId]);
        
        if ($affectedRows === 0) {
            json_response(404, ['error' => 'User not found or no changes made']);
            return;
        }
        
        // Get updated user data
        $users = $db->select('users', ['id' => $userId], [
            'fields' => ['id', 'first_name', 'last_name', 'email', 'phone_number', 'avatar_file_id', 'updated_at']
        ]);
        
        json_response(200, [
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => $users[0]
        ]);
        
    } catch (Exception $e) {
        error_log("Update user profile error: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to update user profile']);
    }
}
?>