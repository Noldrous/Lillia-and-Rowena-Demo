<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use LilliaRowena\Atelier\Controllers\ApiController;
use LilliaRowena\Atelier\Database\JsonStore;
use LilliaRowena\Atelier\Services\VoucherAndCatalogService;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? parse_url($_SERVER['REQUEST_URI'] ?? '/api/catalog', PHP_URL_PATH) ?: '/api/catalog';
$rawBody = file_get_contents('php://input');
$body = is_string($rawBody) && $rawBody !== '' ? (json_decode($rawBody, true) ?? []) : [];

$store = new JsonStore(dirname(__DIR__) . '/data/atelier_store.json');
$service = new VoucherAndCatalogService($store);
$controller = new ApiController($service);
$controller->handle($method, (string) $action, is_array($body) ? $body : []);
