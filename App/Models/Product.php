<?php

declare(strict_types=1);

namespace App\Models;

use Library\Database;
use Library\Exceptions\ValidationException;

/**
 * Product & Voucher Domain Model mapped to `Product`, `Category`, `Voucher`, `Order_Item`,
 * and `Customization` tables in `database/furniture.sql`.
 */
class Product
{
    private Database $db;

    public function __construct(?Database $db = null)
    {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Return all catalog products with their color variants (`Customization.ColorFinish` / `ExtraCost`)
     * and storewide discount percentages.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAll(): array
    {
        $store = $this->db->readStore();
        return isset($store['products']) && is_array($store['products']) ? $store['products'] : [];
    }

    /**
     * Validate a single-customer, single-product Voucher matching the MySQL stored procedure
     * `check_voucher_use(p_voucher_id, p_order_id, p_check_status)` in `database/furniture.sql`.
     *
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function validateVoucherForCustomerAndProduct(
        string $code,
        string $customerEmail,
        string $productId
    ): array {
        $normalizedCode = strtoupper(trim($code));
        $normalizedEmail = strtolower(trim($customerEmail));

        if ($normalizedCode === '') {
            throw new ValidationException('Voucher code is required.');
        }

        $store = $this->db->readStore();
        $vouchers = isset($store['vouchers']) && is_array($store['vouchers']) ? $store['vouchers'] : [];

        foreach ($vouchers as $voucher) {
            if (strtoupper((string) ($voucher['code'] ?? '')) !== $normalizedCode) {
                continue;
            }

            if (strtolower((string) ($voucher['customerEmail'] ?? '')) !== $normalizedEmail) {
                throw new ValidationException(
                    'SQLSTATE[45000]: Voucher does not belong to the customer of this order (' . $voucher['customerEmail'] . ' only).'
                );
            }

            if ((string) ($voucher['productId'] ?? '') !== $productId) {
                throw new ValidationException(
                    'FOREIGN KEY (VoucherID, ProductID) violation: Voucher is exclusively bound to product "' . ($voucher['productName'] ?? $voucher['productId']) . '".'
                );
            }

            if (($voucher['status'] ?? '') !== 'Active') {
                throw new ValidationException('SQLSTATE[45000]: Voucher is not active (Status: ' . ($voucher['status'] ?? 'Unknown') . ').');
            }

            if (!empty($voucher['expiryDate']) && (string) $voucher['expiryDate'] < date('Y-m-d')) {
                throw new ValidationException('SQLSTATE[45000]: Voucher has expired.');
            }

            return $voucher;
        }

        throw new ValidationException('Voucher code "' . $normalizedCode . '" was not found.');
    }
}
