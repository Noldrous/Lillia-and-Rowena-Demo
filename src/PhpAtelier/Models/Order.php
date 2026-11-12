<?php

declare(strict_types=1);

namespace LilliaRowena\Atelier\Models;

/**
 * PSR-4 Entity Model for Customer Orders & Bespoke Commissions.
 */
final class Order
{
    public function __construct(
        public readonly string $id,
        public readonly string $orderNumber,
        public readonly string $clientName,
        public readonly string $clientEmail,
        public readonly string $clientCompany,
        public readonly string $furnitureId,
        public readonly string $furnitureName,
        public readonly string $sku,
        public readonly string $categoryName,
        public readonly string $selectedFinish,
        public readonly string $customDimensions,
        public readonly int $quantity,
        public readonly float $unitPrice,
        public readonly float $totalAmount,
        public readonly float $depositPaid,
        public readonly string $status,
        public readonly string $paymentStatus,
        public readonly string $orderDate,
        public readonly string $estimatedDelivery,
        public readonly string $deliveryAddress,
        public readonly string $assignedCraftsperson,
        public readonly string $notes,
        public readonly ?string $appliedVoucherCode = null,
        public readonly float $voucherDiscountAmount = 0.0
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: (string) ($data['id'] ?? 'ord-' . uniqid()),
            orderNumber: (string) ($data['orderNumber'] ?? 'ORD-2026-' . random_int(1000, 9999)),
            clientName: (string) ($data['clientName'] ?? 'Client'),
            clientEmail: (string) ($data['clientEmail'] ?? ''),
            clientCompany: (string) ($data['clientCompany'] ?? 'Private Residence'),
            furnitureId: (string) ($data['furnitureId'] ?? ''),
            furnitureName: (string) ($data['furnitureName'] ?? ''),
            sku: (string) ($data['sku'] ?? ''),
            categoryName: (string) ($data['categoryName'] ?? ''),
            selectedFinish: (string) ($data['selectedFinish'] ?? ''),
            customDimensions: (string) ($data['customDimensions'] ?? 'Standard Atelier Dimensions'),
            quantity: max(1, (int) ($data['quantity'] ?? 1)),
            unitPrice: (float) ($data['unitPrice'] ?? 0),
            totalAmount: (float) ($data['totalAmount'] ?? 0),
            depositPaid: (float) ($data['depositPaid'] ?? 0),
            status: (string) ($data['status'] ?? 'Inquiry Received'),
            paymentStatus: (string) ($data['paymentStatus'] ?? '50% Deposit Paid'),
            orderDate: (string) ($data['orderDate'] ?? date('Y-m-d')),
            estimatedDelivery: (string) ($data['estimatedDelivery'] ?? date('Y-m-d', strtotime('+4 weeks'))),
            deliveryAddress: (string) ($data['deliveryAddress'] ?? ''),
            assignedCraftsperson: (string) ($data['assignedCraftsperson'] ?? 'Master Joiner Mateo Cruz'),
            notes: (string) ($data['notes'] ?? ''),
            appliedVoucherCode: isset($data['appliedVoucherCode']) ? (string) $data['appliedVoucherCode'] : null,
            voucherDiscountAmount: (float) ($data['voucherDiscountAmount'] ?? 0.0)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'orderNumber' => $this->orderNumber,
            'clientName' => $this->clientName,
            'clientEmail' => $this->clientEmail,
            'clientCompany' => $this->clientCompany,
            'furnitureId' => $this->furnitureId,
            'furnitureName' => $this->furnitureName,
            'sku' => $this->sku,
            'categoryName' => $this->categoryName,
            'selectedFinish' => $this->selectedFinish,
            'customDimensions' => $this->customDimensions,
            'quantity' => $this->quantity,
            'unitPrice' => $this->unitPrice,
            'totalAmount' => $this->totalAmount,
            'depositPaid' => $this->depositPaid,
            'status' => $this->status,
            'paymentStatus' => $this->paymentStatus,
            'orderDate' => $this->orderDate,
            'estimatedDelivery' => $this->estimatedDelivery,
            'deliveryAddress' => $this->deliveryAddress,
            'assignedCraftsperson' => $this->assignedCraftsperson,
            'notes' => $this->notes,
            'appliedVoucherCode' => $this->appliedVoucherCode,
            'voucherDiscountAmount' => $this->voucherDiscountAmount,
        ];
    }
}
