<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use App\Models\AnalyticsReport;
use Library\Database;
use Library\OrderCompletion;

final class ReportFixtureDatabase extends Database
{
    public function __construct(private array $fixture) {}
    public function readStore(): array { return $this->fixture; }
    public function isMySqlConnected(): bool { return false; }
}

function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function report(array $orders, int $month = 11): array
{
    return (new AnalyticsReport(new ReportFixtureDatabase(['orders' => $orders])))
        ->generateReport(['preset' => 'select_month', 'year' => 2026, 'month' => $month]);
}

$pending = [
    'orderId' => 'ORDER-1', 'orderDate' => '2026-10-31',
    'status' => 'Order Confirmed', 'sqlStatus' => 'Pending',
    'totalAmount' => 1000, 'depositPaid' => 1000, 'paymentStatus' => 'Paid in Full',
];
$completed = array_merge($pending, [
    'status' => 'Delivered · Completed', 'sqlStatus' => 'Delivered', 'isCompleted' => true,
    'completedAt' => '2026-10-31T16:30:00Z',
]);

check(!OrderCompletion::isCompleted($pending), 'Payment alone must not complete an order');
check(OrderCompletion::reportDate($completed) === '2026-11-01', 'Use Manila completion date');
check(report([$pending])['summary']['totalRevenue']['value'] === 0.0, 'Pending sale leaked into PHP report');
check(report([$completed])['summary']['totalRevenue']['value'] === 1000.0, 'Completed sale missing');
check(report([$completed])['summary']['totalOrders']['value'] === 1, 'Completed order count incorrect');
check(report([$completed, $completed])['summary']['totalOrders']['value'] === 1, 'Duplicate order counted');
check(report([$completed], 10)['summary']['totalRevenue']['value'] === 0.0, 'Completion shifted into order month');

$cancelled = array_merge($completed, ['sqlStatus' => 'Cancelled', 'status' => 'Order Cancelled']);
check(report([$cancelled])['summary']['totalOrders']['value'] === 0, 'Cancelled sale included');
$transit = array_merge($pending, ['sqlStatus' => 'Delivered', 'status' => 'Dispatched · White-Glove Transit']);
check(!OrderCompletion::isCompleted($transit), 'Legacy transit status incorrectly completed');
$legacy = $completed;
unset($legacy['completedAt']);
check(OrderCompletion::reportDate($legacy) === '2026-10-31', 'Legacy order-date fallback missing');
$free = array_merge($completed, ['totalAmount' => 0]);
check(report([$free])['summary']['totalRevenue']['value'] === 0.0, 'Zero total incorrectly recomputed');

echo "PHP completed-order reporting checks passed.\n";
