<?php

declare(strict_types=1);

/**
 * Welcome / Flagship Showroom Entry Point (home.php)
 * Delegates to App\Controllers\HomeControllers::home().
 */

require_once __DIR__ . '/config/bootstrap.php';

use App\Controllers\HomeControllers;

$controller = new HomeControllers();
$controller->home();
