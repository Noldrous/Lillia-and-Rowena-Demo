<?php

declare(strict_types=1);

/**
 * Part 3 Self-Test Script (test_user.php)
 * Verifies Composer PSR-4 autoloading, App\Models\User authentication & validation,
 * Library\Exceptions\*, and single-customer single-product Voucher rules from database/furniture.sql.
 */

require_once __DIR__ . '/bootstrap.php';

use App\Models\Product;
use App\Models\User;
use Library\Exceptions\AuthenticationException;
use Library\Exceptions\ValidationException;

$passed = 0;
$failed = 0;

function assertTest(bool $condition, string $label): void
{
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "[PASS] {$label}\n";
    } else {
        $failed++;
        echo "[FAIL] {$label}\n";
    }
}

echo "=== Lillia and Rowena Furniture — Part 3 Self-Test (test_user.php) ===\n\n";

$userModel = new User();

// Test 1: Valid Customer login (Clara Vance)
try {
    $customer = $userModel->authenticate('clara.vance@architects.io', 'ClientPass2025!');
    assertTest(
        $customer['email'] === 'clara.vance@architects.io' && $customer['role'] === 'Customer',
        'Authenticate seeded Customer (clara.vance@architects.io)'
    );
} catch (Throwable $e) {
    assertTest(false, 'Authenticate seeded Customer threw unexpected exception: ' . $e->getMessage());
}

// Test 2: Valid Admin login (Lillia Mercier)
try {
    $admin = $userModel->authenticate('admin@lilliarowena.com', 'MasterJoinery#01', 'Admin');
    assertTest(
        $admin['email'] === 'admin@lilliarowena.com' && $admin['role'] === 'Admin',
        'Authenticate seeded Admin (admin@lilliarowena.com)'
    );
} catch (Throwable $e) {
    assertTest(false, 'Authenticate seeded Admin threw unexpected exception: ' . $e->getMessage());
}

// Test 3: ValidationException on invalid email format
try {
    $userModel->authenticate('not-an-email', 'ClientPass2025!');
    assertTest(false, 'Invalid email should throw ValidationException');
} catch (ValidationException $e) {
    assertTest(isset($e->getErrors()['email']), 'ValidationException thrown for malformed email address');
}

// Test 4: AuthenticationException on wrong password
try {
    $userModel->authenticate('clara.vance@architects.io', 'WrongPass123!');
    assertTest(false, 'Wrong password should throw AuthenticationException');
} catch (AuthenticationException $e) {
    assertTest(true, 'AuthenticationException thrown for wrong password');
}

// Test 5: Voucher rule verification (check_voucher_use from database/furniture.sql)
$productModel = new Product();
try {
    $voucher = $productModel->validateVoucherForCustomerAndProduct(
        'VCH-CLARA-SOFA-220',
        'clara.vance@architects.io',
        'prod-rowena-sofa'
    );
    assertTest(
        (int) $voucher['discountValue'] === 220,
        'Single-customer single-product Messenger Voucher verified for Clara Vance on prod-rowena-sofa ($220 off)'
    );
} catch (Throwable $e) {
    assertTest(false, 'Valid voucher check failed: ' . $e->getMessage());
}

// Test 6: Voucher rejected when used by wrong customer (SQLSTATE 45000 rule)
try {
    $productModel->validateVoucherForCustomerAndProduct(
        'VCH-CLARA-SOFA-220',
        'j.thorne@studio-thorne.com',
        'prod-rowena-sofa'
    );
    assertTest(false, 'Voucher used by another customer must throw ValidationException');
} catch (ValidationException $e) {
    assertTest(
        str_contains($e->getMessage(), 'SQLSTATE[45000]'),
        'SQLSTATE[45000] enforced when another customer attempts to use Clara Vance\'s voucher'
    );
}

echo "\nSummary: {$passed} passed, {$failed} failed.\n";
exit($failed > 0 ? 1 : 0);
