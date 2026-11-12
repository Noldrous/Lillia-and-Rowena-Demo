<?php

declare(strict_types=1);

namespace LilliaRowena\Atelier\Models;

/**
 * PSR-4 Entity Model for Furniture Products, Color Price Variants,
 * Storewide Discounts, and Customer Designs passed via Admin Messenger.
 */
final class Product
{
    /**
     * @param array<int, array{name: string, hex: string, priceDelta: float}> $colorVariants
     * @param array<int, string> $finishes
     */
    public function __construct(
        public readonly string $id,
        public readonly string $sku,
        public readonly string $name,
        public readonly string $categoryId,
        public readonly string $categoryName,
        public readonly float $price,
        public readonly int $discountPercent,
        public readonly float $effectivePrice,
        public readonly string $dimensions,
        public readonly int $leadTimeWeeks,
        public readonly int $inStockCount,
        public readonly string $defaultFinish,
        public readonly array $finishes,
        public readonly array $colorVariants,
        public readonly string $description,
        public readonly string $craftsmanshipNote,
        public readonly string $image,
        public readonly bool $isCustomClientDesign = false,
        public readonly ?string $customClientEmail = null
    ) {
    }

    /**
     * Computes variant pricing for a selected color swatch, combining the color's
     * priceDelta with any global discountPercent for all users.
     *
     * @return array{colorName: string, colorHex: string, priceDelta: float, variantBasePrice: float, effectivePrice: float}
     */
    public function computeVariantPricing(?string $selectedColorName = null): array
    {
        $matched = $this->colorVariants[0] ?? [
            'name' => $this->defaultFinish,
            'hex' => '#8B5A2B',
            'priceDelta' => 0.0,
        ];

        if ($selectedColorName !== null && $selectedColorName !== '') {
            foreach ($this->colorVariants as $variant) {
                if (strcasecmp($variant['name'], $selectedColorName) === 0) {
                    $matched = $variant;
                    break;
                }
            }
        }

        $delta = (float) ($matched['priceDelta'] ?? 0);
        $variantBasePrice = max(50.0, $this->price + $delta);
        $discountPct = max(0, min(90, $this->discountPercent));
        $effectivePrice = round($variantBasePrice * (1 - $discountPct / 100));

        return [
            'colorName' => (string) $matched['name'],
            'colorHex' => (string) ($matched['hex'] ?? '#8B5A2B'),
            'priceDelta' => $delta,
            'variantBasePrice' => $variantBasePrice,
            'effectivePrice' => $effectivePrice,
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $price = (float) ($data['price'] ?? 0);
        $discountPercent = max(0, min(90, (int) ($data['discountPercent'] ?? 0)));
        $effectivePrice = round($price * (1 - $discountPercent / 100));

        $colorVariants = is_array($data['colorVariants'] ?? null) ? $data['colorVariants'] : [];
        $finishes = is_array($data['finishes'] ?? null)
            ? $data['finishes']
            : array_map(static fn(array $c): string => (string) $c['name'], $colorVariants);

        $defaultFinish = (string) ($data['defaultFinish'] ?? ($finishes[0] ?? 'Natural Solid Timber'));

        return new self(
            id: (string) ($data['id'] ?? 'furn-' . uniqid()),
            sku: strtoupper(trim((string) ($data['sku'] ?? 'LR-NEW-001'))),
            name: trim((string) ($data['name'] ?? 'Untitled Atelier Piece')),
            categoryId: (string) ($data['categoryId'] ?? 'living'),
            categoryName: (string) ($data['categoryName'] ?? 'Living & Lounge'),
            price: $price,
            discountPercent: $discountPercent,
            effectivePrice: $effectivePrice,
            dimensions: (string) ($data['dimensions'] ?? '200cm W × 90cm D × 75cm H'),
            leadTimeWeeks: max(1, (int) ($data['leadTimeWeeks'] ?? 4)),
            inStockCount: max(0, (int) ($data['inStockCount'] ?? 1)),
            defaultFinish: $defaultFinish,
            finishes: $finishes,
            colorVariants: $colorVariants,
            description: (string) ($data['description'] ?? ''),
            craftsmanshipNote: (string) ($data['craftsmanshipNote'] ?? 'Custom-milled to architectural specifications.'),
            image: (string) ($data['image'] ?? '/assets/images/category_living_lounge.jpg'),
            isCustomClientDesign: (bool) ($data['isCustomClientDesign'] ?? false),
            customClientEmail: isset($data['customClientEmail']) && $data['customClientEmail'] !== ''
                ? (string) $data['customClientEmail']
                : null
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'categoryId' => $this->categoryId,
            'categoryName' => $this->categoryName,
            'price' => $this->price,
            'discountPercent' => $this->discountPercent,
            'effectivePrice' => $this->effectivePrice,
            'dimensions' => $this->dimensions,
            'leadTimeWeeks' => $this->leadTimeWeeks,
            'inStockCount' => $this->inStockCount,
            'defaultFinish' => $this->defaultFinish,
            'finishes' => $this->finishes,
            'colorVariants' => $this->colorVariants,
            'description' => $this->description,
            'craftsmanshipNote' => $this->craftsmanshipNote,
            'image' => $this->image,
            'isCustomClientDesign' => $this->isCustomClientDesign,
            'customClientEmail' => $this->customClientEmail,
        ];
    }
}
