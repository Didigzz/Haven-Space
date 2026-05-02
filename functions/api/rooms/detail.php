<?php
/**
 * Public Room Detail API
 * GET /api/rooms/detail?id={propertyId}
 * 
 * Returns detailed information for a single property (no authentication required)
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../../src/Core/Database/Connection.php';

use App\Core\Database\Connection;

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Get property ID from query parameter
    $propertyId = $_GET['id'] ?? null;

    if (!$propertyId) {
        json_response(400, ['error' => 'Property ID is required']);
    }

    // Fetch property details
    $query = "
        SELECT 
            p.id,
            p.title,
            p.description,
            p.property_type,
            a.address_line_1 as address,
            a.latitude,
            a.longitude,
            p.price,
            p.listing_moderation_status,
            p.created_at,
            p.landlord_id,
            p.deposit,
            p.advance,
            p.min_stay,
            p.house_rules,
            p.gender_preference,
            p.property_rules,
            a.city,
            a.province,
            u.first_name as landlord_first_name,
            u.last_name as landlord_last_name
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN users u ON p.landlord_id = u.id
        WHERE p.id = ? 
          AND p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$property) {
        json_response(404, ['error' => 'Property not found']);
    }

    // Get property details (amenities, city, province, etc.)
    $amenities = [];
    $city = '';
    $province = '';
    $propertyType = '';
    $deposit = '';
    $minStay = '';
    $capacity = '';
    $availabilityStatus = '';
    $propertyTotalRooms = 0;
    $houseRules = [];
    $genderPreference = '';
    $propertyRules = '';
    
    // Get amenities
    try {
        $amenityStmt = $pdo->prepare("
            SELECT amenity_name FROM amenities WHERE property_id = ?
        ");
        $amenityStmt->execute([$propertyId]);
        $amenityRows = $amenityStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($amenityRows as $row) {
            $amenities[] = $row['amenity_name'];
        }
    } catch (PDOException $e) {
        error_log('Property amenities fetch error: ' . $e->getMessage());
    }
    
    // Get details from properties table (deposit, min_stay, house_rules, gender_preference, property_rules)
    $city = $property['city'] ?? '';
    $province = $property['province'] ?? '';
    $deposit = $property['deposit'] ?? '';
    $advance = $property['advance'] ?? 'None'; // Default to None if not set
    $minStay = $property['min_stay'] ?? '';
    $houseRules = [];
    if (!empty($property['house_rules'])) {
        $houseRules = json_decode($property['house_rules'], true) ?: [];
    }
    $genderPreference = $property['gender_preference'] ?? 'any';
    $propertyRules = $property['property_rules'] ?? '';
    
    // Get property type from properties table
    $propertyType = $property['property_type'] ?? 'boarding-house';
    
    // Get gender preference and property rules
    try {
        $detailsStmt = $pdo->prepare("
            SELECT gender_preference, property_rules 
            FROM properties 
            WHERE id = ?
        ");
        $detailsStmt->execute([$propertyId]);
        $details = $detailsStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($details) {
            $genderPreference = $details['gender_preference'] ?? 'any';
            $propertyRules = $details['property_rules'] ?? '';
        }
    } catch (PDOException $e) {
        error_log('Property details fetch error: ' . $e->getMessage());
        $genderPreference = 'any';
        $propertyRules = '';
    }

    // Get all property photos
    $images = [];
    $coverImage = '/assets/images/placeholder-room.svg';
    
    try {
        $photoStmt = $pdo->prepare("
            SELECT photo_url, is_cover 
            FROM property_photos 
            WHERE property_id = ? 
            ORDER BY is_cover DESC, id ASC
        ");
        $photoStmt->execute([$propertyId]);
        $photos = $photoStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($photos as $photo) {
            if (!empty($photo['photo_url'])) {
                $images[] = $photo['photo_url'];
                if ($photo['is_cover']) {
                    $coverImage = $photo['photo_url'];
                }
            }
        }
        
        // If no images found, use placeholder
        if (empty($images)) {
            $images[] = $coverImage;
        }
    } catch (PDOException $e) {
        // property_photos table doesn't exist
        $images[] = $coverImage;
    }

    // Get available rooms for this property
    $rooms = [];
    try {
        // First, try the new schema with room_number, room_type, capacity, description, size
        $roomStmt = $pdo->prepare("
            SELECT 
                id,
                room_number,
                room_type,
                price,
                deposit,
                status,
                capacity,
                description,
                size
            FROM rooms 
            WHERE property_id = ? 
              AND deleted_at IS NULL
            ORDER BY room_type, price
        ");
        $roomStmt->execute([$propertyId]);
        $rooms = $roomStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Fetch photos for each room
        foreach ($rooms as &$room) {
            $roomPhotos = [];
            try {
                $photoStmt = $pdo->prepare("
                    SELECT photo_url, is_cover 
                    FROM room_photos 
                    WHERE room_id = ? 
                    ORDER BY is_cover DESC, display_order ASC, id ASC
                ");
                $photoStmt->execute([$room['id']]);
                $photos = $photoStmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($photos as $photo) {
                    if (!empty($photo['photo_url'])) {
                        $roomPhotos[] = $photo['photo_url'];
                    }
                }
            } catch (PDOException $e) {
                error_log('Room photos fetch error: ' . $e->getMessage());
            }
            
            $room['photos'] = $roomPhotos;
        }
        unset($room); // Break reference
    } catch (PDOException $e) {
        // If columns don't exist, try the old schema
        error_log('Rooms fetch error (trying old schema): ' . $e->getMessage());
        try {
            $roomStmt = $pdo->prepare("
                SELECT 
                    id,
                    title as room_type,
                    price,
                    status
                FROM rooms 
                WHERE property_id = ?
                ORDER BY price
            ");
            $roomStmt->execute([$propertyId]);
            $roomsOld = $roomStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Transform old schema to new format
            foreach ($roomsOld as $room) {
                $rooms[] = [
                    'id' => $room['id'],
                    'room_number' => 'N/A',
                    'room_type' => $room['room_type'],
                    'price' => $room['price'],
                    'status' => $room['status'],
                    'capacity' => 1,
                    'description' => null,
                    'size' => null,
                    'photos' => [],
                ];
            }
        } catch (PDOException $e2) {
            error_log('Rooms fetch error (old schema): ' . $e2->getMessage());
        }
    }

    // Get landlord profile info
    $landlordProperties = 0;
    $landlordRating = 0;
    
    try {
        $landlordStmt = $pdo->prepare("
            SELECT COUNT(*) as property_count
            FROM properties 
            WHERE landlord_id = ? 
              AND deleted_at IS NULL
              AND listing_moderation_status = 'published'
        ");
        $landlordStmt->execute([$property['landlord_id']]);
        $landlordData = $landlordStmt->fetch(PDO::FETCH_ASSOC);
        $landlordProperties = $landlordData['property_count'] ?? 0;
        
        // TODO: Calculate actual landlord rating from reviews
        $landlordRating = 4.7;
    } catch (PDOException $e) {
        error_log('Landlord info fetch error: ' . $e->getMessage());
    }

    // Determine badges
    $badges = [];
    if ($property['listing_moderation_status'] === 'published') {
        $badges[] = 'verified';
    }
    
    // Check if newly created (within last 7 days)
    if (!empty($property['created_at'])) {
        $createdAt = new DateTime($property['created_at']);
        $now = new DateTime();
        $daysDiff = $now->diff($createdAt)->days;
        if ($daysDiff <= 7) {
            $badges[] = 'new';
        }
    }

    // Build room types string
    $roomTypes = [];
    foreach ($rooms as $room) {
        if (!in_array($room['room_type'], $roomTypes)) {
            $roomTypes[] = $room['room_type'];
        }
    }
    $roomTypesString = !empty($roomTypes) ? implode(' & ', $roomTypes) : 'Available';

    // Calculate availability
    $availableRooms = 0;
    foreach ($rooms as $room) {
        if ($room['status'] === 'available') {
            $availableRooms++;
        }
    }
    
    $totalRooms = count($rooms);
    
    // Determine availability text based on availabilityStatus or room availability
    $availability = 'Contact for details';
    if (!empty($availabilityStatus)) {
        switch ($availabilityStatus) {
            case 'available-now':
                $availability = 'Available Now';
                break;
            case 'available-soon':
                $availability = 'Available Soon';
                break;
            case 'by-appointment':
                $availability = 'By Appointment';
                break;
            default:
                $availability = $availabilityStatus;
        }
    } elseif ($availableRooms > 0) {
        $availability = 'Available Now';
    } elseif (count($rooms) > 0) {
        $availability = 'No rooms available';
    }
    
    // Determine room type display based on capacity
    $roomTypeDisplay = $roomTypesString;
    if (!empty($capacity)) {
        if ($capacity === '1') {
            $roomTypeDisplay = 'Single Room';
        } elseif ($capacity === '2') {
            $roomTypeDisplay = 'Shared (2 persons)';
        } elseif ($capacity === '3') {
            $roomTypeDisplay = 'Shared (3 persons)';
        } elseif ($capacity === '4') {
            $roomTypeDisplay = 'Shared (4 persons)';
        } elseif ($capacity === '5+') {
            $roomTypeDisplay = 'Shared (5+ persons)';
        }
    }

    // Build response
    $response = [
        'id' => intval($property['id']),
        'title' => htmlspecialchars($property['title']),
        'description' => htmlspecialchars($property['description'] ?? ''),
        'address' => htmlspecialchars($property['address']),
        'city' => htmlspecialchars($city),
        'province' => htmlspecialchars($province),
        'price' => floatval($property['price']),
        'latitude' => $property['latitude'] ? floatval($property['latitude']) : null,
        'longitude' => $property['longitude'] ? floatval($property['longitude']) : null,
        'propertyType' => htmlspecialchars($propertyType),
        'deposit' => htmlspecialchars($deposit),
        'advance' => htmlspecialchars($advance),
        'minStay' => htmlspecialchars($minStay),
        'capacity' => htmlspecialchars($capacity),
        'availabilityStatus' => htmlspecialchars($availabilityStatus),
        'rating' => 4.5, // TODO: Calculate from actual reviews
        'reviews' => 0, // TODO: Get actual review count
        'roomTypes' => $roomTypeDisplay,
        'availability' => $availability,
        'availableRooms' => $availableRooms,
        'totalRooms' => $totalRooms,
        'amenities' => $amenities,
        'houseRules' => $houseRules,
        'genderPreference' => $genderPreference,
        'propertyRules' => $propertyRules,
        'images' => $images,
        'coverImage' => $coverImage,
        'badges' => $badges,
        'rooms' => array_map(function($room) {
            return [
                'id' => intval($room['id']),
                'roomNumber' => htmlspecialchars($room['room_number'] ?? 'N/A'),
                'roomType' => htmlspecialchars($room['room_type'] ?? 'Room'),
                'price' => floatval($room['price']),
                'deposit' => floatval($room['deposit'] ?? 0),
                'status' => htmlspecialchars($room['status']),
                'capacity' => intval($room['capacity'] ?? 1),
                'description' => htmlspecialchars($room['description'] ?? ''),
                'size' => $room['size'] ? floatval($room['size']) : null,
                'images' => $room['photos'] ?? [],
                'furnishing' => 'Not specified', // TODO: Add furnishing column to rooms table
            ];
        }, $rooms),
        'landlord' => [
            'id' => intval($property['landlord_id']),
            'name' => htmlspecialchars(trim(($property['landlord_first_name'] ?? '') . ' ' . ($property['landlord_last_name'] ?? ''))),
            'properties' => $landlordProperties,
            'rating' => $landlordRating,
        ],
        'createdAt' => $property['created_at'],
    ];

    json_response(200, ['data' => $response]);

} catch (Exception $e) {
    error_log('Property detail API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to load property details', 'debug' => $e->getMessage()]);
}
