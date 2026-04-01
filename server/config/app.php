<?php
// Haven Space Application Configuration

return [
    'app_name' => 'Haven Space',
    'jwt_secret' => 'your_jwt_secret_key_here', // Change this in production
    'jwt_expiration' => 3600 * 24, // 24 hours
    'api_prefix' => '/api',
];
