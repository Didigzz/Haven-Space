<?php
/**
 * Payment Methods API
 * GET    /api/payments/methods          - Get saved payment methods for current user
 * POST   /api/payments/methods          - Add a new payment method
 * PATCH  /api/payments/methods/{id}/default - Set a method as default
 * DELETE /api/payments/methods/{id}     - Remove a payment method
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Authenticate user
$user = Middleware::authenticate();
$userId = $user['user_id'];

$method = $_SERVER['REQUEST_METHOD'];

/**
 * Map method_type to a UI icon name.
 */
function methodTypeToIcon(string $type): string
{
    return match (strtolower($type)) {
        'gcash'  => 'phone',
        'bank'   => 'server',
        'card'   => 'creditCard',
        default  => 'creditCard',
    };
}

// ------------------------------------------------------------------
// GET - List payment methods
// ------------------------------------------------------------------
if ($method === 'GET') {
    try {
        $pdo = Connection::getInstance()->getPdo();

        $stmt = $pdo->prepare(
            'SELECT id, method_type, name, last_four, is_default, created_at
               FROM boarder_payment_methods
              WHERE user_id = :user_id
           ORDER BY is_default DESC, created_at ASC'
        );
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = array_map(function (array $row): array {
            return [
                'id'        => (int) $row['id'],
                'type'      => $row['method_type'],
                'name'      => $row['name'],
                'last_four' => $row['last_four'],
                'is_default'=> (bool) $row['is_default'],
                'icon'      => methodTypeToIcon($row['method_type']),
            ];
        }, $rows);

        json_response(200, ['success' => true, 'data' => $data]);

    } catch (Exception $e) {
        error_log('Get payment methods error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to load payment methods']);
    }
}

// ------------------------------------------------------------------
// POST - Add a new payment method
// ------------------------------------------------------------------
if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($input['type']) || empty($input['name'])) {
            json_response(400, ['error' => 'Missing required fields: type, name']);
        }

        $type      = trim($input['type']);
        $name      = trim($input['name']);
        $lastFour  = trim($input['last_four'] ?? '');
        $isDefault = !empty($input['is_default']);

        $pdo = Connection::getInstance()->getPdo();

        // If this new method is the default, clear all existing defaults first
        if ($isDefault) {
            $clear = $pdo->prepare(
                'UPDATE boarder_payment_methods SET is_default = 0 WHERE user_id = :user_id'
            );
            $clear->execute([':user_id' => $userId]);
        }

        $insert = $pdo->prepare(
            'INSERT INTO boarder_payment_methods (user_id, method_type, name, last_four, is_default)
             VALUES (:user_id, :method_type, :name, :last_four, :is_default)'
        );
        $insert->execute([
            ':user_id'     => $userId,
            ':method_type' => $type,
            ':name'        => $name,
            ':last_four'   => $lastFour,
            ':is_default'  => $isDefault ? 1 : 0,
        ]);

        $newId = (int) $pdo->lastInsertId();

        json_response(201, [
            'success' => true,
            'message' => 'Payment method added successfully',
            'data'    => [
                'id'        => $newId,
                'type'      => $type,
                'name'      => $name,
                'last_four' => $lastFour,
                'is_default'=> $isDefault,
                'icon'      => methodTypeToIcon($type),
            ],
        ]);

    } catch (Exception $e) {
        error_log('Add payment method error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to add payment method']);
    }
}

// ------------------------------------------------------------------
// PATCH - Set a payment method as default  (/api/payments/methods/{id}/default)
// ------------------------------------------------------------------
if ($method === 'PATCH') {
    $uri = $_SERVER['REQUEST_URI'];

    if (strpos($uri, '/default') !== false) {
        try {
            // Extract the numeric method ID from the path
            // URL shape: /api/payments/methods/5/default
            $pathParts = explode('/', trim(parse_url($uri, PHP_URL_PATH), '/'));
            // Remove the trailing 'default' segment to get the id
            $defaultSeg = array_pop($pathParts);   // 'default'
            $methodId   = intval(end($pathParts));  // numeric id

            if ($methodId <= 0) {
                json_response(400, ['error' => 'Invalid payment method ID']);
            }

            $pdo = Connection::getInstance()->getPdo();

            // Clear all defaults for this user
            $clear = $pdo->prepare(
                'UPDATE boarder_payment_methods SET is_default = 0 WHERE user_id = :user_id'
            );
            $clear->execute([':user_id' => $userId]);

            // Set the requested method as default (must belong to this user)
            $set = $pdo->prepare(
                'UPDATE boarder_payment_methods
                    SET is_default = 1
                  WHERE id = :id AND user_id = :user_id'
            );
            $set->execute([':id' => $methodId, ':user_id' => $userId]);

            if ($set->rowCount() === 0) {
                json_response(404, ['error' => 'Payment method not found']);
            }

            json_response(200, ['success' => true, 'message' => 'Default payment method updated']);

        } catch (Exception $e) {
            error_log('Set default payment method error: ' . $e->getMessage());
            json_response(500, ['error' => 'Failed to update default payment method']);
        }
    }
}

// ------------------------------------------------------------------
// DELETE - Remove a payment method
// ------------------------------------------------------------------
if ($method === 'DELETE') {
    try {
        // Extract numeric id from the last path segment
        $pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
        $methodId  = intval(end($pathParts));

        if ($methodId <= 0) {
            json_response(400, ['error' => 'Invalid payment method ID']);
        }

        $pdo = Connection::getInstance()->getPdo();

        $stmt = $pdo->prepare(
            'DELETE FROM boarder_payment_methods WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute([':id' => $methodId, ':user_id' => $userId]);

        if ($stmt->rowCount() === 0) {
            json_response(404, ['error' => 'Payment method not found']);
        }

        json_response(200, ['success' => true, 'message' => 'Payment method removed successfully']);

    } catch (Exception $e) {
        error_log('Delete payment method error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to remove payment method']);
    }
}

// ------------------------------------------------------------------
// Fallback - Method Not Allowed
// ------------------------------------------------------------------
json_response(405, ['error' => 'Method not allowed']);
