<?php

declare(strict_types=1);

if (!function_exists('e')) {
    /**
     * Escape HTML entities safely for view output.
     */
    function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

if (!function_exists('redirect')) {
    /**
     * Redirect the HTTP client to another path and terminate script execution.
     */
    function redirect(string $path): never
    {
        if (!headers_sent()) {
            header('Location: ' . $path);
        }
        exit;
    }
}

if (!function_exists('isLoggedIn')) {
    /**
     * Check whether a Customer or Admin is currently authenticated in the session.
     */
    function isLoggedIn(): bool
    {
        return isset($_SESSION['user']) && is_array($_SESSION['user']) && !empty($_SESSION['user']['email']);
    }
}

if (!function_exists('currentUser')) {
    /**
     * Retrieve the currently authenticated session user or null.
     *
     * @return array<string, mixed>|null
     */
    function currentUser(): ?array
    {
        return isLoggedIn() ? $_SESSION['user'] : null;
    }
}

if (!function_exists('formatCurrency')) {
    /**
     * Format a numeric dollar value.
     */
    function formatCurrency(float|int|string $amount): string
    {
        return '$' . number_format((float) $amount, 0);
    }
}

if (!function_exists('jsonResponse')) {
    /**
     * Emit a JSON HTTP response and exit.
     *
     * @param array<string, mixed> $payload
     */
    function jsonResponse(array $payload, int $statusCode = 200): never
    {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
