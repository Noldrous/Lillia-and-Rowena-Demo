<?php

declare(strict_types=1);

namespace Library;

use Library\Exceptions\DatabaseException;
use PDO;
use PDOException;
use PDOStatement;

/**
 * Part 2: PDO Database Wrapper for the MySQL 8.0.16+ InnoDB 12-table schema (database/furniture.sql)
 * Tables: Admin, Category, Customer, Product, Material, Voucher, Customer_Order,
 *         Order_Item, Order_Item_Material, Customization, Payment, Production_Task.
 *
 * Uses PHP PDO (`pdo_mysql`) as the primary server-side database connection with automatic
 * server-side synchronization to `data/store.json` when MySQL is offline.
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
        $this->jsonPath = $config['json_path'] ?? (dirname(__DIR__, 2) . '/data/store.json');

        $host = $config['host'] ?? (getenv('DB_HOST') ?: '127.0.0.1');
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
                $this->seedMySqlIfEmpty();
            } catch (PDOException $e) {
                if (!empty($config['strict_mysql'])) {
                    throw new DatabaseException(
                        'Failed to connect to MySQL database via PDO: ' . $e->getMessage(),
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
            throw new DatabaseException('PDO MySQL connection is not active; using server datastore fallback.');
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
     * Fetch a single associative row from MySQL via PDO.
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
     * Fetch all matching associative rows from MySQL via PDO.
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
     * Seed the 12 MySQL tables in `lillia_rowena_furniture` from `data/store.json` if empty.
     */
    public function seedMySqlIfEmpty(): void
    {
        if ($this->pdo === null || !is_file($this->jsonPath)) {
            return;
        }

        try {
            $countRow = $this->fetch('SELECT COUNT(*) AS cnt FROM Category');
            if ($countRow !== null && (int) ($countRow['cnt'] ?? 0) > 0) {
                return;
            }

            $raw = file_get_contents($this->jsonPath);
            $store = $raw ? json_decode($raw, true) : null;
            if (!is_array($store)) {
                return;
            }

            // 1. Seed Admin
            $this->query(
                'INSERT IGNORE INTO Admin (AdminID, Email, PasswordHash) VALUES (1, :email, :hash)',
                [
                    ':email' => 'admin@lilliarowena.com',
                    ':hash'  => password_hash('MasterJoinery#01', PASSWORD_DEFAULT),
                ]
            );

            // 2. Seed Customer
            $this->query(
                'INSERT IGNORE INTO Customer (CustomerID, FullName, Email, PasswordHash, PhoneNumber, Address)
                 VALUES (1, :name, :email, :hash, :phone, :addr)',
                [
                    ':name'  => 'Rowena Vance',
                    ':email' => 'rowena.vance@vancearchitects.com',
                    ':hash'  => password_hash('ClientPass2025!', PASSWORD_DEFAULT),
                    ':phone' => '+1 (212) 555-0148',
                    ':addr'  => 'Suite 400, 118 Mercer St, SoHo, New York, NY 10013',
                ]
            );

            // 3. Seed Category
            $categoryMap = [
                'living'  => 1,
                'dining'  => 2,
                'bedroom' => 3,
                'office'  => 4,
                'kitchen' => 5,
            ];
            foreach (($store['categories'] ?? []) as $cat) {
                $catKey = strtolower((string) ($cat['id'] ?? 'living'));
                $catId = $categoryMap[$catKey] ?? 1;
                $this->query(
                    'INSERT IGNORE INTO Category (CategoryID, CategoryName, Description)
                     VALUES (:id, :name, :desc)',
                    [
                        ':id'   => $catId,
                        ':name' => (string) ($cat['name'] ?? 'Collection'),
                        ':desc' => (string) ($cat['description'] ?? ''),
                    ]
                );
            }

            // 4. Seed Product
            $prodIdx = 1;
            foreach (($store['products'] ?? []) as $prod) {
                $catKey = strtolower((string) ($prod['categoryId'] ?? 'dining'));
                $catId = $categoryMap[$catKey] ?? 2;
                $this->query(
                    'INSERT IGNORE INTO Product (ProductID, CategoryID, ProductName, BasePrice)
                     VALUES (:id, :catId, :name, :price)',
                    [
                        ':id'    => $prodIdx++,
                        ':catId' => $catId,
                        ':name'  => (string) ($prod['name'] ?? 'Furniture Piece'),
                        ':price' => (float) ($prod['price'] ?? 0),
                    ]
                );
            }

            // 5. Seed Material
            $matIdx = 1;
            foreach (($store['materials'] ?? []) as $mat) {
                $this->query(
                    'INSERT IGNORE INTO Material (MaterialID, MaterialName, MaterialType, Unit, UnitCost, StockQuantity)
                     VALUES (:id, :name, :type, :unit, :cost, :stock)',
                    [
                        ':id'    => $matIdx++,
                        ':name'  => (string) ($mat['name'] ?? 'Material'),
                        ':type'  => (string) ($mat['materialType'] ?? 'Solid Timber'),
                        ':unit'  => (string) ($mat['unit'] ?? 'bd ft'),
                        ':cost'  => (float) ($mat['unitCost'] ?? 0),
                        ':stock' => (float) ($mat['stockQuantity'] ?? 0),
                    ]
                );
            }

            // Sync remaining entities (Voucher, Customer_Order, Order_Item, Order_Item_Material, Customization, Payment, Production_Task)
            $this->syncStoreToMySql($store);
        } catch (\Throwable) {
            // Ignore seed errors if schema tables are not yet imported
        }
    }

    /**
     * Read the full server-side datastore, merging live PDO MySQL rows from the 12 furniture tables
     * when PDO MySQL is connected.
     *
     * @return array<string, mixed>
     * @throws DatabaseException
     */
    public function readStore(): array
    {
        if (!is_file($this->jsonPath)) {
            throw new DatabaseException('Server datastore file not found at: ' . $this->jsonPath);
        }
        $raw = file_get_contents($this->jsonPath);
        if ($raw === false) {
            throw new DatabaseException('Unable to read server datastore.');
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new DatabaseException('Corrupted server datastore.');
        }

        if ($this->pdo !== null) {
            try {
                // Sync Material StockQuantity & UnitCost from PDO MySQL Material table
                $dbMaterials = $this->fetchAll('SELECT MaterialID, MaterialName, MaterialType, Unit, UnitCost, StockQuantity FROM Material ORDER BY MaterialID ASC');
                if (!empty($dbMaterials) && isset($decoded['materials']) && is_array($decoded['materials'])) {
                    $byName = [];
                    foreach ($dbMaterials as $row) {
                        $byName[strtolower(trim((string) $row['MaterialName']))] = $row;
                    }
                    foreach ($decoded['materials'] as &$mat) {
                        $key = strtolower(trim((string) ($mat['name'] ?? '')));
                        if (isset($byName[$key])) {
                            $mat['unitCost'] = (float) $byName[$key]['UnitCost'];
                            $mat['stockQuantity'] = (float) $byName[$key]['StockQuantity'];
                            $mat['unit'] = (string) $byName[$key]['Unit'];
                            $mat['materialType'] = (string) $byName[$key]['MaterialType'];
                        }
                    }
                    unset($mat);
                }

                // Sync Product BasePrice from PDO MySQL Product table
                $dbProducts = $this->fetchAll('SELECT ProductID, CategoryID, ProductName, BasePrice FROM Product ORDER BY ProductID ASC');
                if (!empty($dbProducts) && isset($decoded['products']) && is_array($decoded['products'])) {
                    $prodByName = [];
                    foreach ($dbProducts as $row) {
                        $prodByName[strtolower(trim((string) $row['ProductName']))] = $row;
                    }
                    foreach ($decoded['products'] as &$prod) {
                        $key = strtolower(trim((string) ($prod['name'] ?? '')));
                        if (isset($prodByName[$key])) {
                            $prod['price'] = (float) $prodByName[$key]['BasePrice'];
                            $pct = (float) ($prod['discountPercent'] ?? 0);
                            $prod['effectivePrice'] = round($prod['price'] * (1.0 - $pct / 100.0));
                        }
                    }
                    unset($prod);
                }

                // Sync Voucher Status from PDO MySQL Voucher table
                $dbVouchers = $this->fetchAll('SELECT Code, DiscountValue, ExpiryDate, Status FROM Voucher');
                if (!empty($dbVouchers) && isset($decoded['vouchers']) && is_array($decoded['vouchers'])) {
                    $vByCode = [];
                    foreach ($dbVouchers as $row) {
                        $vByCode[strtoupper(trim((string) $row['Code']))] = $row;
                    }
                    foreach ($decoded['vouchers'] as &$v) {
                        $codeKey = strtoupper(trim((string) ($v['code'] ?? '')));
                        if (isset($vByCode[$codeKey])) {
                            $v['status'] = (string) $vByCode[$codeKey]['Status'];
                            $v['discountValue'] = (float) $vByCode[$codeKey]['DiscountValue'];
                        }
                    }
                    unset($v);
                }
            } catch (\Throwable) {
                // Keep server datastore values if a table query fails
            }
        }

        return $decoded;
    }

    /**
     * Write updated state back to server datastore and synchronize all 12 tables to MySQL via PDO when connected.
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
            throw new DatabaseException('Failed to persist state to server datastore.');
        }

        if ($this->pdo !== null) {
            $this->syncStoreToMySql($data);
        }
    }

    /**
     * Synchronize Products, Materials, Vouchers, Customers, Customer_Order, Order_Item,
     * Order_Item_Material, Customization, Payment, and Production_Task into the 12 MySQL tables using PDO.
     *
     * @param array<string, mixed> $data
     */
    public function syncStoreToMySql(array $data): void
    {
        if ($this->pdo === null) {
            return;
        }

        try {
            $categoryMap = [
                'living'  => 1,
                'dining'  => 2,
                'bedroom' => 3,
                'office'  => 4,
                'kitchen' => 5,
            ];

            // 1. Sync Customer Profile & Registered Customers
            if (isset($data['customerProfile']) && is_array($data['customerProfile'])) {
                $prof = $data['customerProfile'];
                $email = strtolower(trim((string) ($prof['email'] ?? '')));
                $name = trim((string) ($prof['name'] ?? 'Rowena Vance'));
                $phone = trim((string) ($prof['phone'] ?? ''));
                $addr = trim((string) (($prof['address'] ?? '') . (!empty($prof['city']) ? ', ' . $prof['city'] : '')));
                if ($email !== '') {
                    $existingCust = $this->fetch('SELECT CustomerID FROM Customer WHERE LOWER(Email) = :email LIMIT 1', [':email' => $email]);
                    if ($existingCust !== null) {
                        $this->query(
                            'UPDATE Customer SET FullName = :name, PhoneNumber = :phone, Address = :addr WHERE CustomerID = :id',
                            [
                                ':name'  => $name,
                                ':phone' => $phone ?: null,
                                ':addr'  => $addr ?: null,
                                ':id'    => (int) $existingCust['CustomerID'],
                            ]
                        );
                    }
                }
            }

            // 2. Sync Products
            if (isset($data['products']) && is_array($data['products'])) {
                foreach ($data['products'] as $prod) {
                    $name = trim((string) ($prod['name'] ?? ''));
                    if ($name === '') {
                        continue;
                    }
                    $catKey = strtolower((string) ($prod['categoryId'] ?? 'dining'));
                    $catId = $categoryMap[$catKey] ?? 2;
                    $price = max(0.0, (float) ($prod['price'] ?? 0));

                    $existing = $this->fetch('SELECT ProductID FROM Product WHERE ProductName = :name LIMIT 1', [':name' => $name]);
                    if ($existing !== null) {
                        $this->query(
                            'UPDATE Product SET CategoryID = :catId, BasePrice = :price WHERE ProductID = :id',
                            [
                                ':catId' => $catId,
                                ':price' => $price,
                                ':id'    => (int) $existing['ProductID'],
                            ]
                        );
                    } else {
                        $this->query(
                            'INSERT INTO Product (CategoryID, ProductName, BasePrice) VALUES (:catId, :name, :price)',
                            [
                                ':catId' => $catId,
                                ':name'  => $name,
                                ':price' => $price,
                            ]
                        );
                    }
                }
            }

            // 3. Sync Materials
            if (isset($data['materials']) && is_array($data['materials'])) {
                foreach ($data['materials'] as $mat) {
                    $name = trim((string) ($mat['name'] ?? ''));
                    if ($name === '') {
                        continue;
                    }
                    $type = (string) ($mat['materialType'] ?? 'Solid Timber');
                    $unit = (string) ($mat['unit'] ?? 'bd ft');
                    $cost = max(0.0, (float) ($mat['unitCost'] ?? 0));
                    $stock = max(0.0, (float) ($mat['stockQuantity'] ?? 0));

                    $existing = $this->fetch('SELECT MaterialID FROM Material WHERE MaterialName = :name LIMIT 1', [':name' => $name]);
                    if ($existing !== null) {
                        $this->query(
                            'UPDATE Material SET MaterialType = :type, Unit = :unit, UnitCost = :cost, StockQuantity = :stock WHERE MaterialID = :id',
                            [
                                ':type'  => $type,
                                ':unit'  => $unit,
                                ':cost'  => $cost,
                                ':stock' => $stock,
                                ':id'    => (int) $existing['MaterialID'],
                            ]
                        );
                    } else {
                        $this->query(
                            'INSERT INTO Material (MaterialName, MaterialType, Unit, UnitCost, StockQuantity)
                             VALUES (:name, :type, :unit, :cost, :stock)',
                            [
                                ':name'  => $name,
                                ':type'  => $type,
                                ':unit'  => $unit,
                                ':cost'  => $cost,
                                ':stock' => $stock,
                            ]
                        );
                    }
                }
            }

            // 4. Sync Vouchers
            if (isset($data['vouchers']) && is_array($data['vouchers'])) {
                foreach ($data['vouchers'] as $voucher) {
                    $code = strtoupper(trim((string) ($voucher['code'] ?? '')));
                    if ($code === '') {
                        continue;
                    }
                    $discount = max(1.0, (float) ($voucher['discountAmount'] ?? $voucher['discountValue'] ?? $voucher['discountPercent'] ?? 50));
                    $status = in_array(($voucher['status'] ?? 'Active'), ['Active', 'Used', 'Expired', 'Cancelled'], true)
                        ? (string) $voucher['status']
                        : 'Active';
                    $expiry = !empty($voucher['expiryDate']) ? (string) $voucher['expiryDate'] : null;

                    $existing = $this->fetch('SELECT VoucherID FROM Voucher WHERE Code = :code LIMIT 1', [':code' => $code]);
                    if ($existing !== null) {
                        $this->query(
                            'UPDATE Voucher SET DiscountValue = :val, ExpiryDate = :exp, Status = :status WHERE VoucherID = :id',
                            [
                                ':val'    => $discount,
                                ':exp'    => $expiry,
                                ':status' => $status,
                                ':id'     => (int) $existing['VoucherID'],
                            ]
                        );
                    } else {
                        $this->query(
                            'INSERT IGNORE INTO Voucher (CustomerID, ProductID, AdminID, Code, DiscountValue, ExpiryDate, Status)
                             VALUES (1, 1, 1, :code, :val, :exp, :status)',
                            [
                                ':code'   => $code,
                                ':val'    => $discount,
                                ':exp'    => $expiry,
                                ':status' => $status,
                            ]
                        );
                    }
                }
            }

            // 5. Sync Orders (`Customer_Order`, `Order_Item`, `Order_Item_Material`, `Customization`, `Payment`, `Production_Task`)
            if (isset($data['orders']) && is_array($data['orders'])) {
                $existingOrderCount = (int) (($this->fetch('SELECT COUNT(*) AS cnt FROM Customer_Order'))['cnt'] ?? 0);
                if ($existingOrderCount < count($data['orders'])) {
                    foreach (array_reverse($data['orders']) as $ordIndex => $ord) {
                        $orderId = $ordIndex + 1;
                        $existsOrd = $this->fetch('SELECT OrderID FROM Customer_Order WHERE OrderID = :id LIMIT 1', [':id' => $orderId]);
                        $sqlStatus = in_array(($ord['sqlStatus'] ?? 'Pending'), ['Pending', 'InProduction', 'Ready', 'Delivered', 'Cancelled'], true)
                            ? (string) $ord['sqlStatus']
                            : 'Pending';
                        $orderDate = !empty($ord['orderDate']) ? (string) $ord['orderDate'] : date('Y-m-d');

                        if ($existsOrd !== null) {
                            $this->query(
                                'UPDATE Customer_Order SET Status = :status WHERE OrderID = :id',
                                [':status' => $sqlStatus, ':id' => $orderId]
                            );
                            continue;
                        }

                        $this->query(
                            'INSERT INTO Customer_Order (OrderID, CustomerID, OrderDate, Status)
                             VALUES (:id, 1, :odate, :status)',
                            [
                                ':id'     => $orderId,
                                ':odate'  => $orderDate,
                                ':status' => $sqlStatus,
                            ]
                        );

                        $itemType = (($ord['itemType'] ?? 'Standard') === 'Custom') ? 'Custom' : 'Standard';
                        $qty = max(1, (int) ($ord['quantity'] ?? 1));
                        $unitPrice = max(0.0, (float) ($ord['unitPrice'] ?? $ord['totalAmount'] ?? 1000));

                        $this->query(
                            'INSERT INTO Order_Item (OrderID, ProductID, VoucherID, ItemType, Quantity, UnitPrice)
                             VALUES (:oid, 1, NULL, :itype, :qty, :uprice)',
                            [
                                ':oid'    => $orderId,
                                ':itype'  => $itemType,
                                ':qty'    => $qty,
                                ':uprice' => $unitPrice,
                            ]
                        );
                        $orderItemId = (int) $this->pdo->lastInsertId();

                        if ($orderItemId > 0) {
                            $this->query(
                                'INSERT IGNORE INTO Order_Item_Material (OrderItemID, MaterialID, QuantityUsed)
                                 VALUES (:oiid, 1, :qused)',
                                [
                                    ':oiid'  => $orderItemId,
                                    ':qused' => max(1.0, (float) ($ord['materialQtyUsed'] ?? 12)),
                                ]
                            );

                            if ($itemType === 'Custom') {
                                $this->query(
                                    'INSERT IGNORE INTO Customization (OrderItemID, MaterialID, Length, Width, Height, ColorFinish, Notes, ExtraCost)
                                     VALUES (:oiid, 1, :len, :wid, :hei, :finish, :notes, :extra)',
                                    [
                                        ':oiid'   => $orderItemId,
                                        ':len'    => max(30.0, (float) ($ord['lengthCm'] ?? 240)),
                                        ':wid'    => max(30.0, (float) ($ord['widthCm'] ?? 105)),
                                        ':hei'    => max(25.0, (float) ($ord['heightCm'] ?? 75)),
                                        ':finish' => (string) ($ord['selectedFinish'] ?? 'Natural Finish'),
                                        ':notes'  => (string) ($ord['notes'] ?? ''),
                                        ':extra'  => max(0.0, (float) ($ord['extraCost'] ?? 0)),
                                    ]
                                );
                            }

                            $taskStatus = in_array(($ord['taskStatus'] ?? 'Todo'), ['Todo', 'InProgress', 'Done', 'Blocked'], true)
                                ? (string) $ord['taskStatus']
                                : 'Todo';
                            $this->query(
                                'INSERT INTO Production_Task (OrderItemID, StartDate, TaskStatus)
                                 VALUES (:oiid, :sdate, :tstatus)',
                                [
                                    ':oiid'    => $orderItemId,
                                    ':sdate'   => $orderDate,
                                    ':tstatus' => $taskStatus,
                                ]
                            );
                        }

                        $paidAmount = max(1.0, (float) ($ord['depositPaid'] ?? $ord['totalAmount'] ?? 500));
                        $this->query(
                            'INSERT INTO Payment (OrderID, PaymentDate, Amount)
                             VALUES (:oid, :pdate, :amt)',
                            [
                                ':oid'   => $orderId,
                                ':pdate' => $orderDate,
                                ':amt'   => $paidAmount,
                            ]
                        );
                    }
                }
            }
        } catch (\Throwable) {
            // Non-fatal if MySQL schema constraints differ during bulk sync
        }
    }
}
