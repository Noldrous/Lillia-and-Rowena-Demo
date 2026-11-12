<?php

declare(strict_types=1);

namespace LilliaRowena\Atelier\Services;

use LilliaRowena\Atelier\Database\JsonStore;
use LilliaRowena\Atelier\Models\Order;
use LilliaRowena\Atelier\Models\Product;
use LilliaRowena\Atelier\Models\Voucher;
use PDO;
use RuntimeException;

/**
 * PSR-4 Service managing Product CRUD, Color-Tiered Pricing, Storewide Discounts,
 * Custom Client Messenger Designs, and Single-Customer Single-Product Vouchers.
 */
final class VoucherAndCatalogService
{
    public function __construct(
        private readonly JsonStore $jsonStore,
        private readonly ?PDO $db = null
    ) {
    }

    /**
     * Returns full catalog, vouchers, orders, and workshop records.
     *
     * @return array<string, mixed>
     */
    public function getCatalogState(): array
    {
        return $this->jsonStore->readAll();
    }

    /**
     * Adds or updates a product (including customer designs sent via Admin Messenger
     * and selectable color variants with varying prices).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function upsertProduct(array $payload): array
    {
        $state = $this->jsonStore->readAll();
        $products = is_array($state['products'] ?? null) ? $state['products'] : [];

        $product = Product::fromArray($payload);
        $productArr = $product->toArray();

        $updated = false;
        foreach ($products as $index => $existing) {
            if (($existing['id'] ?? '') === $product->id || strcasecmp((string) ($existing['sku'] ?? ''), $product->sku) === 0) {
                $products[$index] = $productArr;
                $updated = true;
                break;
            }
        }

        if (!$updated) {
            array_unshift($products, $productArr);
        }

        $state['products'] = $products;
        $this->jsonStore->writeAll($state);

        return $productArr;
    }

    /**
     * Issues a single-use Voucher from the Business Owner (Admin) to ONE Customer
     * for ONE specific Product, generating a placeholder Messenger link.
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function issueExclusiveProductVoucher(array $payload): array
    {
        $discountAmount = (float) ($payload['discountAmount'] ?? 0);
        if ($discountAmount <= 0) {
            throw new RuntimeException('Voucher discountAmount must be greater than 0.');
        }

        $state = $this->jsonStore->readAll();
        $vouchers = is_array($state['vouchers'] ?? null) ? $state['vouchers'] : [];

        $voucher = Voucher::fromArray($payload);
        $voucherArr = $voucher->toArray();

        array_unshift($vouchers, $voucherArr);
        $state['vouchers'] = $vouchers;
        $this->jsonStore->writeAll($state);

        return $voucherArr;
    }

    /**
     * Marks a single-customer, single-product Voucher as Used when redeemed on an order.
     *
     * @return array<string, mixed>|null
     */
    public function redeemVoucher(string $code): ?array
    {
        $state = $this->jsonStore->readAll();
        $vouchers = is_array($state['vouchers'] ?? null) ? $state['vouchers'] : [];
        $normalized = strtoupper(trim($code));
        $redeemed = null;

        foreach ($vouchers as $idx => $v) {
            if (strtoupper((string) ($v['code'] ?? '')) === $normalized) {
                $vouchers[$idx]['status'] = 'Used';
                $redeemed = $vouchers[$idx];
                break;
            }
        }

        if ($redeemed !== null) {
            $state['vouchers'] = $vouchers;
            $this->jsonStore->writeAll($state);
        }

        return $redeemed;
    }

    /**
     * Creates a new customer order and persists it to the JSON datastore.
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createOrder(array $payload): array
    {
        $state = $this->jsonStore->readAll();
        $orders = is_array($state['orders'] ?? null) ? $state['orders'] : [];

        $order = Order::fromArray($payload);
        $orderArr = $order->toArray();

        array_unshift($orders, $orderArr);
        $state['orders'] = $orders;
        $this->jsonStore->writeAll($state);

        return $orderArr;
    }
}
