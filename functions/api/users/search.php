<?php

/**
 * User Search API
 * GET /api/users/search?q={query}&role={role}
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
require_once __DIR__ . '/../cors.php';

use App\Core\Database\Connection;

// Support simulation via header
$currentUserId = (int) ($_SERVER['HTTP_X_USER_ID'] ?? 0);

$query = $_GET['q'] ?? '';
$targetRole = $_GET['role'] ?? '';

if (strlen($query) < 2) {
    json_response(200, ['data' => []]);
    exit;
}

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Search users by name, matching the target role, and excluding self
    $sql = "SELECT u.id, u.first_name, u.last_name, u.email, ur.role_name as role, f.file_url as avatar_url 
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            LEFT JOIN files f ON u.avatar_file_id = f.id
            WHERE (u.first_name LIKE :q OR u.last_name LIKE :q OR u.email LIKE :q)
            AND u.id != :current_id";
    
    if ($targetRole) {
        $sql .= " AND ur.role_name = :role";
    }
    
    $sql .= " LIMIT 10";
    
    $stmt = $pdo->prepare($sql);
    $searchTerm = "%$query%";
    $stmt->bindValue(':q', $searchTerm);
    $stmt->bindValue(':current_id', $currentUserId, PDO::PARAM_INT);
    
    if ($targetRole) {
        $stmt->bindValue(':role', $targetRole);
    }
    
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format for frontend
    $formattedUsers = array_map(function($user) {
        return [
            'id' => (int)$user['id'],
            'name' => $user['first_name'] . ' ' . $user['last_name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'avatar_url' => $user['avatar_url']
        ];
    }, $users);
    
    json_response(200, ['data' => $formattedUsers]);

} catch (Exception $e) {
    json_response(500, ['error' => 'Failed to search users: ' . $e->getMessage()]);
}
