# Completed-order reporting

Sales revenue, report order counts, units sold, discounts, product rankings, customer spending and transaction exports include completed orders only. Paying a deposit or the full amount does not complete an order. Use the admin's existing **Complete Order** action.

Reports use the completion date in Asia/Manila. An order placed in October and completed in November belongs to November sales. Existing completed records without a completion date fall back to their order date. Repeating completion preserves the timestamp; reopening or cancelling excludes the order.

Order-management queues, stock availability, material movements and voucher availability continue to show operational state. They are not sales recognition metrics.

## JavaScript loading

- `app.js`: storefront and shared helpers.
- `dashboard.js`: customer/admin dashboard, dynamically imported only on pages with a portal.
- `store.js`: shared order/catalog business logic.
- `analytics.js`: reporting and export functions, imported by the dashboard and Node preview server.

No bundler or additional browser dependency is required. Source remains readable. The initial storefront `app.js` + `store.js` payload is about 65% smaller; dashboard code is deferred, not removed. Analytics rendering runs when its tab is selected.

## Existing XAMPP/MySQL installs

The existing schema bootstrap adds nullable `Customer_Order.CompletedAt` automatically. Do not re-import the seed SQL over a live database. Order status/completion date now synchronize even when the number of orders has not changed.

## Validation

```sh
npm test
npm run lint
php tests/analytics-report.php
php -l src/Library/OrderCompletion.php
php -l src/Library/Database.php
php -l src/App/Models/AnalyticsReport.php
```

For the browser/XAMPP smoke test: record report totals, place an order, record a deposit/full payment, and confirm sales totals remain unchanged. Complete it as admin, reopen Analytics, and confirm the order appears once with its completion date in charts and CSV/PDF. Refresh the page and verify persistence. Check both storefront/catalog pages and customer/admin dashboards after the module split.
