<?php
/**
 * Landlord Update Listing API
 * PUT /api/landlord/listings/{id}
 *
 * Updates an existing property listing
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

$propertyId = $input['id'] ?? null;

if (!$propertyId) {
    json_response(400, ['error' => 'Property ID is required']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Begin transaction
    $pdo->beginTransaction();

    // Verify property belongs to landlord and get address_id
    $checkStmt = $pdo->prepare("SELECT id, address_id FROM properties WHERE id = ? AND landlord_id = ?");
    $checkStmt->execute([$propertyId, $landlordId]);
    $property = $checkStmt->fetch(PDO::FETCH_ASSOC);
    if (!$property) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(403, ['error' => 'Property not found or access denied']);
    }

    $addressId = $property['address_id'];

    // Update address table if address fields are provided
    if (isset($input['address']) || isset($input['propertyAddress']) || 
        isset($input['latitude']) || isset($input['propertyLatitude']) ||
        isset($input['longitude']) || isset($input['propertyLongitude']) ||
        isset($input['city']) || isset($input['propertyCity']) ||
        isset($input['province']) || isset($input['propertyProvince'])) {
        
        $addressStmt = $pdo->prepare("
            UPDATE addresses 
            SET address_line_1 = ?,
                city = ?,
                province = ?,
                latitude = ?,
                longitude = ?,
                updated_at = NOW()
            WHERE id = ?
        ");

        // Get current address data first
        $currentAddressStmt = $pdo->prepare("SELECT address_line_1, city, province, latitude, longitude FROM addresses WHERE id = ?");
        $currentAddressStmt->execute([$addressId]);
        $currentAddress = $currentAddressStmt->fetch(PDO::FETCH_ASSOC);

        $addressStmt->execute([
            $input['address'] ?? $input['propertyAddress'] ?? $currentAddress['address_line_1'],
            $input['city'] ?? $input['propertyCity'] ?? $currentAddress['city'],
            $input['province'] ?? $input['propertyProvince'] ?? $currentAddress['province'],
            !empty($input['latitude']) ? floatval($input['latitude']) : (!empty($input['propertyLatitude']) ? floatval($input['propertyLatitude']) : $currentAddress['latitude']),
            !empty($input['longitude']) ? floatval($input['longitude']) : (!empty($input['propertyLongitude']) ? floatval($input['propertyLongitude']) : $currentAddress['longitude']),
            $addressId,
        ]);
    }

    // Update main property table
    $stmt = $pdo->prepare("
        UPDATE properties 
        SET title = ?,
            description = ?,
            price = ?,
            deposit = ?,
            min_stay = ?,
            property_rules = ?,
            status = ?,
            updated_at = NOW()
        WHERE id = ? AND landlord_id = ?
    ");

    $status = $input['status'] ?? 'available';
    // Map frontend status to database status
    if ($status === 'active') {
        $status = 'available';
    } elseif ($status === 'inactive') {
        $status = 'hidden';
    }

    // Get current property data for fallback values
    $currentPropStmt = $pdo->prepare("SELECT title, description, price, deposit, min_stay, property_rules FROM properties WHERE id = ?");
    $currentPropStmt->execute([$propertyId]);
    $currentProp = $currentPropStmt->fetch(PDO::FETCH_ASSOC);

    // Map min_stay from frontend format to database format
    $minStay = $currentProp['min_stay'];
    if (isset($input['min_stay'])) {
        $minStayMap = [
            'no-minimum' => 'No minimum',
            '1-month' => '1 month',
            '3-months' => '3 months',
            '6-months' => '6 months',
            '1-year' => '1 year',
        ];
        $minStay = $minStayMap[$input['min_stay']] ?? $input['min_stay'];
    }

    $stmt->execute([
        $input['name'] ?? $input['propertyName'] ?? $currentProp['title'],
        $input['description'] ?? $input['propertyDescription'] ?? $currentProp['description'],
        floatval($input['price'] ?? $input['propertyPrice'] ?? $currentProp['price']),
        isset($input['deposit']) ? strval($input['deposit']) : $currentProp['deposit'],
        $minStay,
        $input['rules'] ?? $input['propertyRules'] ?? $currentProp['property_rules'],
        $status,
        $propertyId,
        $landlordId,
    ]);



    // Update amenities
    if (isset($input['amenities']) && is_array($input['amenities'])) {
        // Delete existing amenities
        $deleteAmenitiesStmt = $pdo->prepare("DELETE FROM amenities WHERE property_id = ?");
        $deleteAmenitiesStmt->execute([$propertyId]);

        // Insert new amenities
        if (!empty($input['amenities'])) {
            $amenityStmt = $pdo->prepare("
                INSERT INTO amenities (property_id, amenity_name, created_at)
                VALUES (?, ?, NOW())
            ");

            foreach ($input['amenities'] as $amenity) {
                $amenityStmt->execute([$propertyId, $amenity]);
            }
        }
    }

    // Update rooms if total_rooms or capacity is provided
    if (isset($input['total_rooms']) || isset($input['capacity'])) {
        // Get current room count
        $currentRoomsStmt = $pdo->prepare("SELECT COUNT(*) as count FROM rooms WHERE property_id = ? AND deleted_at IS NULL");
        $currentRoomsStmt->execute([$propertyId]);
        $currentRoomCount = intval($currentRoomsStmt->fetchColumn());

        $newRoomCount = isset($input['total_rooms']) ? intval($input['total_rooms']) : $currentRoomCount;
        $roomCapacity = isset($input['capacity']) ? intval($input['capacity']) : null;
        $roomPrice = floatval($input['price'] ?? $input['propertyPrice'] ?? $currentProp['price']);

        // Determine room type based on capacity
        $roomType = ($roomCapacity === 1) ? 'single' : 'shared';

        if ($newRoomCount > $currentRoomCount) {
            // Add new rooms
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

            for ($i = $currentRoomCount + 1; $i <= $newRoomCount; $i++) {
                $roomNumber = "Room {$i}";
                $roomTitle = $roomCapacity ? 
                    ($roomCapacity === 1 ? "Single Room - {$roomNumber}" : "Shared Room ({$roomCapacity} persons) - {$roomNumber}") :
                    $roomNumber;
                
                $roomStmt->execute([
                    $propertyId,
                    $landlordId,
                    $roomTitle,
                    $roomPrice,
                    $roomNumber,
                    $roomType,
                    $roomCapacity ?? 1
                ]);
            }
        } elseif ($newRoomCount < $currentRoomCount) {
            // Soft delete excess rooms (mark as deleted instead of hard delete to preserve history)
            $getRoomsStmt = $pdo->prepare("
                SELECT id FROM rooms 
                WHERE property_id = ? AND deleted_at IS NULL 
                ORDER BY id DESC 
                LIMIT ?
            ");
            $getRoomsStmt->execute([$propertyId, $currentRoomCount - $newRoomCount]);
            $roomsToDelete = $getRoomsStmt->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($roomsToDelete)) {
                $deleteRoomsStmt = $pdo->prepare("
                    UPDATE rooms 
                    SET deleted_at = NOW() 
                    WHERE id IN (" . implode(',', array_fill(0, count($roomsToDelete), '?')) . ")
                ");
                $deleteRoomsStmt->execute($roomsToDelete);
            }
        }

        // Update capacity and room type for all existing rooms if capacity changed
        if ($roomCapacity !== null) {
            $updateRoomsStmt = $pdo->prepare("
                UPDATE rooms 
                SET capacity = ?,
                    room_type = ?,
                    price = ?,
                    updated_at = NOW()
                WHERE property_id = ? AND deleted_at IS NULL
            ");
            $updateRoomsStmt->execute([
                $roomCapacity,
                $roomType,
                $roomPrice,
                $propertyId
            ]);
        }
    }


    // Handle photos
    if (isset($input['photos']) && is_array($input['photos'])) {
        // Delete photos marked for deletion
        if (isset($input['photos_to_delete']) && is_array($input['photos_to_delete'])) {
            foreach ($input['photos_to_delete'] as $photoUrl) {
                // Delete from database
                $deletePhotoStmt = $pdo->prepare("DELETE FROM property_photos WHERE property_id = ? AND photo_url = ?");
                $deletePhotoStmt->execute([$propertyId, $photoUrl]);

                // Delete physical file
                $filePath = __DIR__ . '/../../' . ltrim($photoUrl, '/');
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }
        }

        // Get existing photos from database
        $existingPhotosStmt = $pdo->prepare("SELECT photo_url FROM property_photos WHERE property_id = ? ORDER BY display_order");
        $existingPhotosStmt->execute([$propertyId]);
        $existingPhotos = $existingPhotosStmt->fetchAll(PDO::FETCH_COLUMN);

        // Update display order for all photos
        $updateOrderStmt = $pdo->prepare("
            UPDATE property_photos 
            SET display_order = ?,
                is_cover = ?,
                updated_at = NOW()
            WHERE property_id = ? AND photo_url = ?
        ");

        foreach ($input['photos'] as $index => $photoUrl) {
            // Check if photo already exists
            if (in_array($photoUrl, $existingPhotos)) {
                // Update existing photo
                $updateOrderStmt->execute([
                    $index,
                    $index === 0 ? 1 : 0,
                    $propertyId,
                    $photoUrl,
                ]);
            } else {
                // Insert new photo
                $insertPhotoStmt = $pdo->prepare("
                    INSERT INTO property_photos (property_id, photo_url, is_cover, display_order, created_at, updated_at)
                    VALUES (?, ?, ?, ?, NOW(), NOW())
                ");

                $insertPhotoStmt->execute([
                    $propertyId,
                    $photoUrl,
                    $index === 0 ? 1 : 0,
                    $index,
                ]);

                // Move photo from temp to permanent location if it's a temp file
                if (strpos($photoUrl, '/temp/') !== false) {
                    $tempPath = __DIR__ . '/../../' . ltrim($photoUrl, '/');
                    $permanentDir = __DIR__ . '/../../storage/properties/' . $propertyId . '/';
                    
                    if (!is_dir($permanentDir)) {
                        mkdir($permanentDir, 0755, true);
                    }
                    
                    $filename = basename($photoUrl);
                    $permanentPath = $permanentDir . $filename;
                    $permanentUrl = '/storage/properties/' . $propertyId . '/' . $filename;
                    
                    if (file_exists($tempPath)) {
                        rename($tempPath, $permanentPath);
                        
                        // Update photo URL in database
                        $updateUrlStmt = $pdo->prepare("UPDATE property_photos SET photo_url = ? WHERE property_id = ? AND photo_url = ?");
                        $updateUrlStmt->execute([$permanentUrl, $propertyId, $photoUrl]);
                    }
                }
            }
        }
    }

    // Commit transaction
    $pdo->commit();

    json_response(200, [
        'message' => 'Listing updated successfully',
        'data' => ['id' => $propertyId],
    ]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Update listing error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to update listing: ' . $e->getMessage()]);
}