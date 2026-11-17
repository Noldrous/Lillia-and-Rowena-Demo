<?php

declare(strict_types=1);

namespace App\Models;

use Library\Database;
use Library\OrderCompletion;

/**
 * Monthly Analytics & Business Reports Domain Model (PSR-4: App\Models\AnalyticsReport).
 * Executes parameterized SQL aggregate queries (COUNT, SUM, AVG, GROUP BY) against
 * Customer_Order, Order_Item, Product, Category, Customer, Material, Voucher, and Payment
 * when MySQL is connected, and computes comprehensive period comparisons in Asia/Manila time.
 */
class AnalyticsReport
{
    private Database $db;
    private Product $productModel;

    public function __construct(?Database $db = null, ?Product $productModel = null)
    {
        $this->db = $db ?? Database::getInstance();
        $this->productModel = $productModel ?? new Product($this->db);
    }

    /**
     * Resolve start/end date boundaries in Asia/Manila timezone and the previous equivalent period.
     *
     * @param array<string, mixed> $filter
     * @return array<string, mixed>
     */
    public function resolveDateRange(array $filter = []): array
    {
        $tz = new \DateTimeZone('Asia/Manila');
        $now = !empty($filter['nowIso'])
            ? new \DateTimeImmutable((string) $filter['nowIso'], $tz)
            : new \DateTimeImmutable('now', $tz);

        $preset = strtolower(trim((string) ($filter['preset'] ?? 'this_month')));
        $year = (int) ($filter['year'] ?? (int) $now->format('Y'));
        $month = max(1, min(12, (int) ($filter['month'] ?? (int) $now->format('n'))));

        switch ($preset) {
            case 'last_month':
                $firstOfThisMonth = new \DateTimeImmutable($now->format('Y-m-01') . ' 00:00:00', $tz);
                $startDt = $firstOfThisMonth->modify('-1 month');
                $endDt = $startDt->modify('last day of this month')->setTime(23, 59, 59);
                $prevStartDt = $startDt->modify('-1 month');
                $prevEndDt = $prevStartDt->modify('last day of this month')->setTime(23, 59, 59);
                $periodLabel = $startDt->format('F Y');
                break;

            case 'select_month':
                $startDt = new \DateTimeImmutable(sprintf('%04d-%02d-01 00:00:00', $year, $month), $tz);
                $endDt = $startDt->modify('last day of this month')->setTime(23, 59, 59);
                $prevStartDt = $startDt->modify('-1 month');
                $prevEndDt = $prevStartDt->modify('last day of this month')->setTime(23, 59, 59);
                $periodLabel = $startDt->format('F Y');
                break;

            case 'this_year':
                $targetYear = (int) ($filter['year'] ?? (int) $now->format('Y'));
                $startDt = new \DateTimeImmutable(sprintf('%04d-01-01 00:00:00', $targetYear), $tz);
                $endDt = new \DateTimeImmutable(sprintf('%04d-12-31 23:59:59', $targetYear), $tz);
                $prevStartDt = new \DateTimeImmutable(sprintf('%04d-01-01 00:00:00', $targetYear - 1), $tz);
                $prevEndDt = new \DateTimeImmutable(sprintf('%04d-12-31 23:59:59', $targetYear - 1), $tz);
                $periodLabel = sprintf('Full Year %04d', $targetYear);
                break;

            case 'custom_range':
                $rawStart = trim((string) ($filter['startDate'] ?? $now->format('Y-m-01')));
                $rawEnd = trim((string) ($filter['endDate'] ?? $now->format('Y-m-t')));
                $startDt = new \DateTimeImmutable($rawStart . ' 00:00:00', $tz);
                $endDt = new \DateTimeImmutable($rawEnd . ' 23:59:59', $tz);
                if ($endDt < $startDt) {
                    [$startDt, $endDt] = [$endDt->setTime(0, 0, 0), $startDt->setTime(23, 59, 59)];
                }
                $daysSpan = max(1, (int) $startDt->diff($endDt)->days + 1);
                $prevEndDt = $startDt->modify('-1 day')->setTime(23, 59, 59);
                $prevStartDt = $prevEndDt->modify('-' . ($daysSpan - 1) . ' days')->setTime(0, 0, 0);
                $periodLabel = $startDt->format('M j, Y') . ' – ' . $endDt->format('M j, Y');
                break;

            case 'this_month':
            default:
                $preset = 'this_month';
                $startDt = new \DateTimeImmutable($now->format('Y-m-01') . ' 00:00:00', $tz);
                $endDt = $startDt->modify('last day of this month')->setTime(23, 59, 59);
                $prevStartDt = $startDt->modify('-1 month');
                $prevEndDt = $prevStartDt->modify('last day of this month')->setTime(23, 59, 59);
                $periodLabel = $startDt->format('F Y');
                break;
        }

        return [
            'preset'              => $preset,
            'startDate'           => $startDt->format('Y-m-d'),
            'endDate'             => $endDt->format('Y-m-d'),
            'previousStartDate'   => $prevStartDt->format('Y-m-d'),
            'previousEndDate'     => $prevEndDt->format('Y-m-d'),
            'periodLabel'         => $periodLabel,
            'previousPeriodLabel' => $prevStartDt->format('M j, Y') . ' – ' . $prevEndDt->format('M j, Y'),
            'selectedYear'        => (int) $startDt->format('Y'),
            'selectedMonth'       => (int) $startDt->format('n'),
            'timezone'            => 'Asia/Manila',
        ];
    }

    /**
     * Compute safe percentage change without division-by-zero errors.
     *
     * @return array{percentChange: float, direction: string, formatted: string, previousZero: bool}
     */
    public function computePercentChange(float $current, float $previous): array
    {
        if (abs($previous) < 0.0001) {
            if (abs($current) < 0.0001) {
                return [
                    'percentChange' => 0.0,
                    'direction'     => 'neutral',
                    'formatted'     => '0.0%',
                    'previousZero'  => true,
                ];
            }
            return [
                'percentChange' => 100.0,
                'direction'     => $current > 0 ? 'up' : 'down',
                'formatted'     => ($current > 0 ? '+100.0%' : '-100.0%') . ' (new)',
                'previousZero'  => true,
            ];
        }

        $pct = round((($current - $previous) / abs($previous)) * 100.0, 1);
        $dir = $pct > 0 ? 'up' : ($pct < 0 ? 'down' : 'neutral');
        $sign = $pct > 0 ? '+' : '';

        return [
            'percentChange' => $pct,
            'direction'     => $dir,
            'formatted'     => $sign . number_format($pct, 1) . '%',
            'previousZero'  => false,
        ];
    }

    /**
     * Execute SQL aggregate queries via PDO prepared statements when MySQL is connected.
     *
     * @return array<string, mixed>|null
     */
    public function queryMySqlAggregates(string $startDate, string $endDate): ?array
    {
        if (!$this->db->isMySqlConnected()) {
            return null;
        }

        try {
            // Aggregate each order once so multiple line items cannot inflate counts/AOV.
            $orderSummarySql = "
                SELECT COUNT(*) AS totalOrders,
                       COUNT(*) AS completedOrders,
                       0 AS pendingOrders, 0 AS cancelledOrders,
                       COALESCE(SUM(s.orderTotal), 0) AS grossOrderRevenue,
                       COALESCE(AVG(s.orderTotal), 0) AS avgOrderValue
                FROM (
                    SELECT co.OrderID, COALESCE(SUM(oi.Quantity * oi.UnitPrice), 0) AS orderTotal
                    FROM Customer_Order co
                    LEFT JOIN Order_Item oi ON oi.OrderID = co.OrderID
                    WHERE co.Status = 'Delivered'
                      AND COALESCE(co.CompletedAt, co.OrderDate) BETWEEN :startDate AND :endDate
                    GROUP BY co.OrderID
                ) s
            ";
            $summaryRow = $this->db->fetch($orderSummarySql, [
                ':startDate' => $startDate,
                ':endDate'   => $endDate,
            ]);

            $statusDistSql = "
                SELECT co.Status AS status, COUNT(*) AS orderCount
                FROM Customer_Order co
                WHERE COALESCE(co.CompletedAt, co.OrderDate) BETWEEN :startDate AND :endDate
                  AND co.Status = 'Delivered'
                GROUP BY co.Status
            ";
            $statusRows = $this->db->fetchAll($statusDistSql, [
                ':startDate' => $startDate,
                ':endDate'   => $endDate,
            ]);

            $categoryRevSql = "
                SELECT c.CategoryName AS categoryName,
                       COALESCE(SUM(oi.Quantity * oi.UnitPrice), 0) AS revenue,
                       COALESCE(SUM(oi.Quantity), 0) AS unitsSold
                FROM Order_Item oi
                INNER JOIN Customer_Order co ON co.OrderID = oi.OrderID
                INNER JOIN Product p ON p.ProductID = oi.ProductID
                INNER JOIN Category c ON c.CategoryID = p.CategoryID
                WHERE COALESCE(co.CompletedAt, co.OrderDate) BETWEEN :startDate AND :endDate
                  AND co.Status = 'Delivered'
                GROUP BY c.CategoryID, c.CategoryName
                ORDER BY revenue DESC
            ";
            $categoryRows = $this->db->fetchAll($categoryRevSql, [
                ':startDate' => $startDate,
                ':endDate'   => $endDate,
            ]);

            $bestSellingSql = "
                SELECT p.ProductID AS productId,
                       p.ProductName AS productName,
                       c.CategoryName AS categoryName,
                       COALESCE(SUM(CASE WHEN co.OrderID IS NOT NULL THEN oi.Quantity ELSE 0 END), 0) AS quantitySold,
                       COALESCE(SUM(CASE WHEN co.OrderID IS NOT NULL THEN oi.Quantity * oi.UnitPrice ELSE 0 END), 0) AS totalRevenue
                FROM Product p
                INNER JOIN Category c ON c.CategoryID = p.CategoryID
                LEFT JOIN Order_Item oi ON oi.ProductID = p.ProductID
                LEFT JOIN Customer_Order co ON co.OrderID = oi.OrderID
                    AND COALESCE(co.CompletedAt, co.OrderDate) BETWEEN :startDate AND :endDate
                    AND co.Status = 'Delivered'
                GROUP BY p.ProductID, p.ProductName, c.CategoryName
                ORDER BY totalRevenue DESC, quantitySold DESC
            ";
            $bestSellingRows = $this->db->fetchAll($bestSellingSql, [
                ':startDate' => $startDate,
                ':endDate'   => $endDate,
            ]);

            $voucherSql = "
                SELECT v.Status AS status,
                       COUNT(*) AS voucherCount,
                       COALESCE(SUM(v.DiscountValue), 0) AS totalDiscountValue
                FROM Voucher v
                GROUP BY v.Status
            ";
            $voucherRows = $this->db->fetchAll($voucherSql);

            $materialSql = "
                SELECT COUNT(*) AS totalMaterials,
                       COALESCE(SUM(m.StockQuantity * m.UnitCost), 0) AS totalMaterialValue
                FROM Material m
            ";
            $materialRow = $this->db->fetch($materialSql);

            return [
                'summary'              => $summaryRow,
                'statusDistribution'   => $statusRows,
                'categoryDistribution' => $categoryRows,
                'bestSellingProducts'  => $bestSellingRows,
                'voucherAggregates'    => $voucherRows,
                'materialAggregates'   => $materialRow,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Generate the full Monthly Analytics & Business Report payload.
     *
     * @param array<string, mixed> $filter
     * @return array<string, mixed>
     */
    public function generateReport(array $filter = []): array
    {
        $store = $this->db->readStore();
        $range = $this->resolveDateRange($filter);
        $sqlAggregates = $this->queryMySqlAggregates($range['startDate'], $range['endDate']);

        $vouchers = isset($store['vouchers']) && is_array($store['vouchers'])
            ? $this->productModel->normalizeVouchersStatus($store['vouchers'])
            : [];
        $orders = isset($store['orders']) && is_array($store['orders']) ? $store['orders'] : [];

        $curRevenue = 0.0;
        $prevRevenue = 0.0;
        $curOrdersCount = 0;
        $prevOrdersCount = 0;

        $seenOrders = [];
        foreach ($orders as $ord) {
            if (!is_array($ord) || !OrderCompletion::isCompleted($ord)) {
                continue;
            }
            $key = strtoupper(trim((string) ($ord['orderId'] ?? $ord['orderNumber'] ?? $ord['id'] ?? '')));
            if ($key !== '' && isset($seenOrders[$key])) {
                continue;
            }
            if ($key !== '') {
                $seenOrders[$key] = true;
            }
            $ordDate = OrderCompletion::reportDate($ord);
            if ($ordDate === null) {
                continue;
            }
            $totalAmt = isset($ord['totalAmount']) && is_numeric($ord['totalAmount']) && (float) $ord['totalAmount'] >= 0
                ? (float) $ord['totalAmount']
                : max(0.0, max(1, (int) ($ord['quantity'] ?? 1)) * max(0.0, (float) ($ord['unitPrice'] ?? 0))
                    + max(0.0, (float) ($ord['extraCost'] ?? 0)) - max(0.0, (float) ($ord['voucherDiscountAmount'] ?? 0)));

            if ($ordDate >= $range['startDate'] && $ordDate <= $range['endDate']) {
                $curOrdersCount++;
                $curRevenue += round($totalAmt);
            } elseif ($ordDate >= $range['previousStartDate'] && $ordDate <= $range['previousEndDate']) {
                $prevOrdersCount++;
                $prevRevenue += round($totalAmt);
            }
        }

        return [
            'ok'            => true,
            'recognitionBasis' => 'completed_orders',
            'businessName'  => 'Lillia and Rowena Furniture',
            'currency'      => 'USD ($)',
            'generatedAt'   => (new \DateTimeImmutable('now', new \DateTimeZone('Asia/Manila')))->format(\DateTimeInterface::ATOM),
            'dateRange'     => $range,
            'summary'       => [
                'totalRevenue' => array_merge(
                    ['value' => round($curRevenue, 2), 'previousValue' => round($prevRevenue, 2)],
                    $this->computePercentChange($curRevenue, $prevRevenue)
                ),
                'totalOrders'  => array_merge(
                    ['value' => $curOrdersCount, 'previousValue' => $prevOrdersCount],
                    $this->computePercentChange((float) $curOrdersCount, (float) $prevOrdersCount)
                ),
            ],
            'sqlAggregates' => $sqlAggregates,
            'voucherCount'  => count($vouchers),
        ];
    }
}
