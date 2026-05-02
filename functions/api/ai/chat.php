<?php

ini_set('display_errors', 0);
header('Content-Type: application/json');

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';

use App\AI\GroqService;
use App\AI\PropertyService;

try {
    /* -------------------------------------------------------
     * 1. Parse & validate the request
     * ----------------------------------------------------- */
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    if (empty($input['message'])) {
        json_response(400, ['error' => 'Message is required', 'success' => false]);
        exit;
    }

    $userMessage = trim($input['message']);

    /* -------------------------------------------------------
     * 2. Check AI service availability
     * ----------------------------------------------------- */
    $groqService = new GroqService();
    if (!$groqService->isConfigured()) {
        json_response(503, ['error' => 'AI service not configured', 'success' => false]);
        exit;
    }

    /* -------------------------------------------------------
     * 3. ALWAYS load real property data FIRST — no exceptions
     * ----------------------------------------------------- */
    $propertyService = new PropertyService();
    $properties      = $propertyService->getActivePropertiesForAI();
    $propertyCount   = count($properties);
    $propertyContext = PropertyService::formatPropertiesForAIContext($properties);

    /* -------------------------------------------------------
     * 4. Build conversation history for multi-turn context
     * ----------------------------------------------------- */
    $history = [];
    if (!empty($input['history']) && is_array($input['history'])) {
        // Sanitize and limit to last 10 exchanges (20 messages) to stay within token limits
        $safeHistory = array_slice($input['history'], -20);
        foreach ($safeHistory as $msg) {
            if (!empty($msg['role']) && !empty($msg['content'])
                && in_array($msg['role'], ['user', 'assistant'], true)) {
                $history[] = [
                    'role'    => $msg['role'],
                    'content' => substr($msg['content'], 0, 2000), // hard cap per message
                ];
            }
        }
    }

    /* -------------------------------------------------------
     * 5. Compose the system prompts
     *    – System prompt 1: role & hard rules
     *    – System prompt 2: live database snapshot
     * ----------------------------------------------------- */
    $noListingsNote = $propertyCount === 0
        ? "The database currently has NO published listings. Honestly tell the user that there are no listings yet and invite them to check back soon."
        : "The database currently has {$propertyCount} published listing(s). You MUST reference these real listings when answering property-related questions. It is INCORRECT and FORBIDDEN to say there are no properties or no listings — the data above proves otherwise.";

    $systemPrompt1 = <<<PROMPT
You are Haven AI, the intelligent boarding-house assistant for Haven Space — a Philippine boarding-house marketplace.

YOUR ROLE:
• Help users find boarding houses, compare prices, explore locations, and understand the platform.
• Give direct, friendly, and accurate answers grounded in the real database data provided.
• When property data is available, always cite specific property names, prices, and locations.

HARD RULES (never break these):
1. {$noListingsNote}
2. Never invent property names, prices, or addresses that are not in the database.
3. When comparing prices, always use the actual ₱ figures from the data.
4. When asked "near me" questions, list the cities/addresses of available properties since you cannot access the user's GPS.
5. When a user asks a general question (not property-related), answer helpfully as a platform assistant.
6. Keep responses concise — use bullet points or short paragraphs.
7. Always respond in the same language the user uses (Filipino or English).
PROMPT;

    $systemPrompt2 = <<<DATA
LIVE DATABASE SNAPSHOT (fetched right now — this is ground truth):

{$propertyContext}

Use this data to answer ALL property-related questions accurately and specifically.
DATA;

    /* -------------------------------------------------------
     * 6. Assemble messages array
     * ----------------------------------------------------- */
    $messages = [
        ['role' => 'system', 'content' => $systemPrompt1],
        ['role' => 'system', 'content' => $systemPrompt2],
    ];

    // Inject conversation history
    foreach ($history as $msg) {
        $messages[] = $msg;
    }

    // Append the current user message
    $messages[] = ['role' => 'user', 'content' => $userMessage];

    /* -------------------------------------------------------
     * 7. Call Groq
     * ----------------------------------------------------- */
    $response  = $groqService->chatCompletion(
        $messages,
        null,   // use default model
        0.6,    // slightly lower temperature for factual accuracy
        1500    // allow longer, richer responses
    );
    $aiResponse = trim($response['choices'][0]['message']['content'] ?? '');

    if (empty($aiResponse)) {
        json_response(500, ['error' => 'Empty response from AI', 'success' => false]);
        exit;
    }

    /* -------------------------------------------------------
     * 8. Return structured response
     * ----------------------------------------------------- */
    json_response(200, [
        'success'          => true,
        'response'         => $aiResponse,
        'property_count'   => $propertyCount,
        'model_used'       => $response['model'] ?? 'unknown',
        'usage'            => $response['usage'] ?? null,
    ]);

} catch (\Throwable $e) {
    error_log('AI chat error: ' . $e->getMessage());
    json_response(500, [
        'success' => false,
        'error'   => 'AI chat failed: ' . $e->getMessage(),
    ]);
}
