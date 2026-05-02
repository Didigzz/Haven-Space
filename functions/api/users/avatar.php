<?php

/**
 * User Avatar Upload API
 * Handles user avatar image uploads
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../middleware.php';

use App\Core\Database\Database;
use App\Api\Middleware;

// CORS is handled by cors.php middleware

// Authenticate user
$user = Middleware::authenticate();
if (!$user) {
    json_response(401, ['error' => 'Unauthorized']);
    return;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
    return;
}

uploadAvatar($user['user_id']);

/**
 * Upload user avatar
 */
function uploadAvatar($userId) {
    try {
        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            json_response(400, ['error' => 'No valid file uploaded']);
            return;
        }
        
        $file = $_FILES['avatar'];
        
        // Validate file size (max 2MB)
        if ($file['size'] > 2 * 1024 * 1024) {
            json_response(400, ['error' => 'File size must be less than 2MB']);
            return;
        }
        
        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        // Get MIME type - use fileinfo if available, otherwise fall back to uploaded type
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
        } else {
            // Fallback: use the uploaded MIME type and validate extension
            $mimeType = $file['type'];
        }
        
        // Validate extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $allowedExtensions)) {
            json_response(400, ['error' => 'Invalid file extension. Only JPG, PNG, GIF, and WebP are allowed']);
            return;
        }
        
        // Validate MIME type
        if (!in_array($mimeType, $allowedTypes)) {
            json_response(400, ['error' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed']);
            return;
        }
        
        // Create uploads directory if it doesn't exist (in client folder for web access)
        $uploadDir = __DIR__ . '/../../../client/uploads/avatars/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $filename = 'avatar_' . $userId . '_' . time() . '.' . $extension;
        $filepath = $uploadDir . $filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            json_response(500, ['error' => 'Failed to save uploaded file']);
            return;
        }
        
        // Update user avatar in database by creating a file record
        $db = Database::getInstance();
        $avatarUrl = '/uploads/avatars/' . $filename;
        
        // Create file record
        $stmt = $db->prepare("INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$avatarUrl, $filename, $file['size'], $mimeType, $userId]);
        $fileId = $db->lastInsertId();
        
        // Update user's avatar_file_id
        $stmt = $db->prepare("UPDATE users SET avatar_file_id = ?, updated_at = NOW() WHERE id = ?");
        $result = $stmt->execute([$fileId, $userId]);
        
        if (!$result) {
            // Clean up uploaded file and file record if database update fails
            unlink($filepath);
            $db->prepare("DELETE FROM files WHERE id = ?")->execute([$fileId]);
            json_response(500, ['error' => 'Failed to update avatar']);
            return;
        }
        
        json_response(200, [
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => $avatarUrl
        ]);
        
    } catch (Exception $e) {
        error_log("Error uploading avatar: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to upload avatar']);
    }
}