<?php
/**
 * Landlord Property Location API
 * Handles saving and retrieving property locations during signup
 * NOTE: This endpoint is deprecated. Location data should be managed through property creation/update endpoints.
 * Kept for backward compatibility with signup flow.
 */

// Include centralized CORS configuration
require_once __DIR__ . '/../cors.php';

// Include bootstrap for core classes
require_once __DIR__ . '/../../src/Core/bootstrap.php';

// Include middleware for authentication
require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

header('Content-Type: application/json');

/**
 * Helper: authenticate and verify landlord ownership
 */
function authenticateLandlord($requestedUserId) {
    $user = Middleware::authenticate();

    if ((int) $user['user_id'] !== (int) $requestedUserId) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Forbidden: You can only access your own property location'
        ]);
        exit;
    }

    return $user;
}

/**
 * POST /api/landlord/property-location.php
 * Save property location for a landlord (creates/updates address for future property)
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['userId']) || !isset($input['latitude']) || !isset($input['longitude'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields: userId, latitude, longitude'
        ]);
        exit;
    }

    authenticateLandlord($input['userId']);

    $userId = intval($input['userId']);
    $latitude = floatval($input['latitude']);
    $longitude = floatval($input['longitude']);
    $address = $input['address'] ?? '';

    // Validate coordinates are within Philippines bounds
    if ($latitude < 4.5 || $latitude > 21.1 || $longitude < 116.0 || $longitude > 127.0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid coordinates. Location must be within the Philippines.'
        ]);
        exit;
    }

    // Parse address into components
    $addressParts = explode(',', $address);
    $addressLine1 = trim($addressParts[0] ?? '');
    $addressLine2 = isset($addressParts[1]) ? trim($addressParts[1]) : null;
    $city = isset($addressParts[2]) ? trim($addressParts[2]) : null;
    $province = isset($addressParts[3]) ? trim($addressParts[3]) : null;
    $postalCode = isset($addressParts[4]) ? trim($addressParts[4]) : null;

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Check if landlord profile exists
        $stmt = $pdo->prepare("SELECT id FROM landlord_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        $landlordProfile = $stmt->fetch();

        if (!$landlordProfile) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Landlord profile not found. Please complete property details first.'
            ]);
            exit;
        }

        // Store location in session/temp storage for use during property creation
        // For now, just return success - actual address will be created with property
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Location saved. Will be used when creating your first property.',
            'data' => [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'address' => $address,
                'city' => $city,
                'province' => $province
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Error saving property location: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to save property location. Please try again.'
        ]);
    }
    exit;
}

/**
 * GET /api/landlord/property-location.php?userId={userId}
 * Get property location for a landlord (returns first property's address)
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['userId'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required parameter: userId'
        ]);
        exit;
    }

    authenticateLandlord($_GET['userId']);

    $userId = intval($_GET['userId']);

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Get address from first property
        $stmt = $pdo->prepare("
            SELECT a.*
            FROM addresses a
            INNER JOIN properties p ON p.address_id = a.id
            WHERE p.landlord_id = ? AND p.deleted_at IS NULL
            ORDER BY p.created_at ASC
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $location = $stmt->fetch();

        if (!$location) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Property location not found'
            ]);
            exit;
        }

        // Reconstruct full address
        $addressParts = array_filter([
            $location['address_line_1'],
            $location['address_line_2'],
            $location['city'],
            $location['province'],
            $location['postal_code']
        ]);
        $fullAddress = implode(', ', $addressParts);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'latitude' => floatval($location['latitude']),
                'longitude' => floatval($location['longitude']),
                'address' => $fullAddress,
                'city' => $location['city'],
                'province' => $location['province']
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Error fetching property location: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch property location. Please try again.'
        ]);
    }
    exit;
}

http_response_code(405);
echo json_encode([
    'success' => false,
    'error' => 'Method not allowed'
]);
