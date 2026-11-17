<?php

declare(strict_types=1);

/**
 * Application Bootstrap — Lillia and Rowena Furniture
 * Loads PSR-4 autoloading and initializes the shared Database instance from config/database.php.
 */

if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    session_start();
}

require_once dirname(__DIR__) . '/vendor/autoload.php';

use Library\Database;

$dbConfig = require __DIR__ . '/database.php';

$database = Database::getInstance($dbConfig);
