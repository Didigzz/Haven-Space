<?php
/**
 * Landlord Properties API
 * GET /api/landlord/properties.php - Returns all properties for the logged-in landlord
 * GET /api/landlord/properties.php?id=X - Returns single property details
 * POST /api/landlord/properties.php - Create a new property listing
 * DELETE /api/landlord/properties.php?id=X - Delete a property (soft delete)
 *
 * Returns all properties for the logged-in landlord with:
 * - Property details
 * - Room counts (total, occupied)
 * - Monthly revenue
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Handle POST request - Create new property
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($input['propertyName']) || !isset($input['propertyAddress']) || !isset($input['propertyPrice'])) {
        json_response(400, ['error' => 'Missing required fields: propertyName, propertyAddress, propertyPrice']);
    }

    try {
        $pdo = Connection::getInstance()->getPdo();

        // First insert address
        $addressStmt = $pdo->prepare("
            INSERT INTO addresses 
            (address_line_1, city, province, country, latitude, longitude, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        $status = isset($input['propertyStatus']) ? $input['propertyStatus'] : 'available';
        $latitude = isset($input['propertyLatitude']) && $input['propertyLatitude'] !== '' ? floatval($input['propertyLatitude']) : null;
        $longitude = isset($input['propertyLongitude']) && $input['propertyLongitude'] !== '' ? floatval($input['propertyLongitude']) : null;
        $city = isset($input['propertyCity']) ? $input['propertyCity'] : 'Unknown';
        $province = isset($input['propertyProvince']) ? $input['propertyProvince'] : 'Unknown';
        $country = isset($input['propertyCountry']) && $input['propertyCountry'] !== '' ? $input['propertyCountry'] : 'Philippines'; // Default to Philippines

        $addressStmt->execute([
            $input['propertyAddress'],
            $city,
            $province,
            $country,
            $latitude,
            $longitude
        ]);
        $addressId = $pdo->lastInsertId();

        // Insert new property with address_id
        $stmt = $pdo->prepare("\n            INSERT INTO properties \n            (landlord_id, title, description, address_id, price, status, listing_moderation_status)\n            VALUES (?, ?, ?, ?, ?, ?, 'pending_review')\n        ");

        $stmt->execute([
            $landlordId,
            $input['propertyName'],
            $input['propertyDescription'] ?? '',
            $addressId,
            floatval($input['propertyPrice']),
            $status
        ]);

        $propertyId = $pdo->lastInsertId();

        // Insert amenities if provided
        if (isset($input['amenities']) && is_array($input['amenities'])) {
            $amenityStmt = $pdo->prepare("\n                INSERT INTO amenities (property_id, amenity_name)\n                VALUES (?, ?)\n            ");

            foreach ($input['amenities'] as $amenity) {
                $amenityStmt->execute([$propertyId, $amenity]);
            }
        }

        json_response(201, [
            'success' => true,
            'data' => [
                'property_id' => $propertyId,
                'message' => 'Property created successfully'
            ]
        ]);

    } catch (Exception $e) {
        error_log('Create property error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to create property: ' . $e->getMessage()]);
    }
}

// Handle DELETE request - Delete property
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    // Get property ID from query parameter
    $propertyId = $_GET['id'] ?? null;
    
    if (!$propertyId) {
        json_response(400, ['error' => 'Property ID is required']);
    }

    try {
        $pdo = Connection::getInstance()->getPdo();

        // First, verify the property belongs to this landlord
        $checkStmt = $pdo->prepare("\n            SELECT id, title FROM properties \n            WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL\n        ");
        $checkStmt->execute([$propertyId, $landlordId]);
        $property = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$property) {
            json_response(404, ['error' => 'Property not found or access denied']);
        }

        // Begin transaction for safe deletion
        $pdo->beginTransaction();

        try {
            // Soft delete the property (set deleted_at timestamp)
            $deleteStmt = $pdo->prepare("\n                UPDATE properties \n                SET deleted_at = NOW(), status = 'deleted'\n                WHERE id = ? AND landlord_id = ?\n            ");
            $deleteStmt->execute([$propertyId, $landlordId]);

            // Also soft delete associated rooms
            $deleteRoomsStmt = $pdo->prepare("\n                UPDATE rooms \n                SET deleted_at = NOW(), status = 'deleted'\n                WHERE property_id = ?\n            ");
            $deleteRoomsStmt->execute([$propertyId]);

            // Commit the transaction
            $pdo->commit();

            json_response(200, [
                'success' => true,
                'message' => 'Property deleted successfully',
                'data' => [
                    'property_id' => intval($propertyId),
                    'property_name' => $property['title']
                ]
            ]);

        } catch (Exception $e) {
            // Rollback on error
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

    } catch (Exception $e) {
        error_log('Delete property error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to delete property: ' . $e->getMessage()]);
    }
}

// Handle GET request - List properties or get single property
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Check if requesting a single property
        $propertyId = $_GET['id'] ?? null;

        if ($propertyId) {
            // Get single property with full details
            $stmt = $pdo->prepare("\n                SELECT \n                    p.id,\n                    p.title,\n                    p.description,\n                    a.address_line_1 as address,\n                    a.latitude,\n                    a.longitude,\n                    a.city,\n                    a.province,\n                    p.price,\n                    p.deposit,\n                    p.min_stay,\n                    p.status,\n                    p.listing_moderation_status,\n                    p.created_at,\n                    COUNT(DISTINCT r.id) as rooms_count,\n                    COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms\n                FROM properties p\n                LEFT JOIN addresses a ON p.address_id = a.id\n                LEFT JOIN rooms r ON p.id = r.property_id\n                WHERE p.id = ? AND p.landlord_id = ? AND p.deleted_at IS NULL\n                GROUP BY p.id, p.title, p.description, a.address_line_1, a.latitude, a.longitude, a.city, a.province, p.price, p.deposit, p.min_stay, p.status, p.listing_moderation_status, p.created_at\n            ");
            $stmt->execute([$propertyId, $landlordId]);
            $property = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$property) {
                json_response(404, ['error' => 'Property not found']);
            }

            // Get amenities
            $amenitiesStmt = $pdo->prepare("SELECT amenity_name FROM amenities WHERE property_id = ?");
            $amenitiesStmt->execute([$propertyId]);
            $amenities = $amenitiesStmt->fetchAll(PDO::FETCH_COLUMN);

            // Get photos
            $photosStmt = $pdo->prepare("SELECT photo_url FROM property_photos WHERE property_id = ? ORDER BY display_order");
            $photosStmt->execute([$propertyId]);
            $rawPhotos = $photosStmt->fetchAll(PDO::FETCH_COLUMN);
            // Normalize bare filenames (legacy data stored without path prefix)
            $photos = array_map(function($photoUrl) use ($propertyId) {
                if ($photoUrl && !str_starts_with($photoUrl, '/') && !str_starts_with($photoUrl, 'http')) {
                    return '/storage/properties/' . $propertyId . '/' . $photoUrl;
                }
                return $photoUrl;
            }, $rawPhotos);

            // Map property_type to frontend format
            $typeMapping = [
                'Single unit' => 'boarding-house',
                'Multi-unit' => 'boarding-house',
                'Apartment' => 'apartment',
                'Dormitory' => 'dormitory',
            ];
            $type = isset($typeMapping[$property['property_type']]) 
                ? $typeMapping[$property['property_type']] 
                : 'boarding-house';

            // Map database status to frontend status
            $displayStatus = $property['status'];
            if ($displayStatus === 'available') {
                $displayStatus = 'active';
            } elseif ($displayStatus === 'hidden') {
                $displayStatus = 'inactive';
            }

            $transformedProperty = [
                'id' => intval($property['id']),
                'name' => $property['title'],
                'type' => $type,
                'description' => $property['description'] ?? '',
                'address' => $property['address'],
                'latitude' => $property['latitude'] ? floatval($property['latitude']) : '',
                'longitude' => $property['longitude'] ? floatval($property['longitude']) : '',
                'city' => $property['city'] ?? '',
                'province' => $property['province'] ?? '',
                'price' => floatval($property['price']),
                'deposit' => $property['deposit'] ? floatval($property['deposit']) : 0,
                'capacity' => '',
                'min_stay' => $property['min_stay'] ?? '',
                'availability' => 'available-now',
                'status' => $displayStatus,
                'total_rooms' => intval($property['rooms_count']),
                'rooms' => intval($property['rooms_count']),
                'occupied_rooms' => intval($property['occupied_rooms']),
                'created_at' => $property['created_at'],
                'amenities' => $amenities,
                'photos' => $photos,
            ];

            json_response(200, ['data' => $transformedProperty]);
        } else {
            // List all properties
            $stmt = $pdo->prepare("
                SELECT 
                    p.id,
                    p.title,
                    p.description,
                    a.address_line_1 as address,
                    a.city,
                    a.province,
                    a.latitude,
                    a.longitude,
                    p.price,
                    p.status,
                    p.listing_moderation_status,
                    p.created_at,
                    COUNT(DISTINCT r.id) as rooms_count,
                    COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
                    COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN r.price ELSE 0 END), 0) as monthly_revenue,
                    lp.property_type as property_type,
                    (SELECT COUNT(*) FROM applications app 
                     JOIN rooms rm ON app.room_id = rm.id 
                     WHERE rm.property_id = p.id AND app.status = 'pending' AND app.deleted_at IS NULL) as pending_applications
                FROM properties p
                LEFT JOIN addresses a ON p.address_id = a.id
                LEFT JOIN rooms r ON p.id = r.property_id
                LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
                -- property_type is now VARCHAR in landlord_profiles
                WHERE p.landlord_id = ? AND p.deleted_at IS NULL
                GROUP BY p.id, p.title, p.description, a.address_line_1, a.city, a.province, a.latitude, a.longitude, p.price, p.status, p.listing_moderation_status, p.created_at, lp.property_type
                ORDER BY p.created_at DESC
            ");
            $stmt->execute([$landlordId]);
            $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get amenities for all properties
            $propertyIds = array_column($properties, 'id');
            $amenitiesMap = [];
            $photosMap = [];
            if (!empty($propertyIds)) {
                $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
                $amenitiesStmt = $pdo->prepare("\n                    SELECT property_id, amenity_name \n                    FROM amenities\n                    WHERE property_id IN ($placeholders)\n                ");
                $amenitiesStmt->execute($propertyIds);
                $amenitiesRows = $amenitiesStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($amenitiesRows as $row) {
                    if (!isset($amenitiesMap[$row['property_id']])) {
                        $amenitiesMap[$row['property_id']] = [];
                    }
                    $amenitiesMap[$row['property_id']][] = $row['amenity_name'];
                }

                // Get photos for all properties
                try {
                    $photosStmt = $pdo->prepare("\n                        SELECT property_id, photo_url, is_cover\n                        FROM property_photos\n                        WHERE property_id IN ($placeholders)\n                        ORDER BY property_id, display_order ASC\n                    ");
                    $photosStmt->execute($propertyIds);
                    $photosRows = $photosStmt->fetchAll(PDO::FETCH_ASSOC);
                    foreach ($photosRows as $row) {
                        $pid = $row['property_id'];
                        if (!isset($photosMap[$pid])) {
                            $photosMap[$pid] = [];
                        }
                        $photoUrl = $row['photo_url'];
                        // Normalize bare filenames (legacy data stored without path prefix)
                        if ($photoUrl && !str_starts_with($photoUrl, '/') && !str_starts_with($photoUrl, 'http')) {
                            $photoUrl = '/storage/properties/' . $pid . '/' . $photoUrl;
                        }
                        $photosMap[$pid][] = $photoUrl;
                    }
                } catch (PDOException $e) {
                    // property_photos table may not exist yet
                    error_log('Photos fetch error: ' . $e->getMessage());
                }
            }

            // Transform data for frontend
            $transformedProperties = array_map(function($property) use ($amenitiesMap, $photosMap) {
                // Use rooms_count from rooms table
                $totalRooms = intval($property['rooms_count']);
                $occupiedRooms = intval($property['occupied_rooms']);
                $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100) : 0;

                // Determine status based on occupancy
                $displayStatus = 'active';
                if ($property['listing_moderation_status'] === 'rejected') {
                    $displayStatus = 'inactive';
                } elseif ($occupancyRate === 100 && $totalRooms > 0) {
                    $displayStatus = 'full';
                }

                // Map property_type from landlord_profiles to frontend format
                $typeMapping = [
                    'Single unit' => 'boarding-house',
                    'Multi-unit' => 'boarding-house',
                    'Apartment' => 'apartment',
                    'Dormitory' => 'dormitory',
                ];
                $type = isset($typeMapping[$property['property_type']]) 
                    ? $typeMapping[$property['property_type']] 
                    : 'boarding-house';

                return [
                    'id' => intval($property['id']),
                    'name' => htmlspecialchars($property['title']),
                    'type' => $type,
                    'description' => htmlspecialchars($property['description'] ?? ''),
                    'address' => htmlspecialchars($property['address']),
                    'latitude' => $property['latitude'] ? floatval($property['latitude']) : null,
                    'longitude' => $property['longitude'] ? floatval($property['longitude']) : null,
                    'city' => htmlspecialchars($property['city'] ?? ''),
                    'province' => htmlspecialchars($property['province'] ?? ''),
                    'price' => floatval($property['price']),
                    'status' => $displayStatus,
                    'total_rooms' => $totalRooms,
                    'occupied_rooms' => $occupiedRooms,
                    'monthly_revenue' => floatval($property['monthly_revenue']),
                    'created_at' => $property['created_at'],
                    'amenities' => $amenitiesMap[$property['id']] ?? [],
                    'photos' => $photosMap[$property['id']] ?? [],
                    'pending_applications' => intval($property['pending_applications'] ?? 0),
                ];
            }, $properties);

            json_response(200, [
                'data' => [
                    'properties' => $transformedProperties,
                    'total_count' => count($transformedProperties),
                ],
            ]);
        }
    } catch (Exception $e) {
        error_log('Landlord properties API error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to load properties: ' . $e->getMessage()]);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
