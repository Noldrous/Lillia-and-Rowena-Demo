<?php

declare(strict_types=1);

/**
 * Application Bootstrap
 * Initializes Composer PSR-4 autoloading, session management, and shared Database instance.
 */

if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    session_start();
}

require_once __DIR__ . '/vendor/autoload.php';

use Library\Database;

$dbConfig = [
    'host'      => getenv('DB_HOST') ?: '',
    'port'      => getenv('DB_PORT') ?: '3306',
    'dbname'    => getenv('DB_NAME') ?: 'lillia_rowena_atelier',
    'user'      => getenv('DB_USER') ?: 'root',
    'pass'      => getenv('DB_PASS') ?: '',
    'json_path' => __DIR__ . '/data/atelier_store.json',
];

$database = Database::getInstance($dbConfig);
