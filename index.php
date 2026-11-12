<?php

declare(strict_types=1);

/**
 * Login Page Entry Point (index.php)
 * Delegates to App\Controllers\HomeControllers::login() or serves /api/* JSON endpoints.
 */

require_once __DIR__ . '/bootstrap.php';

use App\Controllers\HomeControllers;
use LilliaRowena\Atelier\Controllers\ApiController;

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (str_starts_with($uri, '/api/')) {
    $rawBody = file_get_contents('php://input');
    $body = is_string($rawBody) && $rawBody !== '' ? (json_decode($rawBody, true) ?? []) : $_POST;
    $api = new ApiController(__DIR__ . '/data/atelier_store.json');
    $api->handle($method, $uri, is_array($body) ? $body : []);
    exit;
}

$controller = new HomeControllers();
$controller->login();
