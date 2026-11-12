<?php

declare(strict_types=1);

/**
 * Logout Entry Point (logout.php)
 * Destroys the session and redirects to index.php.
 */

require_once __DIR__ . '/bootstrap.php';

use App\Controllers\HomeControllers;

$controller = new HomeControllers();
$controller->logout();
