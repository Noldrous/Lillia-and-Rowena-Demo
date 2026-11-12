<?php

declare(strict_types=1);

namespace LilliaRowena\Atelier\Models;

/**
 * PSR-4 Entity Model for Single-User, Single-Product Vouchers
 * sent by the Business Owner (Admin) via Messenger.
 */
final class Voucher
{
    public const ADMIN_MESSENGER_BASE_URL = 'https://m.me/lilliarowenafurniture.admin';

    public function __construct(
        public readonly string $id,
        public readonly string $code,
        public readonly string $customerEmail,
        public readonly string $customerName,
        public readonly string $furnitureId,
        public readonly string $furnitureSku,
        public readonly string $furnitureName,
        public readonly float $discountAmount,
        public readonly string $status,
        public readonly string $issuedByAdmin,
        public readonly string $createdAt,
        public readonly string $expiryDate,
        public readonly string $messengerPlaceholderLink
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $code = strtoupper(trim((string) ($data['code'] ?? 'VCH-LR-' . random_int(1000, 9999))));
        $customerEmail = strtolower(trim((string) ($data['customerEmail'] ?? '')));
        $furnitureSku = strtoupper(trim((string) ($data['furnitureSku'] ?? 'LR-ITEM')));

        $messengerLink = (string) ($data['messengerPlaceholderLink'] ?? sprintf(
            '%s?voucher=%s&client=%s&sku=%s',
            self::ADMIN_MESSENGER_BASE_URL,
             rawurlencode($code),
            rawurlencode($customerEmail),
            rawurlencode($furnitureSku)
        ));

        return new self(
            id: (string) ($data['id'] ?? 'vch-' . uniqid()),
            code: $code,
            customerEmail: $customerEmail,
            customerName: (string) ($data['customerName'] ?? 'Atelier Client'),
            furnitureId: (string) ($data['furnitureId'] ?? ''),
            furnitureSku: $furnitureSku,
            furnitureName: (string) ($data['furnitureName'] ?? ''),
            discountAmount: (float) ($data['discountAmount'] ?? 0),
            status: (string) ($data['status'] ?? 'Active'),
            issuedByAdmin: (string) ($data['issuedByAdmin'] ?? 'Lillia Vance (Owner)'),
            createdAt: (string) ($data['createdAt'] ?? date('Y-m-d')),
            expiryDate: (string) ($data['expiryDate'] ?? date('Y-m-d', strtotime('+30 days'))),
            messengerPlaceholderLink: $messengerLink
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'customerEmail' => $this->customerEmail,
            'customerName' => $this->customerName,
            'furnitureId' => $this->furnitureId,
            'furnitureSku' => $this->furnitureSku,
            'furnitureName' => $this->furnitureName,
            'discountAmount' => $this->discountAmount,
            'status' => $this->status,
            'issuedByAdmin' => $this->issuedByAdmin,
            'createdAt' => $this->createdAt,
            'expiryDate' => $this->expiryDate,
            'messengerPlaceholderLink' => $this->messengerPlaceholderLink,
        ];
    }
}
