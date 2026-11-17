<?php

declare(strict_types=1);

namespace Library;

/** Shared completion and reporting-date policy for persistence and PHP reports. */
final class OrderCompletion
{
    /** Keep the same completion rules as the browser/preview store. */
    public static function isCompleted(array $order): bool
    {
        $status = (string) ($order['status'] ?? '');
        $sqlStatus = (string) ($order['sqlStatus'] ?? '');
        if (stripos($status, 'Cancelled') !== false || $sqlStatus === 'Cancelled') {
            return false;
        }
        return ($order['isCompleted'] ?? false) === true
            || preg_match('/Completed|Delivered/i', $status) === 1
            || ($sqlStatus === 'Delivered' && preg_match('/Dispatched|Transit/i', $status) !== 1);
    }

    /** Existing completed orders without a timestamp retain their original date. */
    public static function reportDate(array $order): ?string
    {
        $raw = trim((string) (!empty($order['completedAt']) ? $order['completedAt'] : ($order['orderDate'] ?? '')));
        if ($raw === '') {
            return null;
        }
        try {
            $tz = new \DateTimeZone('Asia/Manila');
            return (new \DateTimeImmutable($raw, $tz))->setTimezone($tz)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

}
