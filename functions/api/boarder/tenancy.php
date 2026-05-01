<?php
/**
 * Boarder Tenancy API
 * GET /api/boarder/tenancy - Get current tenancy information for boarder
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Authenticate user and authorize as boarder
$user = Middleware::authorize(['boarder']);
$boarderId = $user['user_id'];

// Log for debugging
error_log("Tenancy API: Boarder ID $boarderId requesting tenancy information");

$method = $_SERVER['REQUEST_METHOD'];

// GET - Get current tenancy information
if ($method === 'GET') {
    try {
        $pdo = Connection::getInstance()->getPdo();

        // Get active tenancy information from accepted applications with property details
        $stmt = $pdo->prepare("
            SELECT 
                a.id as application_id,
                a.created_at as tenancy_start_date,
                DATE_ADD(a.created_at, INTERVAL 12 MONTH) as end_date,
                TIMESTAMPDIFF(MONTH, a.created_at, NOW()) as current_month,
                12 as total_months,
                DATEDIFF(DATE_ADD(a.created_at, INTERVAL 12 MONTH), NOW()) as days_until_end,
                p.id as property_id,
                p.title as property_name,
                addr.address_line_1 as address,
                r.id as room_id,
                r.title as room_title,
                r.room_number,
                r.price as monthly_rent,
                0 as outstanding_balance,
                0 as current_utilities,
                0 as electricity_cost,
                0 as water_cost,
                r.price as next_payment_amount,
                DATE_ADD(LAST_DAY(NOW()), INTERVAL 1 DAY) as next_payment_date,
                DATEDIFF(DATE_ADD(LAST_DAY(NOW()), INTERVAL 1 DAY), NOW()) as days_until_payment,
                p.house_rules,
                p.electricity_cost as property_electricity_cost,
                p.water_cost as property_water_cost,
                p.internet_cost as property_internet_cost,
                p.landlord_id,
                u.first_name as landlord_first_name,
                u.last_name as landlord_last_name,
                u.is_verified as landlord_is_verified
            FROM applications a
            JOIN rooms r ON a.room_id = r.id
            JOIN properties p ON r.property_id = p.id
            JOIN addresses addr ON p.address_id = addr.id
            JOIN users u ON p.landlord_id = u.id
            WHERE a.boarder_id = ? 
            AND a.status = 'accepted' 
            AND a.deleted_at IS NULL
            ORDER BY a.created_at DESC
            LIMIT 1
        ");
        
        $stmt->execute([$boarderId]);
        $tenancy = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tenancy) {
            error_log("Tenancy API: No accepted application found for boarder ID $boarderId");
            json_response(200, [
                'success' => true,
                'data' => null,
                'message' => 'No active tenancy found'
            ]);
            return;
        }

        error_log("Tenancy API: Found tenancy for boarder ID $boarderId - Application ID {$tenancy['application_id']}");

        // Parse house rules JSON
        $houseRules = [];
        if (!empty($tenancy['house_rules'])) {
            $houseRules = json_decode($tenancy['house_rules'], true) ?: [];
        }

        // Transform data
        $tenancyData = [
            'application_id' => intval($tenancy['application_id']),
            'property_id' => intval($tenancy['property_id']),
            'property_name' => htmlspecialchars($tenancy['property_name']),
            'address' => htmlspecialchars($tenancy['address']),
            'room_id' => intval($tenancy['room_id']),
            'room_title' => htmlspecialchars($tenancy['room_title']),
            'room_number' => $tenancy['room_number'],
            'tenancy_start_date' => $tenancy['tenancy_start_date'],
            'end_date' => $tenancy['end_date'],
            'current_month' => intval($tenancy['current_month']) + 1, // Add 1 because we're in the current month
            'total_months' => intval($tenancy['total_months']),
            'days_until_end' => intval($tenancy['days_until_end']),
            'monthly_rent' => floatval($tenancy['monthly_rent']),
            'outstanding_balance' => floatval($tenancy['outstanding_balance']),
            'current_utilities' => floatval($tenancy['current_utilities']),
            'electricity_cost' => floatval($tenancy['electricity_cost']),
            'water_cost' => floatval($tenancy['water_cost']),
            'next_payment_amount' => floatval($tenancy['next_payment_amount']),
            'next_payment_date' => $tenancy['next_payment_date'],
            'days_until_payment' => intval($tenancy['days_until_payment']),
            // Property information
            'house_rules' => $houseRules,
            'property_electricity_cost' => floatval($tenancy['property_electricity_cost'] ?? 0),
            'property_water_cost' => floatval($tenancy['property_water_cost'] ?? 0),
            'property_internet_cost' => floatval($tenancy['property_internet_cost'] ?? 0),
            // Landlord information
            'landlord' => [
                'id' => intval($tenancy['landlord_id']),
                'name' => htmlspecialchars(trim($tenancy['landlord_first_name'] . ' ' . $tenancy['landlord_last_name'])),
                'is_verified' => (bool)$tenancy['landlord_is_verified'],
                'rating' => 0 // Rating system not yet implemented
            ]
        ];

        json_response(200, [
            'success' => true,
            'data' => $tenancyData
        ]);

    } catch (Exception $e) {
        error_log('Get boarder tenancy error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to load tenancy information']);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
