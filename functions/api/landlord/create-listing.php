<?php
/**
 * Landlord Create Listing API
 * POST /api/landlord/listings
 *
 * Creates a new property listing for the authenticated landlord
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

// Authenticate user and authorize as landlord
$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    // Try FormData
    $input = $_POST;
}

// Validate required fields
$requiredFields = [
    'propertyName',
    'propertyType',
    'propertyDescription',
    'propertyPrice',
    'propertyDeposit',
    'propertyRooms',
    'propertyCapacity',
    'propertyAddress',
    'propertyCity',
    'propertyProvince',
];

$errors = [];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        $errors[$field] = ucfirst(str_replace('property', '', $field)) . ' is required';
    }
}

if (!empty($errors)) {
    json_response(400, ['errors' => $errors]);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Begin transaction
    $pdo->beginTransaction();

    // First, insert the address into the addresses table
    $addressStmt = $pdo->prepare("
        INSERT INTO addresses (
            address_line_1,
            city,
            province,
            country,
            latitude,
            longitude,
            created_at,
            updated_at
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            NOW(),
            NOW()
        )
    ");

    $propertyAddress = trim($input['propertyAddress']);
    $propertyCity = trim($input['propertyCity']);
    $propertyProvince = trim($input['propertyProvince']);
    $countryId = !empty($input['propertyCountryId']) ? intval($input['propertyCountryId']) : 1; // Default to Philippines
    $latitude = !empty($input['propertyLatitude']) ? floatval($input['propertyLatitude']) : null;
    $longitude = !empty($input['propertyLongitude']) ? floatval($input['propertyLongitude']) : null;

    $addressStmt->execute([
        $propertyAddress,
        $propertyCity,
        $propertyProvince,
        $countryId,
        $latitude,
        $longitude,
    ]);

    $addressId = $pdo->lastInsertId();

    // Insert property with address_id
    $stmt = $pdo->prepare("
        INSERT INTO properties (
            landlord_id,
            title,
            description,
            address_id,
            price,
            deposit,
            min_stay,
            house_rules,
            status,
            listing_moderation_status,
            created_at,
            updated_at
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            'available',
            'published',
            NOW(),
            NOW()
        )
    ");

    $propertyName = trim($input['propertyName']);
    $propertyDescription = trim($input['propertyDescription']);
    $price = floatval($input['propertyPrice']);
    $deposit = isset($input['propertyDeposit']) ? strval($input['propertyDeposit']) : '0';
    $minStay = isset($input['propertyMinStay']) ? strval($input['propertyMinStay']) : '1 month';
    $houseRules = json_encode([]); // Default empty JSON array

    $stmt->execute([
        $landlordId,
        $propertyName,
        $propertyDescription,
        $addressId,
        $price,
        $deposit,
        $minStay,
        $houseRules,
    ]);

    $propertyId = $pdo->lastInsertId();

    // Photos are uploaded via a separate POST /api/landlord/listings/{id}/photos request
    // after the property is created (see listing-photos.php)

    // Create rooms for the property
    // Check if custom rooms data is provided from frontend
    $customRooms = isset($input['rooms']) && is_array($input['rooms']) ? $input['rooms'] : [];
    
    if (!empty($customRooms)) {
        // Use custom room data from frontend
        $roomStmt = $pdo->prepare("
            INSERT INTO rooms (
                property_id,
                landlord_id,
                title,
                price,
                description,
                status,
                room_number,
                room_type,
                capacity,
                created_at,
                updated_at
            ) VALUES (
                ?, ?, ?, ?, '', 'available', ?, ?, ?, NOW(), NOW()
            )
        ");

        foreach ($customRooms as $index => $roomData) {
            $roomName = isset($roomData['name']) && trim($roomData['name']) !== '' 
                ? trim($roomData['name']) 
                : "Room " . ($index + 1);
            
            $roomCapacity = isset($roomData['capacity']) ? intval($roomData['capacity']) : 1;
            $roomPrice = floatval($input['propertyPrice']);
            
            // Determine room type based on capacity
            $roomType = $roomCapacity === 1 ? 'single' : 'shared';
            
            $roomStmt->execute([
                $propertyId,
                $landlordId,
                $roomName,
                $roomPrice,
                $roomName, // room_number uses the custom name
                $roomType,
                $roomCapacity
            ]);
        }
    } else {
        // Fallback to old behavior if no custom rooms data provided
        $roomsCount = intval($input['propertyRooms']);
        $roomCapacity = intval($input['propertyCapacity']);
        $roomPrice = floatval($input['propertyPrice']);
        
        // Determine room type based on capacity
        $roomType = $roomCapacity === 1 ? 'single' : 'shared';
        $roomTypeDisplay = $roomCapacity === 1 ? 'Single Room' : "Shared Room ({$roomCapacity} persons)";
        
        if ($roomsCount > 0) {
            $roomStmt = $pdo->prepare("
                INSERT INTO rooms (
                    property_id,
                    landlord_id,
                    title,
                    price,
                    description,
                    status,
                    room_number,
                    room_type,
                    capacity,
                    created_at,
                    updated_at
                ) VALUES (
                    ?, ?, ?, ?, '', 'available', ?, ?, ?, NOW(), NOW()
                )
            ");

            for ($i = 1; $i <= $roomsCount; $i++) {
                $roomNumber = "Room {$i}";
                $roomTitle = "{$roomTypeDisplay} - {$roomNumber}";
                
                $roomStmt->execute([
                    $propertyId,
                    $landlordId,
                    $roomTitle,
                    $roomPrice,
                    $roomNumber,
                    $roomType,
                    $roomCapacity
                ]);
            }
        }
    }

    // Commit transaction
    $pdo->commit();

    json_response(201, [
        'message' => 'Listing created successfully',
        'data' => [
            'id' => $propertyId,
            'title' => $propertyName,
            'status' => 'available',
        ],
    ]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Create listing error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to create listing. Please try again.']);
}