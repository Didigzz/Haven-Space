<?php

namespace App\AI;

use App\Core\Database\Connection;
use PDO;

class PropertyService
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = Connection::getInstance()->getPdo();
    }

    /**
     * Get all active/published properties with details for AI chat.
     * Intentionally broad — latitude/longitude are optional so no listings are hidden.
     *
     * @return array Array of property data
     */
    public function getActivePropertiesForAI(): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT
                    p.id,
                    p.title          AS name,
                    p.description,
                    a.address_line_1 AS address,
                    a.city,
                    a.province,
                    a.latitude,
                    a.longitude,
                    p.price,
                    p.status,
                    p.listing_moderation_status,
                    COUNT(DISTINCT r.id)                                                          AS rooms_count,
                    COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0)          AS occupied_rooms,
                    COALESCE(SUM(CASE WHEN r.status = 'available' THEN 1 ELSE 0 END), 0)         AS available_rooms,
                    u.first_name                                                                   AS landlord_first_name,
                    u.last_name                                                                    AS landlord_last_name,
                    lp.boarding_house_name                                                         AS landlord_business_name,
                    lp.total_rooms                                                                 AS property_total_rooms
                FROM properties p
                LEFT JOIN addresses       a  ON p.address_id   = a.id
                LEFT JOIN rooms           r  ON p.id = r.property_id AND r.deleted_at IS NULL
                LEFT JOIN users           u  ON u.id = p.landlord_id
                LEFT JOIN landlord_profiles lp ON lp.user_id   = p.landlord_id
                WHERE p.deleted_at IS NULL
                  AND p.listing_moderation_status = 'published'
                GROUP BY
                    p.id, p.title, p.description,
                    a.address_line_1, a.city, a.province, a.latitude, a.longitude,
                    p.price, p.status, p.listing_moderation_status, p.created_at,
                    p.landlord_id,
                    u.first_name, u.last_name,
                    lp.boarding_house_name, lp.total_rooms
                ORDER BY p.created_at DESC
                LIMIT 100
            ");
            $stmt->execute();
            $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($properties)) {
                return [];
            }

            // Fetch amenities for all properties in one query
            $propertyIds  = array_column($properties, 'id');
            $amenitiesMap = [];

            if (!empty($propertyIds)) {
                $placeholders   = implode(',', array_fill(0, count($propertyIds), '?'));
                $amenitiesStmt  = $this->pdo->prepare("
                    SELECT property_id, amenity_name
                    FROM   amenities
                    WHERE  property_id IN ($placeholders)
                ");
                $amenitiesStmt->execute($propertyIds);
                foreach ($amenitiesStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    $amenitiesMap[$row['property_id']][] = $row['amenity_name'];
                }
            }

            // Transform for AI consumption
            $result = [];
            foreach ($properties as $property) {
                $totalRooms    = $property['property_total_rooms']
                    ? intval($property['property_total_rooms'])
                    : intval($property['rooms_count']);
                $occupiedRooms  = intval($property['occupied_rooms']);
                $availableRooms = intval($property['available_rooms']);
                $occupancyRate  = $totalRooms > 0
                    ? round(($occupiedRooms / $totalRooms) * 100)
                    : 0;

                $displayStatus = ($occupancyRate === 100 && $totalRooms > 0) ? 'full' : 'available';

                $landlordName = $property['landlord_business_name']
                    ?: trim(($property['landlord_first_name'] ?? '') . ' ' . ($property['landlord_last_name'] ?? ''));

                $result[] = [
                    'id'             => intval($property['id']),
                    'name'           => $property['name'],
                    'description'    => $property['description'] ?? '',
                    'address'        => $property['address'] ?? 'N/A',
                    'latitude'       => $property['latitude']  ? floatval($property['latitude'])  : null,
                    'longitude'      => $property['longitude'] ? floatval($property['longitude']) : null,
                    'city'           => $property['city']     ?? '',
                    'province'       => $property['province'] ?? '',
                    'price'          => floatval($property['price']),
                    'status'         => $displayStatus,
                    'total_rooms'    => $totalRooms,
                    'occupied_rooms' => $occupiedRooms,
                    'available_rooms'=> $availableRooms,
                    'occupancy_rate' => $occupancyRate,
                    'landlord_name'  => $landlordName,
                    'amenities'      => $amenitiesMap[$property['id']] ?? [],
                ];
            }

            return $result;

        } catch (\Exception $e) {
            error_log('PropertyService::getActivePropertiesForAI error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Return a quick price-range summary for the AI (min, max, avg).
     */
    public function getPriceSummary(): array
    {
        try {
            $stmt = $this->pdo->query("
                SELECT
                    MIN(price) AS min_price,
                    MAX(price) AS max_price,
                    ROUND(AVG(price), 2) AS avg_price,
                    COUNT(*)   AS total
                FROM properties
                WHERE deleted_at IS NULL
                  AND listing_moderation_status = 'published'
            ");
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Check if a user message is property/listing related.
     */
    public static function isPropertyRelatedQuery(string $message): bool
    {
        $msg = strtolower($message);

        $keywords = [
            'property', 'properties', 'boarding house', 'boarding houses', 'boardinghouse',
            'rental', 'room', 'rooms', 'apartment', 'dormitory', 'accommodation', 'listing',
            'available', 'price', 'location', 'amenities', 'landlord', 'find', 'search',
            'list', 'show', 'near', 'area', 'city', 'cheap', 'affordable', 'expensive',
            'luxury', 'budget', 'how much', 'cost', 'rate', 'monthly', 'wifi', 'ac',
            'aircon', 'cctv', 'water', 'electric',
        ];

        foreach ($keywords as $kw) {
            if (str_contains($msg, $kw)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Format properties for injection into the AI system prompt.
     * Includes a header that states the exact count so the model cannot claim zero listings.
     */
    public static function formatPropertiesForAIContext(array $properties): string
    {
        $count = count($properties);

        if ($count === 0) {
            return "PROPERTY DATABASE: 0 published listings found.";
        }

        // Price stats
        $prices   = array_column($properties, 'price');
        $minPrice = min($prices);
        $maxPrice = max($prices);
        $avgPrice = round(array_sum($prices) / $count, 2);

        $context  = "=== HAVEN SPACE PROPERTY DATABASE ===\n";
        $context .= "Total published listings: {$count}\n";
        $context .= sprintf(
            "Price range: ₱%.2f – ₱%.2f per month  |  Average: ₱%.2f/month\n\n",
            $minPrice, $maxPrice, $avgPrice
        );

        foreach ($properties as $i => $p) {
            $num       = $i + 1;
            $available = $p['available_rooms'] > 0 ? "{$p['available_rooms']} room(s) available" : "fully occupied";
            $location  = implode(', ', array_filter([$p['address'], $p['city'], $p['province']]));
            $amenities = !empty($p['amenities']) ? implode(', ', $p['amenities']) : 'not listed';

            $context .= "--- Listing #{$num} ---\n";
            $context .= "Name      : {$p['name']}\n";
            $context .= "Location  : {$location}\n";
            $context .= "Price     : ₱" . number_format($p['price'], 2) . " per month\n";
            $context .= "Rooms     : {$p['total_rooms']} total, {$available}\n";
            $context .= "Amenities : {$amenities}\n";

            if (!empty($p['description'])) {
                $context .= "Details   : {$p['description']}\n";
            }
            if (!empty($p['landlord_name'])) {
                $context .= "Landlord  : {$p['landlord_name']}\n";
            }
            $context .= "\n";
        }

        $context .= "=== END OF PROPERTY DATABASE ===\n";
        return $context;
    }
}
