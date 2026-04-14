<?php

/**
 * Response Helper
 * Standardized JSON response formatting for API endpoints
 */

if (!function_exists('json_response')) {
    /**
     * Send a JSON response
     *
     * @param int $statusCode HTTP status code
     * @param array $data Response data
     * @return void
     */
    function json_response(int $statusCode, array $data): void
    {
        http_response_code($statusCode);
        
        // Set content type (CORS headers are handled separately by cors.php)
        header('Content-Type: application/json');
        
        echo json_encode($data);
        exit;
    }
}
