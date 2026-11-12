<?php

declare(strict_types=1);

namespace LilliaRowena\Atelier\Database;

use RuntimeException;

/**
 * PSR-4 JSON Datastore Handler (`data/atelier_store.json`).
 * Persists catalog products (including color-tiered prices & custom Messenger designs),
 * single-user single-product Messenger vouchers, customer orders, and workshop records.
 */
final class JsonStore
{
    private string $filePath;

    public function __construct(?string $filePath = null)
    {
        $this->filePath = $filePath ?? dirname(__DIR__, 3) . '/data/atelier_store.json';
    }

    /**
     * @return array<string, mixed>
     */
    public function readAll(): array
    {
        if (!is_file($this->filePath)) {
            return [
                'messengerConfig' => [
                    'adminMessengerUrl' => 'https://m.me/lilliarowenafurniture.admin',
                    'businessOwnerName' => 'Lillia & Rowena Furniture Atelier',
                ],
                'products' => [],
                'vouchers' => [],
                'orders' => [],
                'workshopLogs' => [],
            ];
        }

        $raw = file_get_contents($this->filePath);
        if ($raw === false) {
            throw new RuntimeException('Unable to read JSON store at ' . $this->filePath);
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $state
     */
    public function writeAll(array $state): void
    {
        $dir = dirname($this->filePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $encoded = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new RuntimeException('Failed to encode state to JSON.');
        }

        file_put_contents($this->filePath, $encoded);
    }
}
