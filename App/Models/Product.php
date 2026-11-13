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
            'id'                      => (string) ($input['id'] ?? ($isCustomized ? 'furn-cust-' : 'furn-std-') . time()),
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

            $voucherEmail = strtolower(trim((string) ($voucher['customerEmail'] ?? '')));
            if ($voucherEmail !== '' && $voucherEmail !== 'all' && $voucherEmail !== '*' && $voucherEmail !== $normalizedEmail) {
                throw new ValidationException(
                    'SQLSTATE[45000]: Voucher does not belong to the customer of this order (' . $voucher['customerEmail'] . ' only).'
                );
            }

            $targetProductId = (string) ($voucher['furnitureId'] ?? $voucher['productId'] ?? '');
            if ($targetProductId !== $productId) {
                $targetName = (string) ($voucher['furnitureName'] ?? $voucher['productName'] ?? $targetProductId);
                throw new ValidationException(
                    'This voucher is only valid for the selected product (' . $targetName . ').'
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

            if (($matchedVoucher['status'] ?? '') !== 'Active') {
                throw new ValidationException('Voucher "' . $normalizedCode . '" is no longer active.');
            }

            $voucherEmail = strtolower(trim((string) ($matchedVoucher['customerEmail'] ?? '')));
            $normalizedEmail = strtolower(trim($customerEmail));
            if ($voucherEmail !== '' && $voucherEmail !== 'all' && $voucherEmail !== '*' && $voucherEmail !== $normalizedEmail) {
                throw new ValidationException(
                    'SQLSTATE[45000]: Voucher does not belong to the customer of this order.'
                );
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
     * Validate and build a Supplier record with multiple associated product IDs.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function createOrUpdateSupplier(array $input): array
    {
        $name = trim((string) ($input['name'] ?? ''));
        $contactPerson = trim((string) ($input['contactPerson'] ?? ''));
        $phone = trim((string) ($input['phone'] ?? ''));
        $address = trim((string) ($input['address'] ?? ''));
        $productIds = isset($input['productIds']) && is_array($input['productIds'])
            ? array_values(array_unique(array_filter(array_map('strval', $input['productIds']))))
            : [];

        if (strlen($name) < 2) {
            throw new ValidationException('Supplier Name must be at least 2 characters.');
        }
        if (strlen($contactPerson) < 2) {
            throw new ValidationException('Contact Person is required.');
        }
        if (strlen($phone) < 5) {
            throw new ValidationException('Phone Number is required.');
        }
        if (strlen($address) < 5) {
            throw new ValidationException('Business Address is required.');
        }

        return [
            'id'            => (string) ($input['id'] ?? 'sup-' . time()),
            'name'          => $name,
            'contactPerson' => $contactPerson,
            'phone'         => $phone,
            'address'       => $address,
            'productIds'    => $productIds,
            'updatedAt'     => date('Y-m-d'),
        ];
    }

    /**
     * Record a Stock In or Stock Out movement and enforce non-negative inventory levels.
     *
     * @param array<string, mixed> $product
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function recordStockMovement(array $product, array $input): array
    {
        $type = trim((string) ($input['transactionType'] ?? 'Stock In')) === 'Stock Out' ? 'Stock Out' : 'Stock In';
        $quantity = (int) ($input['quantity'] ?? 0);
        if ($quantity <= 0) {
            throw new ValidationException('Stock movement quantity must be greater than zero.');
        }

        $previousStock = max(0, (int) ($product['inStockCount'] ?? 0));
        if ($type === 'Stock Out' && $quantity > $previousStock) {
            throw new ValidationException(
                'Cannot deduct ' . $quantity . ' units from "' . ($product['name'] ?? 'Product') . '". Only ' . $previousStock . ' available in stock.'
            );
        }

        $newStock = $type === 'Stock In' ? ($previousStock + $quantity) : ($previousStock - $quantity);

        return [
            'previousStock'   => $previousStock,
            'newStock'        => $newStock,
            'transactionType' => $type,
            'quantity'        => $quantity,
        ];
    }
}

