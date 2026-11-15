<?php

declare(strict_types=1);

/**
 * PDO Database REST API Endpoint (src/api.php) — Lillia and Rowena Furniture
 * Connects to MySQL 8.0.16+ (`lillia_rowena_furniture`) via PHP PDO (`Library\Database`)
 * and stores all application state (`products`, `materials`, `inventoryTransactions`, `vouchers`,
 * `orders`, `customerProfile`, `customers`, `offers`, `sessionUser`, `cartItems`) on the server side.
 */

require_once __DIR__ . '/../config/bootstrap.php';

use App\Models\User;
use Library\Database;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$db = Database::getInstance();
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

try {
    if ($method === 'GET') {
        $store = $db->readStore();
        if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
            $store['sessionUser'] = $_SESSION['user'];
        } elseif (!isset($store['sessionUser'])) {
            $store['sessionUser'] = null;
        }
        if (isset($_SESSION['cartItems']) && is_array($_SESSION['cartItems'])) {
            $store['cartItems'] = $_SESSION['cartItems'];
        } elseif (!isset($store['cartItems'])) {
            $store['cartItems'] = [];
        }
        $store['_dbMeta'] = [
            'driver'         => 'pdo_mysql',
            'endpoint'       => 'src/api.php',
            'mysqlConnected' => $db->isMySqlConnected(),
            'timestamp'      => gmdate('c'),
        ];
        echo json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method === 'POST') {
        $rawBody = file_get_contents('php://input');
        $payload = is_string($rawBody) && $rawBody !== '' ? json_decode($rawBody, true) : $_POST;
        if (!is_array($payload)) {
            $payload = [];
        }

        $action = (string) ($payload['action'] ?? $_GET['action'] ?? 'sync_store');
        $store = $db->readStore();

        switch ($action) {
            case 'sync_store':
                if (isset($payload['products']) && is_array($payload['products'])) {
                    $store['products'] = $payload['products'];
                }
                if (isset($payload['materials']) && is_array($payload['materials'])) {
                    $store['materials'] = $payload['materials'];
                }
                if (isset($payload['inventoryTransactions']) && is_array($payload['inventoryTransactions'])) {
                    $store['inventoryTransactions'] = $payload['inventoryTransactions'];
                }
                if (isset($payload['vouchers']) && is_array($payload['vouchers'])) {
                    $store['vouchers'] = $payload['vouchers'];
                }
                if (isset($payload['orders']) && is_array($payload['orders'])) {
                    $store['orders'] = $payload['orders'];
                }
                if (isset($payload['customerProfile']) && is_array($payload['customerProfile'])) {
                    $store['customerProfile'] = $payload['customerProfile'];
                }
                if (isset($payload['customers']) && is_array($payload['customers'])) {
                    $store['customers'] = $payload['customers'];
                }
                if (isset($payload['offers']) && is_array($payload['offers'])) {
                    $store['offers'] = $payload['offers'];
                }
                if (array_key_exists('sessionUser', $payload)) {
                    $store['sessionUser'] = $payload['sessionUser'];
                    if (is_array($payload['sessionUser'])) {
                        $_SESSION['user'] = $payload['sessionUser'];
                    } else {
                        unset($_SESSION['user']);
                    }
                }
                if (isset($payload['cartItems']) && is_array($payload['cartItems'])) {
                    $store['cartItems'] = $payload['cartItems'];
                    $_SESSION['cartItems'] = $payload['cartItems'];
                }
                $db->writeStore($store);
                break;

            case 'save_session':
                $sessionUser = $payload['sessionUser'] ?? null;
                $store['sessionUser'] = $sessionUser;
                if (is_array($sessionUser)) {
                    $_SESSION['user'] = $sessionUser;
                } else {
                    unset($_SESSION['user']);
                    $store['cartItems'] = [];
                    $_SESSION['cartItems'] = [];
                }
                if (isset($payload['customerProfile']) && is_array($payload['customerProfile'])) {
                    $store['customerProfile'] = $payload['customerProfile'];
                }
                $db->writeStore($store);
                break;

            case 'save_cart':
                $cartItems = isset($payload['cartItems']) && is_array($payload['cartItems']) ? $payload['cartItems'] : [];
                $store['cartItems'] = $cartItems;
                $_SESSION['cartItems'] = $cartItems;
                $db->writeStore($store);
                break;

            case 'save_offer':
                $offer = $payload['offer'] ?? null;
                if (is_array($offer)) {
                    $offers = isset($store['offers']) && is_array($store['offers']) ? $store['offers'] : [];
                    array_unshift($offers, $offer);
                    $store['offers'] = array_slice($offers, 0, 20);
                    $db->writeStore($store);
                }
                break;

            case 'save_product':
                $product = $payload['product'] ?? null;
                if (is_array($product) && !empty($product['id'])) {
                    $products = isset($store['products']) && is_array($store['products']) ? $store['products'] : [];
                    $updated = false;
                    foreach ($products as $idx => $existing) {
                        if (($existing['id'] ?? '') === $product['id']) {
                            $products[$idx] = array_merge($existing, $product);
                            $updated = true;
                            break;
                        }
                    }
                    if (!$updated) {
                        array_unshift($products, $product);
                    }
                    $store['products'] = array_values($products);
                    $db->writeStore($store);
                }
                break;

            case 'delete_product':
                $productId = trim((string) ($payload['productId'] ?? ''));
                if ($productId !== '') {
                    $products = isset($store['products']) && is_array($store['products']) ? $store['products'] : [];
                    $removedName = null;
                    foreach ($products as $p) {
                        if (($p['id'] ?? '') === $productId) {
                            $removedName = (string) ($p['name'] ?? '');
                            break;
                        }
                    }
                    $store['products'] = array_values(array_filter(
                        $products,
                        static fn(array $p): bool => (string) ($p['id'] ?? '') !== $productId
                    ));
                    if (isset($payload['vouchers']) && is_array($payload['vouchers'])) {
                        $store['vouchers'] = $payload['vouchers'];
                    }
                    if ($db->isMySqlConnected() && $removedName !== null && $removedName !== '') {
                        try {
                            $db->query('DELETE FROM Product WHERE ProductName = :name', [':name' => $removedName]);
                        } catch (\Throwable) {
                            // Keep foreign-key referenced product rows intact if referenced by Order_Item
                        }
                    }
                    $db->writeStore($store);
                }
                break;

            case 'save_material':
                if (isset($payload['materials']) && is_array($payload['materials'])) {
                    $store['materials'] = $payload['materials'];
                } elseif (isset($payload['material']) && is_array($payload['material'])) {
                    $mat = $payload['material'];
                    $materials = isset($store['materials']) && is_array($store['materials']) ? $store['materials'] : [];
                    $found = false;
                    foreach ($materials as $idx => $m) {
                        if (($m['id'] ?? '') === ($mat['id'] ?? '')) {
                            $materials[$idx] = array_merge($m, $mat);
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        $materials[] = $mat;
                    }
                    $store['materials'] = array_values($materials);
                }
                if (isset($payload['inventoryTransactions']) && is_array($payload['inventoryTransactions'])) {
                    $store['inventoryTransactions'] = $payload['inventoryTransactions'];
                }
                $db->writeStore($store);
                break;

            case 'delete_material':
                $materialId = trim((string) ($payload['materialId'] ?? ''));
                $removedMatName = null;
                if (isset($store['materials']) && is_array($store['materials'])) {
                    foreach ($store['materials'] as $m) {
                        if (($m['id'] ?? '') === $materialId) {
                            $removedMatName = (string) ($m['name'] ?? '');
                            break;
                        }
                    }
                }
                if (isset($payload['materials']) && is_array($payload['materials'])) {
                    $store['materials'] = $payload['materials'];
                } elseif ($materialId !== '' && isset($store['materials']) && is_array($store['materials'])) {
                    $store['materials'] = array_values(array_filter(
                        $store['materials'],
                        static fn(array $m): bool => (string) ($m['id'] ?? '') !== $materialId
                    ));
                }
                if ($db->isMySqlConnected() && $removedMatName !== null && $removedMatName !== '') {
                    try {
                        $db->query('DELETE FROM Material WHERE MaterialName = :name', [':name' => $removedMatName]);
                    } catch (\Throwable) {
                        // Keep foreign-key referenced material rows intact if referenced by Order_Item_Material
                    }
                }
                $db->writeStore($store);
                break;

            case 'register_customer':
                $userModel = new User($db);
                $registered = $userModel->register([
                    'fullName'    => $payload['fullName'] ?? $payload['name'] ?? '',
                    'email'       => $payload['email'] ?? '',
                    'password'    => $payload['password'] ?? 'ClientPass2025!',
                    'phoneNumber' => $payload['phoneNumber'] ?? '+1 (212) 555-0148',
                    'address'     => $payload['address'] ?? 'Suite 400, 118 Mercer St, SoHo',
                ]);
                $store = $db->readStore();
                $sessionObj = [
                    'email' => $registered['email'],
                    'name'  => $registered['fullName'],
                    'role'  => 'client',
                ];
                $_SESSION['user'] = $sessionObj;
                $store['sessionUser'] = $sessionObj;
                $store['customerProfile'] = [
                    'name'    => $registered['fullName'],
                    'email'   => $registered['email'],
                    'phone'   => $registered['phoneNumber'] ?: '+1 (212) 555-0148',
                    'city'    => 'New York, NY 10013',
                    'address' => $registered['address'] ?: 'Suite 400, 118 Mercer St, SoHo',
                    'notes'   => 'Standard white-glove delivery instructions.',
                ];
                $db->writeStore($store);
                echo json_encode([
                    'ok'             => true,
                    'customer'       => $registered,
                    'sessionUser'    => $sessionObj,
                    'mysqlConnected' => $db->isMySqlConnected(),
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;

            default:
                $db->writeStore($store);
                break;
        }

        echo json_encode([
            'ok'             => true,
            'action'         => $action,
            'mysqlConnected' => $db->isMySqlConnected(),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
} catch (\Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
