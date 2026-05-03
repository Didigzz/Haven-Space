<?php
/**
 * Complete Leave Requests Cron Job
 * Runs daily to soft-delete applications where the intended leave date has passed
 * 
 * This should be scheduled to run daily via cron:
 * 0 0 * * * php /path/to/functions/cron/complete-leave-requests.php
 */

require_once __DIR__ . '/../src/Core/bootstrap.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();
    
    // Find all approved leave requests where the intended leave date has passed
    $query = "
        UPDATE applications
        SET leave_request_status = 'completed',
            status = 'cancelled',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE leave_request_status = 'approved'
        AND intended_leave_date <= CURRENT_DATE
        AND deleted_at IS NULL
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    
    $count = $stmt->rowCount();
    
    // Log the result
    $logMessage = date('Y-m-d H:i:s') . " - Completed $count leave requests\n";
    error_log($logMessage);
    
    // Also write to a dedicated log file
    $logFile = __DIR__ . '/../logs/cron-leave-requests.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents($logFile, $logMessage, FILE_APPEND);
    
    echo "Success: Completed $count leave requests\n";
    
} catch (Exception $e) {
    $errorMessage = date('Y-m-d H:i:s') . " - ERROR: " . $e->getMessage() . "\n";
    error_log("Complete leave requests cron error: " . $e->getMessage());
    
    // Write error to log file
    $logFile = __DIR__ . '/../logs/cron-leave-requests.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents($logFile, $errorMessage, FILE_APPEND);
    
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
