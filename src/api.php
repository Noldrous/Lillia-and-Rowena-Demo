<?php

declare(strict_types=1);

/**
 * PDO Database REST API Endpoint (src/api.php) — Lillia and Rowena Furniture
 * Connects to MySQL 8.0.16+ (`lillia_rowena_furniture`) via PHP PDO (`Library\Database`)
 * and stores all application state (`products`, `materials`, `inventoryTransactions`, `vouchers`,
 * `orders`, `customerProfile`, `customers`, `offers`, `sessionUser`, `cartItems`) on the server side.
 */

require_once __DIR__ . '/../config/bootstrap.php';

use App\Models\AnalyticsReport;
use App\Models\Product;
use App\Models\User;
use Library\Database;

date_default_timezone_set('Asia/Manila');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$db = Database::getInstance();
$productModel = new Product($db);
$analyticsModel = new AnalyticsReport($db, $productModel);
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

try {
    if ($method === 'GET') {
        $store = $db->readStore();
        if (isset($store['vouchers']) && is_array($store['vouchers'])) {
            $store['vouchers'] = $productModel->normalizeVouchersStatus($store['vouchers']);
        }
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
            'timezone'       => 'Asia/Manila',
            'timestamp'      => (new \DateTimeImmutable('now', new \DateTimeZone('Asia/Manila')))->format(\DateTimeInterface::ATOM),
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
            case 'get_analytics_report':
                $activeUser = $_SESSION['user'] ?? $store['sessionUser'] ?? null;
                $activeRole = is_array($activeUser) ? strtolower((string) ($activeUser['role'] ?? '')) : '';
                if ($activeRole === 'client' || $activeRole === 'customer') {
                    http_response_code(403);
                    echo json_encode([
                        'ok'    => false,
                        'error' => 'Unauthorized: Monthly Analytics & Business Reports are restricted to authorized administrators.',
                    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                    exit;
                }
                $filterInput = isset($payload['filter']) && is_array($payload['filter']) ? $payload['filter'] : $payload;
                $report = $analyticsModel->generateReport($filterInput);
                echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;

            case 'create_voucher':
                $voucherInput = isset($payload['voucher']) && is_array($payload['voucher']) ? $payload['voucher'] : $payload;
                $createdVoucher = $productModel->createVoucher($voucherInput);
                $updatedStore = $db->readStore();
                echo json_encode([
                    'ok'             => true,
                    'action'         => 'create_voucher',
                    'voucher'        => $createdVoucher,
                    'vouchers'       => $updatedStore['vouchers'] ?? [],
                    'mysqlConnected' => $db->isMySqlConnected(),
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;

            case 'revoke_voucher':
                $voucherId = (string) ($payload['voucherId'] ?? $payload['id'] ?? $payload['code'] ?? '');
                $revokedVoucher = $productModel->revokeVoucher($voucherId);
                $updatedStore = $db->readStore();
                echo json_encode([
                    'ok'             => true,
                    'action'         => 'revoke_voucher',
                    'voucher'        => $revokedVoucher,
                    'vouchers'       => $updatedStore['vouchers'] ?? [],
                    'mysqlConnected' => $db->isMySqlConnected(),
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;

            case 'validate_voucher':
                $voucherCode = (string) ($payload['voucherCode'] ?? $payload['code'] ?? '');
                $customerEmail = (string) ($payload['customerEmail'] ?? '');
                $cartItems = isset($payload['cartItems']) && is_array($payload['cartItems']) ? $payload['cartItems'] : [];
                if (!empty($cartItems)) {
                    $pricing = $productModel->calculateCartOrderWithVoucher($cartItems, $voucherCode, $customerEmail);
                    echo json_encode([
                        'ok'             => true,
                        'valid'          => true,
                        'voucher'        => $pricing['validatedVoucher'],
                        'discountAmount' => $pricing['voucherDiscountAmount'],
                        'pricing'        => $pricing,
                    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                } else {
                    $productId = (string) ($payload['productId'] ?? $payload['furnitureId'] ?? '');
                    $validated = $productModel->validateVoucherForCustomerAndProduct($voucherCode, $customerEmail, $productId);
                    echo json_encode([
                        'ok'             => true,
                        'valid'          => true,
                        'voucher'        => $validated,
                        'discountAmount' => (float) ($validated['discountAmount'] ?? $validated['discountValue'] ?? 0),
                    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                }
                exit;

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
                    $store['vouchers'] = $productModel->normalizeVouchersStatus($payload['vouchers']);
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
                        $store['vouchers'] = $productModel->normalizeVouchersStatus($payload['vouchers']);
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

            case 'login_user':
                $userModel = new User($db);
                $roleParam = trim((string) ($payload['role'] ?? 'Customer'));
                $expectedRole = strcasecmp($roleParam, 'admin') === 0 ? 'Admin' : 'Customer';
                $authenticated = $userModel->authenticate(
                    (string) ($payload['email'] ?? ''),
                    (string) ($payload['password'] ?? ''),
                    $expectedRole
                );
                $store = $db->readStore();
                $avatarUrl = (string) ($authenticated['avatar'] ?? '');
                $sessionObj = [
                    'email'  => $authenticated['email'],
                    'name'   => $authenticated['fullName'] ?? $authenticated['name'] ?? $authenticated['email'],
                    'role'   => $expectedRole === 'Admin' ? 'admin' : 'client',
                    'avatar' => $avatarUrl,
                ];
                $_SESSION['user'] = $sessionObj;
                $store['sessionUser'] = $sessionObj;
                if ($expectedRole === 'Customer') {
                    $isDemoRowena = strtolower((string) $authenticated['email']) === 'rowena.vance@vancearchitects.com';
                    $store['customerProfile'] = [
                        'name'    => $sessionObj['name'],
                        'email'   => $authenticated['email'],
                        'phone'   => (string) ($authenticated['phoneNumber'] ?? $authenticated['phone'] ?? ''),
                        'city'    => (string) ($authenticated['city'] ?? ($isDemoRowena ? 'New York, NY 10013' : '')),
                        'address' => (string) ($authenticated['address'] ?? ''),
                        'notes'   => (string) ($authenticated['notes'] ?? ($isDemoRowena ? 'Freight elevator available Mon–Fri 9:00 AM – 5:00 PM. Please call 30 minutes before arrival.' : '')),
                        'avatar'  => $avatarUrl,
                    ];
                }
                $db->writeStore($store);
                echo json_encode([
                    'ok'             => true,
                    'user'           => $authenticated,
                    'sessionUser'    => $sessionObj,
                    'mysqlConnected' => $db->isMySqlConnected(),
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;

            case 'register_customer':
                $userModel = new User($db);
                $registered = $userModel->register([
                    'fullName'    => $payload['fullName'] ?? $payload['name'] ?? '',
                    'email'       => $payload['email'] ?? '',
                    'password'    => $payload['password'] ?? '',
                    'phoneNumber' => $payload['phoneNumber'] ?? '',
                    'address'     => $payload['address'] ?? '',
                ]);
                $store = $db->readStore();
                $sessionObj = [
                    'email'  => $registered['email'],
                    'name'   => $registered['fullName'],
                    'role'   => 'client',
                    'avatar' => '',
                ];
                $_SESSION['user'] = $sessionObj;
                $_SESSION['cartItems'] = [];
                $store['sessionUser'] = $sessionObj;
                $store['cartItems'] = [];
                $store['customerProfile'] = [
                    'name'    => $registered['fullName'],
                    'email'   => $registered['email'],
                    'phone'   => (string) ($registered['phoneNumber'] ?? ''),
                    'city'    => '',
                    'address' => (string) ($registered['address'] ?? ''),
                    'notes'   => '',
                    'avatar'  => '',
                ];
                $db->writeStore($store);
                echo json_encode([
                    'ok'             => true,
                    'customer'       => $registered,
                    'sessionUser'    => $sessionObj,
                    'mysqlConnected' => $db->isMySqlConnected(),
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;

            case 'upload_product_image':
                $dataUrl = trim((string) ($payload['dataUrl'] ?? ''));
                $rawFileName = trim((string) ($payload['fileName'] ?? 'product.jpg'));
                if (!preg_match('/^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/i', $dataUrl, $matches)) {
                    throw new \InvalidArgumentException('Invalid image format. Please upload a JPG, PNG, WEBP, or GIF image.');
                }
                $ext = strtolower($matches[1]) === 'jpeg' ? 'jpg' : strtolower($matches[1]);
                $binary = base64_decode($matches[2], true);
                if ($binary === false || $binary === '') {
                    throw new \InvalidArgumentException('Could not decode uploaded image data.');
                }
                $baseName = pathinfo($rawFileName, PATHINFO_FILENAME);
                $safeSlug = preg_replace('/[^a-z0-9_-]+/i', '_', $baseName) ?: 'product';
                $safeSlug = trim($safeSlug, '_');
                $targetDir = dirname(__DIR__) . '/assets/images';
                if (!is_dir($targetDir)) {
                    @mkdir($targetDir, 0775, true);
                }
                $finalName = $safeSlug . '.' . $ext;
                $targetPath = $targetDir . '/' . $finalName;
                if (file_exists($targetPath)) {
                    $finalName = $safeSlug . '_' . time() . '.' . $ext;
                    $targetPath = $targetDir . '/' . $finalName;
                }
                if (@file_put_contents($targetPath, $binary) === false) {
                    throw new \RuntimeException('Failed to write image to assets/images/.');
                }
                $relativePath = 'assets/images/' . $finalName;
                echo json_encode([
                    'ok'        => true,
                    'imagePath' => $relativePath,
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
