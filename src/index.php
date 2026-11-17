<?php

declare(strict_types=1);

/**
 * Login Page Entry Point (src/index.php) — Lillia and Rowena Furniture
 * Delegates to App\Controllers\HomeControllers::login().
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

use App\Controllers\HomeControllers;

$controller = new HomeControllers();
$controller->login();
