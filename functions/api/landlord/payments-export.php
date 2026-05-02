<?php

/**
 * Landlord Payment Export API
 * GET /api/landlord/payments/export
 * 
 * Returns filtered payment data for export with various time ranges and filters
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

try {
    $db = Connection::getInstance()->getPdo();

    // Get filter parameters
    $timeRange = $_GET['timeRange'] ?? 'monthly';
    $reportType = $_GET['reportType'] ?? 'all';
    $property = $_GET['property'] ?? 'all';
    $tenant = $_GET['tenant'] ?? 'all';
    $status = $_GET['status'] ?? 'all';
    $startDate = $_GET['startDate'] ?? null;
    $endDate = $_GET['endDate'] ?? null;

    // Build base query
    $query = "
        SELECT 
            p.id,
            p.amount,
            p.late_fee,
            p.due_date,
            p.paid_date,
            p.status,
            p.payment_method,
            p.reference_number,
            p.notes,
            u.first_name as boarder_first_name,
            u.last_name as boarder_last_name,
            u.email as boarder_email,
            prop.title as property_title,
            r.title as room_title,
            p.boarder_id
        FROM payments p
        INNER JOIN users u ON p.boarder_id = u.id
        INNER JOIN properties prop ON p.property_id = prop.id
        INNER JOIN rooms r ON p.room_id = r.id
        WHERE p.landlord_id = :landlord_id
    ";

    $params = ['landlord_id' => $landlordId];

    // Apply time range filter
    $dateConditions = getDateConditions($timeRange, $startDate, $endDate);
    if ($dateConditions) {
        $query .= " AND " . $dateConditions['condition'];
        $params = array_merge($params, $dateConditions['params']);
    }

    // Apply report type filter
    switch ($reportType) {
        case 'outstanding':
            $query .= " AND p.status IN ('pending', 'overdue')";
            break;
        case 'overdue':
            $query .= " AND p.status = 'overdue'";
            break;
        case 'summary':
            // Summary will be calculated from all data
            break;
        case 'all':
        default:
            // No additional filter
            break;
    }

    // Apply property filter
    if ($property !== 'all') {
        $query .= " AND prop.title = :property";
        $params['property'] = $property;
    }

    // Apply tenant filter
    if ($tenant !== 'all') {
        $query .= " AND p.boarder_id = :tenant";
        $params['tenant'] = intval($tenant);
    }

    // Apply status filter
    if ($status !== 'all') {
        $query .= " AND p.status = :status";
        $params['status'] = $status;
    }

    // Order by due date
    $query .= " ORDER BY p.due_date DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // If summary report, calculate aggregated data
    if ($reportType === 'summary') {
        $summaryData = calculateSummaryData($payments);
        json_response(200, [
            'data' => $payments,
            'summary' => $summaryData
        ]);
    }

    json_response(200, ['data' => $payments]);

} catch (Exception $e) {
    error_log('Error fetching export data: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to fetch export data']);
}

/**
 * Get date conditions based on time range
 * 
 * @param string $timeRange
 * @param string|null $startDate
 * @param string|null $endDate
 * @return array|null
 */
function getDateConditions(string $timeRange, ?string $startDate, ?string $endDate): ?array
{
    $today = date('Y-m-d');
    
    switch ($timeRange) {
        case 'daily':
            return [
                'condition' => 'DATE(p.due_date) = :today',
                'params' => ['today' => $today]
            ];
        
        case 'weekly':
            $weekStart = date('Y-m-d', strtotime('monday this week'));
            $weekEnd = date('Y-m-d', strtotime('sunday this week'));
            return [
                'condition' => 'p.due_date BETWEEN :week_start AND :week_end',
                'params' => [
                    'week_start' => $weekStart,
                    'week_end' => $weekEnd
                ]
            ];
        
        case 'monthly':
            $monthStart = date('Y-m-01');
            $monthEnd = date('Y-m-t');
            return [
                'condition' => 'p.due_date BETWEEN :month_start AND :month_end',
                'params' => [
                    'month_start' => $monthStart,
                    'month_end' => $monthEnd
                ]
            ];
        
        case 'ytd':
            $yearStart = date('Y-01-01');
            return [
                'condition' => 'p.due_date BETWEEN :year_start AND :today',
                'params' => [
                    'year_start' => $yearStart,
                    'today' => $today
                ]
            ];
        
        case 'custom':
            if ($startDate && $endDate) {
                return [
                    'condition' => 'p.due_date BETWEEN :start_date AND :end_date',
                    'params' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate
                    ]
                ];
            }
            return null;
        
        default:
            return null;
    }
}

/**
 * Calculate summary data from payments
 * 
 * @param array $payments
 * @return array
 */
function calculateSummaryData(array $payments): array
{
    $summary = [
        'total_count' => count($payments),
        'total_amount' => 0,
        'paid_count' => 0,
        'paid_amount' => 0,
        'pending_count' => 0,
        'pending_amount' => 0,
        'overdue_count' => 0,
        'overdue_amount' => 0,
        'by_property' => [],
        'by_month' => []
    ];

    foreach ($payments as $payment) {
        $amount = floatval($payment['amount']) + floatval($payment['late_fee'] ?? 0);
        $summary['total_amount'] += $amount;

        // Count by status
        switch ($payment['status']) {
            case 'paid':
                $summary['paid_count']++;
                $summary['paid_amount'] += $amount;
                break;
            case 'overdue':
                $summary['overdue_count']++;
                $summary['overdue_amount'] += $amount;
                break;
            default:
                $summary['pending_count']++;
                $summary['pending_amount'] += $amount;
                break;
        }

        // Group by property
        $propertyTitle = $payment['property_title'];
        if (!isset($summary['by_property'][$propertyTitle])) {
            $summary['by_property'][$propertyTitle] = [
                'count' => 0,
                'amount' => 0
            ];
        }
        $summary['by_property'][$propertyTitle]['count']++;
        $summary['by_property'][$propertyTitle]['amount'] += $amount;

        // Group by month
        $month = date('Y-m', strtotime($payment['due_date']));
        if (!isset($summary['by_month'][$month])) {
            $summary['by_month'][$month] = [
                'count' => 0,
                'amount' => 0
            ];
        }
        $summary['by_month'][$month]['count']++;
        $summary['by_month'][$month]['amount'] += $amount;
    }

    return $summary;
}
