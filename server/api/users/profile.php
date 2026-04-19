<?php

/**
 * User Profile API Endpoints
 * Handles user profile data updates
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../middleware.php';

use App\Core\Database;
use App\Api\Middleware;

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authenticate user
$user = Middleware::authenticate();
if (!$user) {
    json_response(401, ['error' => 'Unauthorized']);
    return;
}

$method = $_SERVER['REQUEST_METHOD'];
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        getUserProfile($db, $user['id']);
        break;
    case 'PUT':
    case 'PATCH':
        updateUserProfile($db, $user['id']);
        break;
    default:
        json_response(405, ['error' => 'Method not allowed']);
}

/**
 * Get user profile data
 */
function getUserProfile($db, $userId) {
    try {
        $stmt = $db->prepare("
            SELECT 
                id, first_name, last_name, email, phone, alt_phone,
                date_of_birth, gender, bio, current_address, avatar_url,
                employment_status, company_name, job_title, monthly_income,
                work_schedule, company_address,
                emergency_contact_name, emergency_contact_relationship,
                emergency_contact_phone, emergency_contact_alt_phone,
                emergency_contact_address,
                created_at, updated_at
            FROM users 
            WHERE id = ? AND deleted_at IS NULL
        ");
        
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            json_response(404, ['error' => 'User not found']);
            return;
        }
        
        json_response(200, ['user' => $user]);
        
    } catch (Exception $e) {
        error_log("Error fetching user profile: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to fetch profile']);
    }
}

/**
 * Update user profile data
 */
function updateUserProfile($db, $userId) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            json_response(400, ['error' => 'Invalid JSON data']);
            return;
        }
        
        // Define allowed fields for update
        $allowedFields = [
            'first_name', 'last_name', 'phone', 'alt_phone',
            'date_of_birth', 'gender', 'bio', 'current_address',
            'employment_status', 'company_name', 'job_title', 
            'monthly_income', 'work_schedule', 'company_address',
            'emergency_contact_name', 'emergency_contact_relationship',
            'emergency_contact_phone', 'emergency_contact_alt_phone',
            'emergency_contact_address'
        ];
        
        // Build dynamic update query
        $updateFields = [];
        $values = [];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                $updateFields[] = "$field = ?";
                $values[] = $input[$field];
            }
        }
        
        if (empty($updateFields)) {
            json_response(400, ['error' => 'No valid fields to update']);
            return;
        }
        
        // Add updated_at and user ID
        $updateFields[] = "updated_at = NOW()";
        $values[] = $userId;
        
        $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ? AND deleted_at IS NULL";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute($values);
        
        if (!$result) {
            json_response(500, ['error' => 'Failed to update profile']);
            return;
        }
        
        // Fetch updated user data
        $stmt = $db->prepare("
            SELECT 
                id, first_name, last_name, email, phone, alt_phone,
                date_of_birth, gender, bio, current_address, avatar_url,
                employment_status, company_name, job_title, monthly_income,
                work_schedule, company_address,
                emergency_contact_name, emergency_contact_relationship,
                emergency_contact_phone, emergency_contact_alt_phone,
                emergency_contact_address,
                created_at, updated_at
            FROM users 
            WHERE id = ? AND deleted_at IS NULL
        ");
        
        $stmt->execute([$userId]);
        $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        json_response(200, [
            'message' => 'Profile updated successfully',
            'user' => $updatedUser
        ]);
        
    } catch (Exception $e) {
        error_log("Error updating user profile: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to update profile']);
    }
}