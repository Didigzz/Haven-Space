<?php
/**
 * Popular Locations API
 * GET /api/rooms/popular-locations
 * 
 * Returns popular locations based on property count and activity
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

    // Get query parameters
    $limit = min(intval($_GET['limit'] ?? 6), 20); // Default to 6, max 20

    // Query to get popular locations based on property count
    // We'll extract city names from addresses and count properties
    $query = "
        SELECT 
            CASE 
                WHEN pl.city IS NOT NULL AND pl.city != '' THEN pl.city
                ELSE SUBSTRING_INDEX(SUBSTRING_INDEX(p.address, ',', -2), ',', 1)
            END as location_name,
            COUNT(DISTINCT p.id) as property_count,
            AVG(p.price) as avg_price,
            MIN(p.price) as min_price,
            MAX(p.price) as max_price
        FROM properties p
        LEFT JOIN landlord_profiles lp ON p.landlord_id = lp.user_id
        LEFT JOIN property_locations pl ON lp.id = pl.landlord_id AND pl.is_primary = TRUE
        WHERE p.deleted_at IS NULL 
          AND p.listing_moderation_status = 'published'
          AND p.status = 'available'
        GROUP BY location_name
        HAVING location_name IS NOT NULL 
          AND location_name != ''
          AND TRIM(location_name) != ''
          AND property_count >= 1
        ORDER BY property_count DESC, avg_price ASC
        LIMIT ?
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([$limit]);
    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Clean and format the locations
    $popularLocations = array_map(function($location) {
        $locationName = trim($location['location_name']);
        
        // Clean up common location name issues
        $locationName = preg_replace('/^(City of|Municipality of)\s+/i', '', $locationName);
        $locationName = trim($locationName);
        
        // Create display name and search value
        $displayName = $locationName;
        $searchValue = $locationName;
        
        // Special handling for known university areas
        if (stripos($locationName, 'Diliman') !== false || stripos($locationName, 'UP') !== false) {
            $displayName = 'UP Area';
            $searchValue = 'University of the Philippines';
        } elseif (stripos($locationName, 'Ateneo') !== false || stripos($locationName, 'Loyola') !== false) {
            $displayName = 'Ateneo';
            $searchValue = 'Ateneo de Manila';
        } elseif (stripos($locationName, 'Miriam') !== false) {
            $displayName = 'Miriam';
            $searchValue = 'Miriam College';
        }

        return [
            'name' => $displayName,
            'search_value' => $searchValue,
            'property_count' => intval($location['property_count']),
            'avg_price' => floatval($location['avg_price']),
            'min_price' => floatval($location['min_price']),
            'max_price' => floatval($location['max_price']),
            'price_range' => '₱' . number_format($location['min_price']) . ' - ₱' . number_format($location['max_price'])
        ];
    }, $locations);

    // If we don't have enough locations from the database, add some fallback popular areas
    if (count($popularLocations) < 3) {
        $fallbackLocations = [
            [
                'name' => 'Quezon City',
                'search_value' => 'Quezon City',
                'property_count' => 0,
                'avg_price' => 0,
                'min_price' => 0,
                'max_price' => 0,
                'price_range' => 'Various prices'
            ],
            [
                'name' => 'Manila',
                'search_value' => 'Manila',
                'property_count' => 0,
                'avg_price' => 0,
                'min_price' => 0,
                'max_price' => 0,
                'price_range' => 'Various prices'
            ],
            [
                'name' => 'Makati',
                'search_value' => 'Makati',
                'property_count' => 0,
                'avg_price' => 0,
                'min_price' => 0,
                'max_price' => 0,
                'price_range' => 'Various prices'
            ]
        ];

        // Add fallback locations that aren't already in the list
        $existingNames = array_column($popularLocations, 'name');
        foreach ($fallbackLocations as $fallback) {
            if (!in_array($fallback['name'], $existingNames) && count($popularLocations) < $limit) {
                $popularLocations[] = $fallback;
            }
        }
    }

    json_response(200, [
        'data' => [
            'locations' => array_slice($popularLocations, 0, $limit)
        ]
    ]);

} catch (Exception $e) {
    error_log('Popular locations API error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(500, ['error' => 'Failed to load popular locations', 'debug' => $e->getMessage()]);
}