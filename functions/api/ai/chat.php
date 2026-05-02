<?php

ini_set('display_errors', 0);
header('Content-Type: application/json');

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';

// CORS is handled by cors.php middleware

use App\AI\GroqService;
use App\AI\PropertyService;

try {
    // Allow public access to AI chat - no authentication required
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['message'])) {
        json_response(400, ['error' => 'Message is required']);
        exit;
    }

    $groqService = new GroqService();

    if (!$groqService->isConfigured()) {
        json_response(503, ['error' => 'AI service not configured']);
        exit;
    }

    $userMessage = $input['message'];

    // Always fetch current listings so every response is grounded in real data
    $propertyService = new PropertyService();
    $properties = $propertyService->getActivePropertiesForAI();
    $propertyContext = $propertyService->formatPropertiesForAIContext($properties);

    // Ensure the chatbot reads and displays the current listings before responding
    if (strpos($userMessage, 'current listing') !== false) {
        $propertyService = new PropertyService();
        $properties = $propertyService->getActivePropertiesForAI();
        if (!empty($properties)) {
            $response = "Here are our current listings:\n";
            foreach ($properties as $property) {
                $response .= "- {$property['name']}: {$property['description']}\n";
            }
            $response .= "If you'd like more information about any of these listings, please let me know!";
        } else {
            $response = "I've checked our current listings, and unfortunately, we don't have any properties available at the moment. If you'd like, I can help you set up a search or notify you when new listings become available. What type of boarding house are you looking for?";
        }
        echo json_encode(['response' => $response]);
        exit;
    }

    $messages = [
        [
            'role' => 'system',
            'content' => 'You are Haven AI, a smart boarding house assistant for the Haven Space platform. '
                . 'Your role is to help users find boarding houses, answer questions about the platform, '
                . 'and provide helpful information about rental properties. '
                . 'Be friendly, helpful, and concise. '
                . 'Base your answers on the current listings provided. '
                . 'Never make up property listings or specific details not present in the data.'
        ],
        [
            'role' => 'system',
            'content' => "Current property listings from the database (real-time):\n\n"
                . $propertyContext
                . "\nUse this data to answer property-related questions accurately. "
                . "If no properties match the user's criteria, say so and suggest they adjust their search."
        ],
        [
            'role' => 'user',
            'content' => $userMessage
        ]
    ];

    $response = $groqService->chatCompletion($messages);
    $aiResponse = $response['choices'][0]['message']['content'] ?? '';

    json_response(200, [
        'success' => true,
        'response' => trim($aiResponse),
        'model_used' => $response['model'] ?? 'unknown',
        'usage' => $response['usage'] ?? null
    ]);

} catch (\Throwable $e) {
    json_response(500, [
        'error' => 'AI chat failed: ' . $e->getMessage(),
        'success' => false
    ]);
}
