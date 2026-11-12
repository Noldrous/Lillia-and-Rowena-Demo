<?php
/**
 * Welcome / Logged-In Portal View Template (views/home.php)
 * Rendered by App\Controllers\HomeControllers::home() via home.php.
 *
 * @var array<string, mixed>|null $user
 * @var array<string, mixed> $store
 * @var array<int, array<string, mixed>> $products
 */
$dashboardHtml = file_get_contents(dirname(__DIR__) . '/dashboard.html');
echo $dashboardHtml;
