<?php

/**
 * Test Script for Appwrite Configuration
 * This script tests if the Appwrite configuration is loaded correctly
 */

require_once __DIR__ . '/functions/src/Core/bootstrap.php';

try {
    $config = require __DIR__ . '/functions/config/app.php';
