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
     * Return all catalog products (both Normal Products and Customized Messenger Products)
     * with their color variants (`Customization.ColorFinish` / `ExtraCost`) and storewide discount percentages.
     * IMPORTANT: Both product types remain publicly visible to all customers.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAll(): array
    {
        $store = $this->db->readStore();
        $products = isset($store['products']) && is_array($store['products']) ? $store['products'] : [];
        return array_values(array_map(static function (array $product): array {
            $isCustomized = ($product['productType'] ?? '') === 'customized' || !empty($product['isCustomClientDesign']);
            $product['productType'] = $isCustomized ? 'customized' : 'standard';
            $product['origin'] = $isCustomized ? 'Messenger customization' : 'Admin';
            $product['isCustomClientDesign'] = $isCustomized;
            $product['publiclyVisible'] = true;
            $product['canBePurchased'] = true;
            $product['adminEditable'] = true;
            $product['customClientEmail'] = null;
            return $product;
        }, $products));
    }

    /**
     * Create or update a Normal Product ('standard') or Customized Product ('customized' from Messenger).
     * Both product types are stored in the same public catalog and visible to all customers.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function createOrUpdateProduct(array $input): array
    {
        $name = trim((string) ($input['name'] ?? ''));
        $sku = strtoupper(trim((string) ($input['sku'] ?? '')));
        $image = trim((string) ($input['image'] ?? ''));
        $price = (float) ($input['price'] ?? 0);
        $discountPercent = max(0.0, min(80.0, (float) ($input['discountPercent'] ?? 0)));
        $rawType = strtolower(trim((string) ($input['productType'] ?? 'standard')));

        if (strlen($name) < 3) {
            throw new ValidationException('Product Name must be at least 3 characters.');
        }
        if (strlen($sku) < 4) {
            throw new ValidationException('SKU Code must be at least 4 characters.');
        }
        if ($image === '') {
            throw new ValidationException('Product image is required when adding or editing a product.');
        }
        if ($price < 50.0) {
            throw new ValidationException('Base Price must be at least $50.');
        }

        $isCustomized = ($rawType === 'customized' || $rawType === 'messenger');
        $productType = $isCustomized ? 'customized' : 'standard';
        $origin = $isCustomized ? 'Messenger customization' : 'Admin';

        return [
            'id'                      => (string) ($input['id'] ?? ($isCustomized ? 'furn-cust-' : 'furn-std-') . strtolower($sku)),
            'productId'               => $sku,
            'sku'                     => $sku,
            'name'                    => $name,
            'image'                   => $image,
            'productType'             => $productType,
            'origin'                  => $origin,
            'isCustomClientDesign'    => $isCustomized,
            'publiclyVisible'         => true,
            'canBePurchased'          => true,
            'adminEditable'           => true,
            'customClientEmail'       => null,
            'categoryId'              => (string) ($input['categoryId'] ?? 'dining'),
            'price'                   => round($price),
            'discountPercent'         => round($discountPercent),
            'effectivePrice'          => round($price * (1.0 - $discountPercent / 100.0)),
            'dimensions'              => trim((string) ($input['dimensions'] ?? 'Standard Dimensions')),
            'messengerConversationId' => $isCustomized ? ($input['messengerConversationId'] ?? null) : null,
            'customizationNotes'      => $isCustomized ? ($input['customizationNotes'] ?? null) : null,
        ];
    }

    /**
     * Resolve the authoritative status of a voucher using Asia/Manila server time.
     *
     * @param array<string, mixed> $voucher
     */
    public function resolveVoucherStatus(array $voucher, ?int $nowTs = null): string
    {
        $rawStatus = trim((string) ($voucher['status'] ?? 'Active'));
        if ($rawStatus === 'Used') {
            return 'Used';
        }
        if ($rawStatus === 'Revoked' || $rawStatus === 'Cancelled') {
            return 'Revoked';
        }
        if ($rawStatus === 'Expired') {
            return 'Expired';
        }

        $manilaTz = new \DateTimeZone('Asia/Manila');
        $now = $nowTs ?? (new \DateTimeImmutable('now', $manilaTz))->getTimestamp();
        $expTs = $this->resolveVoucherExpirationTimestamp($voucher, $manilaTz);

        if ($expTs !== null) {
            $remainingSec = $expTs - $now;
            if ($remainingSec <= 0) {
                return 'Expired';
            }
            if ($remainingSec <= 3600) {
                return 'Expiring Soon';
            }
        }

        return 'Active';
    }

    /**
     * Resolve the Unix timestamp of a voucher's expiration in Asia/Manila timezone.
     *
     * @param array<string, mixed> $voucher
     */
    public function resolveVoucherExpirationTimestamp(array $voucher, ?\DateTimeZone $manilaTz = null): ?int
    {
        $tz = $manilaTz ?? new \DateTimeZone('Asia/Manila');
        $expiresAt = trim((string) ($voucher['expiresAt'] ?? ''));
        if ($expiresAt !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiresAt)) {
            try {
                $dt = new \DateTimeImmutable($expiresAt, $tz);
                return $dt->getTimestamp();
            } catch (\Throwable) {
                // Fall back to expiryDate
            }
        }

        $expiryDate = trim((string) ($voucher['expiryDate'] ?? $expiresAt));
        if ($expiryDate !== '') {
            try {
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiryDate)) {
                    $dt = new \DateTimeImmutable($expiryDate . ' 23:59:59', $tz);
                } else {
                    $dt = new \DateTimeImmutable($expiryDate, $tz);
                }
                return $dt->getTimestamp();
            } catch (\Throwable) {
                return null;
            }
        }

        return null;
    }

    /**
     * Normalize all voucher statuses dynamically based on current server time.
     *
     * @param array<int, array<string, mixed>> $vouchers
     * @return array<int, array<string, mixed>>
     */
    public function normalizeVouchersStatus(array $vouchers): array
    {
        $manilaTz = new \DateTimeZone('Asia/Manila');
        $nowTs = (new \DateTimeImmutable('now', $manilaTz))->getTimestamp();

        foreach ($vouchers as &$v) {
            if (is_array($v)) {
                $v['discountType'] = 'fixed';
                $v['status'] = $this->resolveVoucherStatus($v, $nowTs);
            }
        }
        unset($v);

        return $vouchers;
    }

    /**
     * Validate and create a fixed-amount discount voucher with server-side issuance timestamp
     * and Asia/Manila expiration handling.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function createVoucher(array $input): array
    {
        $store = $this->db->readStore();
        $products = isset($store['products']) && is_array($store['products']) ? $store['products'] : [];
        $vouchers = isset($store['vouchers']) && is_array($store['vouchers']) ? $store['vouchers'] : [];

        $customerEmail = strtolower(trim((string) ($input['customerEmail'] ?? '')));
        if ($customerEmail === '' || filter_var($customerEmail, FILTER_VALIDATE_EMAIL) === false) {
            throw new ValidationException('Enter a valid customer email address.');
        }

        $furnitureId = trim((string) ($input['furnitureId'] ?? $input['productId'] ?? ''));
        $matchedProduct = null;
        foreach ($products as $prod) {
            if ((string) ($prod['id'] ?? '') === $furnitureId) {
                $matchedProduct = $prod;
                break;
            }
        }

        if ($furnitureId === '' || $matchedProduct === null) {
            throw new ValidationException('Select a valid eligible product from the catalog.');
        }

        $code = strtoupper(preg_replace('/\s+/', '-', trim((string) ($input['code'] ?? ''))) ?? '');
        if (strlen($code) < 3) {
            throw new ValidationException('Enter or generate a valid voucher code (at least 3 characters).');
        }

        foreach ($vouchers as $existing) {
            if (strtoupper(trim((string) ($existing['code'] ?? ''))) === $code) {
                throw new ValidationException('Voucher code "' . $code . '" already exists. Please generate or enter a unique code.');
            }
        }

        $discountAmount = round((float) ($input['discountAmount'] ?? $input['discountValue'] ?? 0), 2);
        if ($discountAmount <= 0) {
            throw new ValidationException('Discount Amount ($) must be greater than $0.');
        }

        $maxProductPrice = (float) ($matchedProduct['effectivePrice'] ?? $matchedProduct['price'] ?? 0);
        if ($maxProductPrice > 0 && $discountAmount > $maxProductPrice) {
            throw new ValidationException(
                sprintf(
                    'Discount Amount ($%s) cannot exceed the eligible product\'s price ($%s for %s).',
                    number_format($discountAmount, 0),
                    number_format($maxProductPrice, 0),
                    (string) ($matchedProduct['name'] ?? 'Selected Product')
                )
            );
        }

        $manilaTz = new \DateTimeZone('Asia/Manila');
        $issuedNow = new \DateTimeImmutable('now', $manilaTz);
        $issuedTs = $issuedNow->getTimestamp();

        $expirationMethod = strtolower(trim((string) ($input['expirationMethod'] ?? 'duration')));
        if ($expirationMethod !== 'custom' && $expirationMethod !== 'duration') {
            throw new ValidationException('Select a valid expiration method (Custom Date & Time or Set Duration).');
        }

        if ($expirationMethod === 'custom') {
            $expiryDate = trim((string) ($input['expiryDate'] ?? ''));
            $expiryTime = trim((string) ($input['expiryTime'] ?? ''));
            if ($expiryDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiryDate)) {
                throw new ValidationException('Select a valid expiration date.');
            }
            if ($expiryTime === '' || !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $expiryTime)) {
                throw new ValidationException('Select a valid expiration time.');
            }
            $timeNormalized = strlen($expiryTime) === 5 ? $expiryTime . ':00' : $expiryTime;
            try {
                $expiresDt = new \DateTimeImmutable($expiryDate . ' ' . $timeNormalized, $manilaTz);
            } catch (\Throwable) {
                throw new ValidationException('Invalid expiration date and time.');
            }
            if ($expiresDt->getTimestamp() <= $issuedTs) {
                throw new ValidationException('Expiration date and time cannot be in the past. Please choose a future time (Asia/Manila).');
            }
        } else {
            $durationValue = (float) ($input['durationValue'] ?? 0);
            $durationUnit = strtolower(trim((string) ($input['durationUnit'] ?? 'hours')));
            if ($durationValue <= 0) {
                throw new ValidationException('Duration must be greater than 0.');
            }
            $unitSeconds = match ($durationUnit) {
                'minutes', 'minute' => 60,
                'hours', 'hour'     => 3600,
                'days', 'day'       => 86400,
                default             => throw new ValidationException('Select a valid duration unit (Minutes, Hours, or Days).'),
            };
            $expiresTs = $issuedTs + (int) round($durationValue * $unitSeconds);
            $expiresDt = (new \DateTimeImmutable('@' . $expiresTs))->setTimezone($manilaTz);
        }

        $emailPrefix = explode('@', $customerEmail)[0] ?: 'Showroom Client';
        $defaultName = ucwords(str_replace(['.', '_', '-'], ' ', $emailPrefix));
        $customerName = trim((string) ($input['customerName'] ?? '')) ?: $defaultName;
        $issuedByAdmin = trim((string) ($input['issuedByAdmin'] ?? '')) ?: 'Lillia Mercier';
        $voucherId = strtoupper(trim((string) ($input['voucherId'] ?? ('VCH-LR-' . (100 + (abs((int) crc32($code)) % 899))))));

        $voucher = [
            'id'               => (string) ($input['id'] ?? ('vch-' . (int) round(microtime(true) * 1000))),
            'voucherId'        => $voucherId,
            'code'             => $code,
            'customerEmail'    => $customerEmail,
            'customerName'     => $customerName,
            'furnitureId'      => (string) $matchedProduct['id'],
            'furnitureSku'     => (string) ($matchedProduct['sku'] ?? 'LR-ITEM'),
            'furnitureName'    => (string) ($matchedProduct['name'] ?? 'Eligible Piece'),
            'productPrice'     => $maxProductPrice,
            'discountType'     => 'fixed',
            'discountPercent'  => null,
            'discountAmount'   => $discountAmount,
            'discountValue'    => $discountAmount,
            'status'           => 'Active',
            'issuedByAdmin'    => $issuedByAdmin,
            'createdAt'        => $issuedNow->format('Y-m-d'),
            'issuedAt'         => $issuedNow->format(\DateTimeInterface::ATOM),
            'expiryDate'       => $expiresDt->format('Y-m-d'),
            'expiresAt'        => $expiresDt->format(\DateTimeInterface::ATOM),
            'expirationMethod' => $expirationMethod,
        ];
        $voucher['status'] = $this->resolveVoucherStatus($voucher, $issuedTs);

        array_unshift($vouchers, $voucher);
        $store['vouchers'] = $this->normalizeVouchersStatus($vouchers);
        $this->db->writeStore($store);

        return $voucher;
    }

    /**
     * Revoke an issued voucher by ID or Code.
     *
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function revokeVoucher(string $voucherId): array
    {
        $cleanId = trim($voucherId);
        if ($cleanId === '') {
            throw new ValidationException('Voucher ID is required.');
        }

        $store = $this->db->readStore();
        $vouchers = isset($store['vouchers']) && is_array($store['vouchers']) ? $store['vouchers'] : [];
        $manilaTz = new \DateTimeZone('Asia/Manila');
        $revokedAt = (new \DateTimeImmutable('now', $manilaTz))->format(\DateTimeInterface::ATOM);

        $revokedVoucher = null;
        foreach ($vouchers as &$v) {
            $matchesId = (string) ($v['id'] ?? '') === $cleanId;
            $matchesCode = strcasecmp((string) ($v['code'] ?? ''), $cleanId) === 0;
            if (!$matchesId && !$matchesCode) {
                continue;
            }
            if (($v['status'] ?? '') === 'Used') {
                throw new ValidationException('Cannot revoke a voucher that has already been redeemed.');
            }
            $v['status'] = 'Revoked';
            $v['revokedAt'] = $revokedAt;
            $revokedVoucher = $v;
            break;
        }
        unset($v);

        if ($revokedVoucher === null) {
            throw new ValidationException('Voucher not found.');
        }

        $store['vouchers'] = $this->normalizeVouchersStatus($vouchers);
        $this->db->writeStore($store);

        return $revokedVoucher;
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
        $products = isset($store['products']) && is_array($store['products']) ? $store['products'] : [];

        foreach ($vouchers as $voucher) {
            if (strtoupper((string) ($voucher['code'] ?? '')) !== $normalizedCode) {
                continue;
            }

            $voucherEmail = strtolower(trim((string) ($voucher['customerEmail'] ?? '')));
            if ($voucherEmail !== '' && $voucherEmail !== 'all' && $voucherEmail !== '*') {
                if ($normalizedEmail === '' || $voucherEmail !== $normalizedEmail) {
                    throw new ValidationException(
                        'SQLSTATE[45000]: Voucher does not belong to the customer of this order (' . $voucher['customerEmail'] . ' only).'
                    );
                }
            }

            $targetProductId = (string) ($voucher['furnitureId'] ?? $voucher['productId'] ?? '');
            if ($targetProductId !== $productId) {
                $targetName = (string) ($voucher['furnitureName'] ?? $voucher['productName'] ?? $targetProductId);
                throw new ValidationException(
                    'This voucher is only valid for the selected product (' . $targetName . ').'
                );
            }

            $effectiveStatus = $this->resolveVoucherStatus($voucher);
            if ($effectiveStatus === 'Expired') {
                throw new ValidationException('SQLSTATE[45000]: Voucher "' . $normalizedCode . '" has expired.');
            }
            if ($effectiveStatus === 'Revoked') {
                throw new ValidationException('SQLSTATE[45000]: Voucher "' . $normalizedCode . '" has been revoked.');
            }
            if ($effectiveStatus !== 'Active' && $effectiveStatus !== 'Expiring Soon') {
                throw new ValidationException('SQLSTATE[45000]: Voucher is not active (Status: ' . $effectiveStatus . ').');
            }

            $discountAmount = (float) ($voucher['discountAmount'] ?? $voucher['discountValue'] ?? 0);
            if ($discountAmount <= 0) {
                throw new ValidationException('Voucher discount amount must be greater than $0.');
            }

            foreach ($products as $prod) {
                if ((string) ($prod['id'] ?? '') === $targetProductId) {
                    $maxPrice = (float) ($prod['effectivePrice'] ?? $prod['price'] ?? 0);
                    if ($maxPrice > 0 && $discountAmount > $maxPrice) {
                        throw new ValidationException('Voucher discount amount exceeds the eligible product price.');
                    }
                    break;
                }
            }

            $voucher['status'] = $effectiveStatus;
            return $voucher;
        }

        throw new ValidationException('Voucher code "' . $normalizedCode . '" was not found.');
    }

    /**
     * Server-side cart & voucher validation and discount recalculation.
     * Ensures a product-specific voucher ONLY discounts the product selected by the admin
     * and never discounts other products in the customer's shopping cart.
     *
     * @param array<int, array<string, mixed>> $cartItems
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function calculateCartOrderWithVoucher(
        array $cartItems,
        ?string $voucherCode,
        string $customerEmail
    ): array {
        if (empty($cartItems)) {
            throw new ValidationException('Shopping cart cannot be empty.');
        }

        $store = $this->db->readStore();
        $products = isset($store['products']) && is_array($store['products']) ? $store['products'] : [];
        $vouchers = isset($store['vouchers']) && is_array($store['vouchers']) ? $store['vouchers'] : [];

        $productMap = [];
        foreach ($products as $prod) {
            if (!empty($prod['id'])) {
                $productMap[(string) $prod['id']] = $prod;
            }
        }

        $matchedVoucher = null;
        $targetProductId = '';
        $normalizedCode = strtoupper(trim((string) $voucherCode));

        if ($normalizedCode !== '') {
            foreach ($vouchers as $v) {
                if (strtoupper(trim((string) ($v['code'] ?? ''))) === $normalizedCode) {
                    $matchedVoucher = $v;
                    break;
                }
            }

            if ($matchedVoucher === null) {
                throw new ValidationException('Voucher code "' . $normalizedCode . '" was not found.');
            }

            $effectiveStatus = $this->resolveVoucherStatus($matchedVoucher);
            if ($effectiveStatus === 'Expired') {
                throw new ValidationException('Voucher "' . $normalizedCode . '" has expired.');
            }
            if ($effectiveStatus === 'Revoked') {
                throw new ValidationException('Voucher "' . $normalizedCode . '" has been revoked and is no longer valid.');
            }
            if ($effectiveStatus !== 'Active' && $effectiveStatus !== 'Expiring Soon') {
                throw new ValidationException('Voucher "' . $normalizedCode . '" is no longer active (' . $effectiveStatus . ').');
            }
            $matchedVoucher['status'] = $effectiveStatus;

            $voucherEmail = strtolower(trim((string) ($matchedVoucher['customerEmail'] ?? '')));
            $normalizedEmail = strtolower(trim($customerEmail));
            if ($voucherEmail !== '' && $voucherEmail !== 'all' && $voucherEmail !== '*') {
                if ($normalizedEmail === '' || $voucherEmail !== $normalizedEmail) {
                    throw new ValidationException(
                        'SQLSTATE[45000]: Voucher does not belong to the customer of this order.'
                    );
                }
            }

            $targetProductId = (string) ($matchedVoucher['furnitureId'] ?? $matchedVoucher['productId'] ?? '');
            $hasEligibleProductInCart = false;
            foreach ($cartItems as $item) {
                $itemProductId = (string) ($item['productId'] ?? $item['furnitureId'] ?? '');
                if ($itemProductId !== '' && $itemProductId === $targetProductId) {
                    $hasEligibleProductInCart = true;
                    break;
                }
            }

            if (!$hasEligibleProductInCart) {
                $targetName = (string) ($matchedVoucher['furnitureName'] ?? $matchedVoucher['productName'] ?? $targetProductId);
                throw new ValidationException(
                    'This voucher is only valid for the selected product (' . $targetName . ').'
                );
            }

            $discountVal = (float) ($matchedVoucher['discountAmount'] ?? $matchedVoucher['discountValue'] ?? 0);
            if ($discountVal <= 0) {
                throw new ValidationException('Voucher "' . $normalizedCode . '" has an invalid discount amount.');
            }
            if (isset($productMap[$targetProductId])) {
                $maxProdPrice = (float) ($productMap[$targetProductId]['effectivePrice'] ?? $productMap[$targetProductId]['price'] ?? 0);
                if ($maxProdPrice > 0 && $discountVal > $maxProdPrice) {
                    throw new ValidationException(
                        'Voucher "' . $normalizedCode . '" discount ($' . $discountVal . ') exceeds the eligible product price ($' . $maxProdPrice . ').'
                    );
                }
            }
        }

        $isPercentage = $matchedVoucher !== null && (
            ($matchedVoucher['discountType'] ?? '') === 'percentage' ||
            (float) ($matchedVoucher['discountPercent'] ?? 0) > 0
        );
        $percentageRate = $isPercentage
            ? max(0.0, min(100.0, (float) ($matchedVoucher['discountPercent'] ?? $matchedVoucher['discountValue'] ?? $matchedVoucher['discountAmount'] ?? 0)))
            : 0.0;
        $remainingFixedDiscount = ($matchedVoucher !== null && !$isPercentage)
            ? max(0.0, (float) ($matchedVoucher['discountAmount'] ?? $matchedVoucher['discountValue'] ?? 0))
            : 0.0;

        $rawSubtotal = 0.0;
        $eligibleSubtotal = 0.0;
        $totalDiscount = 0.0;
        $lineBreakdowns = [];

        foreach ($cartItems as $item) {
            $itemProductId = (string) ($item['productId'] ?? $item['furnitureId'] ?? '');
            if (!isset($productMap[$itemProductId])) {
                throw new ValidationException('Invalid product "' . $itemProductId . '" in cart.');
            }

            $authoritativeProduct = $productMap[$itemProductId];
            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            $availableStock = max(0, (int) ($authoritativeProduct['inStockCount'] ?? 0));
            if ($availableStock <= 0) {
                throw new ValidationException('Product "' . ($authoritativeProduct['name'] ?? $itemProductId) . '" is currently out of stock.');
            }
            if ($quantity > $availableStock) {
                throw new ValidationException(
                    'Requested quantity (' . $quantity . ') for "' . ($authoritativeProduct['name'] ?? $itemProductId) . '" exceeds available stock (' . $availableStock . ').'
                );
            }

            $unitPrice = (float) ($authoritativeProduct['effectivePrice'] ?? $authoritativeProduct['price'] ?? 0);
            $rawLineTotal = round($unitPrice * $quantity, 2);
            $rawSubtotal += $rawLineTotal;

            $isEligible = ($matchedVoucher !== null && $itemProductId === $targetProductId);
            $lineDiscount = 0.0;

            if ($isEligible) {
                $eligibleSubtotal += $rawLineTotal;
                if ($isPercentage) {
                    $lineDiscount = min($rawLineTotal, round($rawLineTotal * ($percentageRate / 100.0)));
                } else {
                    $lineDiscount = min($rawLineTotal, $remainingFixedDiscount);
                    $remainingFixedDiscount = max(0.0, $remainingFixedDiscount - $lineDiscount);
                }
                $totalDiscount += $lineDiscount;
            }

            $lineBreakdowns[] = [
                'productId'         => $itemProductId,
                'productName'       => (string) ($authoritativeProduct['name'] ?? ''),
                'unitPrice'         => $unitPrice,
                'quantity'          => $quantity,
                'rawLineTotal'      => $rawLineTotal,
                'isVoucherEligible' => $isEligible,
                'lineDiscount'      => $lineDiscount,
                'finalLineTotal'    => max(0.0, $rawLineTotal - $lineDiscount),
            ];
        }

        $subtotal = max(0.0, $rawSubtotal - $totalDiscount);
        $deliveryFee = $subtotal === 0.0 ? 0.0 : ($subtotal >= 5000.0 ? 0.0 : 250.0);
        $totalAmount = $subtotal + $deliveryFee;

        return [
            'rawSubtotal'           => $rawSubtotal,
            'eligibleSubtotal'      => $eligibleSubtotal,
            'voucherDiscountAmount' => $totalDiscount,
            'subtotal'              => $subtotal,
            'whiteGloveDeliveryFee' => $deliveryFee,
            'totalAmount'           => $totalAmount,
            'lineBreakdowns'        => $lineBreakdowns,
            'validatedVoucher'      => $matchedVoucher,
        ];
    }

    /**
     * Validate and build a Workshop Raw Material record (Material table).
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function createOrUpdateMaterial(array $input): array
    {
        $name = trim((string) ($input['name'] ?? $input['materialName'] ?? ''));
        $materialType = trim((string) ($input['materialType'] ?? 'Hardwood Timber'));
        $unit = trim((string) ($input['unit'] ?? 'bd ft'));
        $unitCost = (float) ($input['unitCost'] ?? -1);
        $stockQuantity = (float) ($input['stockQuantity'] ?? 0);

        if (strlen($name) < 2) {
            throw new ValidationException('Material Name must be at least 2 characters.');
        }
        if ($unit === '') {
            throw new ValidationException('Unit of measurement is required.');
        }
        if ($unitCost < 0) {
            throw new ValidationException('Unit Cost must be 0 or greater.');
        }
        if ($stockQuantity < 0) {
            throw new ValidationException('Stock Quantity must be 0 or greater.');
        }

        return [
            'id'            => (string) ($input['id'] ?? 'mat-' . time()),
            'name'          => $name,
            'materialType'  => $materialType,
            'unit'          => $unit,
            'unitCost'      => round($unitCost, 2),
            'stockQuantity' => round($stockQuantity, 2),
            'inStockCount'  => round($stockQuantity, 2),
            'updatedAt'     => date('Y-m-d'),
        ];
    }

    /**
     * Record a Material Stock In or Stock Out movement and enforce non-negative inventory levels.
     *
     * @param array<string, mixed> $materialOrProduct
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function recordStockMovement(array $materialOrProduct, array $input): array
    {
        $type = trim((string) ($input['transactionType'] ?? 'Stock In')) === 'Stock Out' ? 'Stock Out' : 'Stock In';
        $quantity = (float) ($input['quantity'] ?? 0);
        if ($quantity <= 0) {
            throw new ValidationException('Stock movement quantity must be greater than zero.');
        }

        $previousStock = max(0.0, (float) ($materialOrProduct['stockQuantity'] ?? $materialOrProduct['inStockCount'] ?? 0));
        if ($type === 'Stock Out' && $quantity > $previousStock) {
            throw new ValidationException(
                'Cannot deduct ' . $quantity . ' from "' . ($materialOrProduct['name'] ?? 'Material') . '". Only ' . $previousStock . ' available in stock.'
            );
        }

        $newStock = round($type === 'Stock In' ? ($previousStock + $quantity) : ($previousStock - $quantity), 2);

        return [
            'previousStock'   => $previousStock,
            'newStock'        => $newStock,
            'transactionType' => $type,
            'quantity'        => $quantity,
        ];
    }

    /**
     * Remove a product from the catalog by ID.
     *
     * @param array<int, array<string, mixed>> $products
     * @param string $productId
     * @return array<int, array<string, mixed>>
     * @throws ValidationException
     */
    public function removeProduct(array $products, string $productId): array
    {
        $cleanId = trim($productId);
        if ($cleanId === '') {
            throw new ValidationException('Product ID is required to remove a product.');
        }

        $filtered = array_values(array_filter($products, static function (array $p) use ($cleanId): bool {
            return (string) ($p['id'] ?? '') !== $cleanId;
        }));

        if (count($filtered) === count($products)) {
            throw new ValidationException('Product not found in catalog.');
        }

        return $filtered;
    }
}



