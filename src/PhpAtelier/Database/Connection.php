<?php

declare(strict_types=1);

namespace LilliaRowena\Atelier\Database;

use PDO;
use PDOException;

/**
 * PSR-4 Database Connection Manager for MySQL 8.0.16+ InnoDB schema.
 */
final class Connection
{
    private static ?PDO $instance = null;

    public static function getInstance(
        string $host = '127.0.0.1',
        string $dbName = 'lillia_rowena_atelier',
        string $username = 'root',
        string $password = ''
    ): PDO {
        if (self::$instance === null) {
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $dbName);
            try {
                self::$instance = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                throw new PDOException('Atelier database connection failed: ' . $e->getMessage(), (int) $e->getCode());
            }
        }

        return self::$instance;
    }
}
