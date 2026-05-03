<?php
/**
 * Boarder - Get Landlord Payment Information
 * Returns the landlord's payment methods for the authenticated boarder
 */

// Include centralized CORS configuration
require_once __DIR__ . '/../cors.php';

// Include database configuration
if (!function_exists('getDB')) {
    require_once __DIR__ . '/../../config/database.php';
}

// Include middleware for authentication
require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;

header('Content-Type: application/json');

/**
 * GET /api/boarder/landlord-payment-info.php
 * Get landlord's payment methods for the authenticated boarder
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Authenticate boarder
    $user = Middleware::authenticate();

    try {
        $db = getDB();

        // Get boarder's application to find their landlord
        $stmt = $db->prepare("
            SELECT 
                a.landlord_id,
                lp.boarding_house_name,
                u.first_name as landlord_first_name,
                u.last_name as landlord_last_name
            FROM applications a
            INNER JOIN landlord_profiles lp ON a.landlord_id = lp.id
            INNER JOIN users u ON lp.user_id = u.id
            WHERE a.boarder_id = (SELECT id FROM boarder_profiles WHERE user_id = ?)
                AND a.status = 'confirmed'
                AND a.deleted_at IS NULL
            LIMIT 1
        ");
        $stmt->execute([$user['user_id']]);
        $application = $stmt->fetch();

        if (!$application) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'No active rental found. You must have a confirmed application to view payment information.'
            ]);
            exit;
        }

        $landlordId = $application['landlord_id'];

        // Get landlord's payment methods (only primary or all active methods)
        $stmt = $db->prepare("
            SELECT 
                id,
                method_type,
                account_number,
                account_name,
                bank_name,
                is_primary,
                is_verified
            FROM payment_methods_landlord
            WHERE landlord_id = ?
            ORDER BY is_primary DESC, created_at DESC
        ");
        $stmt->execute([$landlordId]);
        $paymentMethods = $stmt->fetchAll();

        if (empty($paymentMethods)) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'No payment methods configured by landlord. Please contact your landlord.'
            ]);
            exit;
        }

        // Format payment methods for boarder display
        $methods = array_map(function($method) {
            return [
                'id' => $method['id'],
                'methodType' => $method['method_type'],
                'accountNumber' => $method['account_number'], // Full number for boarder to pay
                'accountName' => $method['account_name'],
                'bankName' => $method['bank_name'],
                'isPrimary' => boolval($method['is_primary']),
                'isVerified' => boolval($method['is_verified'])
            ];
        }, $paymentMethods);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'landlord' => [
                    'name' => trim($application['landlord_first_name'] . ' ' . $application['landlord_last_name']),
                    'propertyName' => $application['boarding_house_name']
                ],
                'paymentMethods' => $methods
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Error fetching landlord payment info: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch payment information. Please try again.'
        ]);
    }
    exit;
}

// Method not allowed
http_response_code(405);
echo json_encode([
    'success' => false,
    'error' => 'Method not allowed'
]);
