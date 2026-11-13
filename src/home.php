<?php

declare(strict_types=1);

/**
 * Welcome / Logged-In Portal Entry Point (src/home.php)
 * Delegates to App\Controllers\HomeControllers::home().
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

use App\Controllers\HomeControllers;

$controller = new HomeControllers();
$controller->home();
