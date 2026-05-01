<?php
/**
 * Landlord Room Photo Upload API
 * POST /api/landlord/rooms/{id}/photos        – upload photos for a room
 * DELETE /api/landlord/rooms/{id}/photos      – delete a single photo (body: { photo_id })
 * PATCH  /api/landlord/rooms/{id}/photos      – set cover photo (body: { photo_id })
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

$user       = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];
$method     = $_SERVER['REQUEST_METHOD'];

// Extract room ID from URL  /api/landlord/rooms/{id}/photos
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (!preg_match('#/api/landlord/rooms/(\d+)/photos#', $uri, $m)) {
    json_response(400, ['error' => 'Invalid room ID in URL']);
}
$roomId = intval($m[1]);

$pdo = Connection::getInstance()->getPdo();

// Verify the room belongs to this landlord
$checkStmt = $pdo->prepare(
    "SELECT r.id, r.property_id FROM rooms r
     WHERE r.id = ? AND r.landlord_id = ? AND r.deleted_at IS NULL"
);
$checkStmt->execute([$roomId, $landlordId]);
$room = $checkStmt->fetch(PDO::FETCH_ASSOC);

if (!$room) {
    json_response(404, ['error' => 'Room not found or access denied']);
}

$propertyId = intval($room['property_id']);

/* ------------------------------------------------------------------ */
/* POST – upload one or more photos                                    */
/* ------------------------------------------------------------------ */
if ($method === 'POST') {
    if (empty($_FILES['roomPhotos']) || empty($_FILES['roomPhotos']['name'][0])) {
        json_response(400, ['error' => 'No photos provided (field name: roomPhotos[])']);
    }

    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    $maxSize      = 5 * 1024 * 1024; // 5 MB

    $uploadDir = __DIR__ . '/../../storage/properties/' . $propertyId . '/rooms/' . $roomId . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Determine next display_order
    $orderStmt = $pdo->prepare(
        "SELECT COALESCE(MAX(display_order), -1) FROM room_photos WHERE room_id = ?"
    );
    $orderStmt->execute([$roomId]);
    $maxOrder = intval($orderStmt->fetchColumn());

    // Is this the first photo ever for this room?
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM room_photos WHERE room_id = ?");
    $countStmt->execute([$roomId]);
    $existingCount = intval($countStmt->fetchColumn());

    $files      = $_FILES['roomPhotos'];
    $fileCount  = count($files['name']);
    $uploaded   = [];
    $errors     = [];

    try {
        $pdo->beginTransaction();

        $insertStmt = $pdo->prepare(
            "INSERT INTO room_photos (room_id, photo_url, is_cover, display_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())"
        );

        for ($i = 0; $i < $fileCount; $i++) {
            if ($files['error'][$i] !== UPLOAD_ERR_OK) {
                $errors[] = "File {$files['name'][$i]}: upload error code {$files['error'][$i]}";
                continue;
            }

            // Validate file extension (more reliable than MIME type)
            $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            
            if (!in_array($ext, $allowedExtensions)) {
                $errors[] = "File {$files['name'][$i]}: unsupported type (allowed: jpg, png, webp)";
                continue;
            }

            // Also check MIME type as secondary validation
            if (!in_array($files['type'][$i], $allowedTypes)) {
                // Log for debugging but don't fail - browser MIME types can be inconsistent
                error_log("Room photo MIME type mismatch for {$files['name'][$i]}: got {$files['type'][$i]}, expected one of " . implode(', ', $allowedTypes));
            }

            if ($files['size'][$i] > $maxSize) {
                $errors[] = "File {$files['name'][$i]}: exceeds 5 MB limit";
                continue;
            }

            $newName  = 'room_' . $roomId . '_' . uniqid() . '.' . $ext;
            $destPath = $uploadDir . $newName;

            if (!move_uploaded_file($files['tmp_name'][$i], $destPath)) {
                $errors[] = "File {$files['name'][$i]}: failed to save";
                continue;
            }

            $photoUrl    = '/storage/properties/' . $propertyId . '/rooms/' . $roomId . '/' . $newName;
            $displayOrder = $maxOrder + 1 + count($uploaded);
            // First photo overall becomes the cover
            $isCover = ($existingCount === 0 && count($uploaded) === 0) ? 1 : 0;

            $insertStmt->execute([$roomId, $photoUrl, $isCover, $displayOrder]);
            $newPhotoId = intval($pdo->lastInsertId());

            $uploaded[] = [
                'id'            => $newPhotoId,
                'photo_url'     => $photoUrl,
                'is_cover'      => (bool)$isCover,
                'display_order' => $displayOrder,
            ];
        }

        if (empty($uploaded)) {
            $pdo->rollBack();
            json_response(400, [
                'error'  => 'No photos were saved. Check file types (jpg/png/webp) and sizes (max 5 MB).',
                'errors' => $errors,
            ]);
        }

        $pdo->commit();

        json_response(201, [
            'success' => true,
            'message' => count($uploaded) . ' photo(s) uploaded successfully',
            'data'    => ['photos' => $uploaded, 'errors' => $errors],
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Room photo upload error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to upload photos']);
    }
}

/* ------------------------------------------------------------------ */
/* PATCH – set a photo as cover                                        */
/* ------------------------------------------------------------------ */
if ($method === 'PATCH') {
    $input   = json_decode(file_get_contents('php://input'), true) ?: [];
    $photoId = isset($input['photo_id']) ? intval($input['photo_id']) : null;

    if (!$photoId) {
        json_response(400, ['error' => 'photo_id is required']);
    }

    // Verify photo belongs to this room
    $verifyStmt = $pdo->prepare("SELECT id FROM room_photos WHERE id = ? AND room_id = ?");
    $verifyStmt->execute([$photoId, $roomId]);
    if (!$verifyStmt->fetch()) {
        json_response(404, ['error' => 'Photo not found']);
    }

    try {
        $pdo->beginTransaction();
        // Clear existing cover
        $pdo->prepare("UPDATE room_photos SET is_cover = 0 WHERE room_id = ?")->execute([$roomId]);
        // Set new cover
        $pdo->prepare("UPDATE room_photos SET is_cover = 1 WHERE id = ?")->execute([$photoId]);
        $pdo->commit();

        json_response(200, ['success' => true, 'message' => 'Cover photo updated']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Set cover photo error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to update cover photo']);
    }
}

/* ------------------------------------------------------------------ */
/* DELETE – remove a single photo                                      */
/* ------------------------------------------------------------------ */
if ($method === 'DELETE') {
    $input   = json_decode(file_get_contents('php://input'), true) ?: [];
    $photoId = isset($input['photo_id']) ? intval($input['photo_id']) : null;

    if (!$photoId) {
        json_response(400, ['error' => 'photo_id is required']);
    }

    // Fetch photo to get file path and cover status
    $fetchStmt = $pdo->prepare(
        "SELECT id, photo_url, is_cover FROM room_photos WHERE id = ? AND room_id = ?"
    );
    $fetchStmt->execute([$photoId, $roomId]);
    $photo = $fetchStmt->fetch(PDO::FETCH_ASSOC);

    if (!$photo) {
        json_response(404, ['error' => 'Photo not found']);
    }

    try {
        $pdo->beginTransaction();

        // Delete DB record
        $pdo->prepare("DELETE FROM room_photos WHERE id = ?")->execute([$photoId]);

        // If it was the cover, promote the next photo
        if ($photo['is_cover']) {
            $nextStmt = $pdo->prepare(
                "SELECT id FROM room_photos WHERE room_id = ? ORDER BY display_order ASC LIMIT 1"
            );
            $nextStmt->execute([$roomId]);
            $next = $nextStmt->fetch(PDO::FETCH_ASSOC);
            if ($next) {
                $pdo->prepare("UPDATE room_photos SET is_cover = 1 WHERE id = ?")->execute([$next['id']]);
            }
        }

        $pdo->commit();

        // Delete physical file (best-effort)
        $filePath = __DIR__ . '/../../' . ltrim($photo['photo_url'], '/');
        if (file_exists($filePath)) {
            @unlink($filePath);
        }

        json_response(200, ['success' => true, 'message' => 'Photo deleted']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Delete room photo error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to delete photo']);
    }
}

json_response(405, ['error' => 'Method not allowed']);
