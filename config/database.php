<?php

declare(strict_types=1);

/**
 * Database & Datastore Configuration — Lillia and Rowena Furniture
 * Configured for XAMPP MySQL (127.0.0.1, user: root, pass: '', db: lillia_rowena_furniture)
 * with automatic fallback to data/store.json if MySQL is offline.
 */

return [
    'host'      => getenv('DB_HOST') ?: '127.0.0.1',
    'port'      => getenv('DB_PORT') ?: '3306',
    'dbname'    => getenv('DB_NAME') ?: 'lillia_rowena_furniture',
    'user'      => getenv('DB_USER') ?: 'root',
    'pass'      => getenv('DB_PASS') ?: '',
    'json_path' => dirname(__DIR__) . '/data/store.json',
];
