<?php

declare(strict_types=1);

/**
 * Login Page Entry Point (index.php) — Lillia and Rowena Furniture
 * Delegates to App\Controllers\HomeControllers::login().
 */

require_once __DIR__ . '/bootstrap.php';

use App\Controllers\HomeControllers;

$controller = new HomeControllers();
$controller->login();
