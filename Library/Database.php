<?php

declare(strict_types=1);

namespace Library;

use Library\Exceptions\DatabaseException;
use PDO;
use PDOException;
use PDOStatement;

/**
 * Part 2: Database wrapper for the MySQL 8.0.16+ InnoDB schema (database/furniture.sql)
 * with automatic JSON datastore fallback (data/store.json) when PDO MySQL is offline.
 */
class Database
{
    private static ?Database $instance = null;
    private ?PDO $pdo = null;
    private string $jsonPath;

    /**
     * @param array<string, mixed> $config
     */
    public function __construct(array $config = [])
    {
        $this->jsonPath = $config['json_path'] ?? (dirname(__DIR__) . '/data/store.json');

        $host = $config['host'] ?? (getenv('DB_HOST') ?: '');
        $port = $config['port'] ?? (getenv('DB_PORT') ?: '3306');
        $dbname = $config['dbname'] ?? (getenv('DB_NAME') ?: 'lillia_rowena_furniture');
        $username = $config['user'] ?? (getenv('DB_USER') ?: 'root');
        $password = $config['pass'] ?? (getenv('DB_PASS') ?: '');

        if ($host !== '' && extension_loaded('pdo_mysql')) {
            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $dbname);
            try {
                $this->pdo = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                if (!empty($config['strict_mysql'])) {
                    throw new DatabaseException(
                        'Failed to connect to MySQL database: ' . $e->getMessage(),
                        (int) $e->getCode(),
                        $e,
                        (string) ($e->errorInfo[0] ?? 'HY000')
                    );
                }
                $this->pdo = null;
            }
        }
    }

    /**
     * Get the shared Database singleton instance.
     *
     * @param array<string, mixed> $config
     */
    public static function getInstance(array $config = []): self
    {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }
        return self::$instance;
    }

    public function getConnection(): ?PDO
    {
        return $this->pdo;
    }

    public function isMySqlConnected(): bool
    {
        return $this->pdo !== null;
    }

    /**
     * Execute a parameterized SQL query when PDO is connected.
     *
     * @param string $sql
     * @param array<int|string, mixed> $params
     * @throws DatabaseException
     */
    public function query(string $sql, array $params = []): PDOStatement
    {
        if ($this->pdo === null) {
            throw new DatabaseException('PDO MySQL connection is not active; using JSON store fallback.');
        }

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new DatabaseException(
                'Database query failed: ' . $e->getMessage(),
                500,
                $e,
                (string) ($e->errorInfo[0] ?? 'HY000')
            );
        }
    }

    /**
     * Fetch a single associative row from MySQL.
     *
     * @param string $sql
     * @param array<int|string, mixed> $params
     * @return array<string, mixed>|null
     * @throws DatabaseException
     */
    public function fetch(string $sql, array $params = []): ?array
    {
        $row = $this->query($sql, $params)->fetch();
        return is_array($row) ? $row : null;
    }

    /**
     * Fetch all matching associative rows from MySQL.
     *
     * @param string $sql
     * @param array<int|string, mixed> $params
     * @return array<int, array<string, mixed>>
     * @throws DatabaseException
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll();
    }

    /**
     * Read the full JSON datastore (`data/store.json`).
     *
     * @return array<string, mixed>
     * @throws DatabaseException
     */
    public function readStore(): array
    {
        if (!is_file($this->jsonPath)) {
            throw new DatabaseException('JSON datastore file not found at: ' . $this->jsonPath);
        }
        $raw = file_get_contents($this->jsonPath);
        if ($raw === false) {
            throw new DatabaseException('Unable to read JSON datastore.');
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new DatabaseException('Corrupted JSON datastore.');
        }
        return $decoded;
    }

    /**
     * Write updated state back to `data/store.json`.
     *
     * @param array<string, mixed> $data
     * @throws DatabaseException
     */
    public function writeStore(array $data): void
    {
        $dir = dirname($this->jsonPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($encoded === false || file_put_contents($this->jsonPath, $encoded) === false) {
            throw new DatabaseException('Failed to persist state to JSON datastore.');
        }
    }
}
