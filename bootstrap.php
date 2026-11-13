<?php

declare(strict_types=1);

/**
 * Application Bootstrap — Lillia and Rowena Furniture
 * Configured out-of-the-box for XAMPP (127.0.0.1, user: root, pass: '', db: lillia_rowena_furniture)
 * with automatic fallback to data/store.json if the MySQL database is not yet imported.
 */

if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    session_start();
}

require_once __DIR__ . '/vendor/autoload.php';

use Library\Database;

$dbConfig = [
    'host'      => getenv('DB_HOST') ?: '127.0.0.1',
    'port'      => getenv('DB_PORT') ?: '3306',
    'dbname'    => getenv('DB_NAME') ?: 'lillia_rowena_furniture',
    'user'      => getenv('DB_USER') ?: 'root',
    'pass'      => getenv('DB_PASS') ?: '',
    'json_path' => __DIR__ . '/data/store.json',
];

$database = Database::getInstance($dbConfig);
