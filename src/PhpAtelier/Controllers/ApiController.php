<?php

declare(strict_types=1);

namespace LilliaRowena\Atelier\Controllers;

use LilliaRowena\Atelier\Services\VoucherAndCatalogService;
use Throwable;

/**
 * PSR-4 REST API Controller handling JSON requests for Catalog, Color Variants,
 * Custom Messenger Designs, Single-Product Vouchers, and Customer Orders.
 */
final class ApiController
{
    public function __construct(private readonly VoucherAndCatalogService $service)
    {
    }

    public function handle(string $method, string $path, array $body = []): void
    {
        header('Content-Type: application/json; charset=utf-8');

        try {
            if ($method === 'GET' && ($path === '/api/catalog' || $path === 'catalog')) {
                echo json_encode($this->service->getCatalogState(), JSON_UNESCAPED_SLASHES);
                return;
            }

            if ($method === 'POST' && ($path === '/api/products' || $path === 'products')) {
                $saved = $this->service->upsertProduct($body);
                echo json_encode(['product' => $saved], JSON_UNESCAPED_SLASHES);
                return;
            }

            if ($method === 'POST' && ($path === '/api/vouchers' || $path === 'vouchers')) {
                $voucher = $this->service->issueExclusiveProductVoucher($body);
                echo json_encode(['voucher' => $voucher], JSON_UNESCAPED_SLASHES);
                return;
            }

            if ($method === 'POST' && ($path === '/api/vouchers/redeem' || $path === 'vouchers/redeem')) {
                $code = (string) ($body['code'] ?? '');
                $voucher = $this->service->redeemVoucher($code);
                echo json_encode(['voucher' => $voucher], JSON_UNESCAPED_SLASHES);
                return;
            }

            if ($method === 'POST' && ($path === '/api/orders' || $path === 'orders')) {
                $order = $this->service->createOrder($body);
                echo json_encode(['order' => $order], JSON_UNESCAPED_SLASHES);
                return;
            }

            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found: ' . $path]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
