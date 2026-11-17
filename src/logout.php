<?php

declare(strict_types=1);

/**
 * Logout Entry Point (src/logout.php)
 * Destroys the session and redirects to src/index.php.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

use App\Controllers\HomeControllers;

$controller = new HomeControllers();
$controller->logout();
