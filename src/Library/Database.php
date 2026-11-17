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
 * Uses PHP PDO (`pdo_mysql`) as the primary server-side database connection, with built-in
 * seed data so no external `data/store.json` file is needed.
 */
class Database
{
    private static ?Database $instance = null;
    private ?PDO $pdo = null;
    /** @var array<string, mixed>|null */
    private static ?array $memoryStore = null;

    /**
     * @param array<string, mixed> $config
     */
    public function __construct(array $config = [])
    {
        $host = $config['host'] ?? (getenv('DB_HOST') ?: '127.0.0.1');
        $port = $config['port'] ?? (getenv('DB_PORT') ?: '3306');
        $dbname = $config['dbname'] ?? (getenv('DB_NAME') ?: 'lillia_rowena_furniture');
        $username = $config['user'] ?? (getenv('DB_USER') ?: 'root');
        $password = $config['pass'] ?? (getenv('DB_PASS') ?: '');

        if ($host !== '' && extension_loaded('pdo_mysql')) {
            try {
                // Connect to MySQL server first and auto-create database if it doesn't exist yet in phpMyAdmin
                $serverDsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', $host, $port);
                $pdoInit = new PDO($serverDsn, $username, $password, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
                $safeDb = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $dbname) ?: 'lillia_rowena_furniture';
                $pdoInit->exec("CREATE DATABASE IF NOT EXISTS `{$safeDb}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdoInit->exec("USE `{$safeDb}`");
                $this->pdo = $pdoInit;
                $this->ensureSchemaTablesExist();
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
     * Automatically create the 12 InnoDB tables if they do not exist yet in phpMyAdmin.
     */
    private function ensureSchemaTablesExist(): void
    {
        if ($this->pdo === null) {
            return;
        }
        $ddlStatements = [
            "CREATE TABLE IF NOT EXISTS `Admin` (
                `AdminID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `Email` VARCHAR(255) NOT NULL UNIQUE,
                `PasswordHash` VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Category` (
                `CategoryID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `CategoryName` VARCHAR(100) NOT NULL UNIQUE,
                `Description` TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Customer` (
                `CustomerID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `FullName` VARCHAR(150) NOT NULL,
                `Email` VARCHAR(255) NOT NULL UNIQUE,
                `PasswordHash` VARCHAR(255) NOT NULL,
                `PhoneNumber` VARCHAR(30),
                `Address` VARCHAR(255)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Product` (
                `ProductID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `CategoryID` VARCHAR(50) NOT NULL,
                `ProductName` VARCHAR(150) NOT NULL,
                `BasePrice` DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (`CategoryID`) REFERENCES `Category`(`CategoryID`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Material` (
                `MaterialID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `MaterialName` VARCHAR(150) NOT NULL,
                `MaterialType` VARCHAR(100),
                `Unit` VARCHAR(20) NOT NULL,
                `UnitCost` DECIMAL(10,2) NOT NULL,
                `StockQuantity` DECIMAL(12,2) NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Voucher` (
                `VoucherID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `CustomerID` VARCHAR(50) NOT NULL,
                `ProductID` VARCHAR(50) NOT NULL,
                `AdminID` VARCHAR(50) NOT NULL,
                `Code` VARCHAR(50) NOT NULL UNIQUE,
                `DiscountValue` DECIMAL(10,2) NOT NULL,
                `ExpiryDate` DATE DEFAULT NULL,
                `ExpiresAt` DATETIME DEFAULT NULL,
                `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
                `IssuedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (`VoucherID`, `ProductID`),
                FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
                FOREIGN KEY (`ProductID`) REFERENCES `Product`(`ProductID`),
                FOREIGN KEY (`AdminID`) REFERENCES `Admin`(`AdminID`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "ALTER TABLE `Voucher` ADD COLUMN `ExpiresAt` DATETIME DEFAULT NULL AFTER `ExpiryDate`",
            "CREATE TABLE IF NOT EXISTS `Customer_Order` (
                `OrderID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `CustomerID` VARCHAR(50) NOT NULL,
                `OrderDate` DATE NOT NULL,
                `CompletedAt` DATE DEFAULT NULL,
                `Status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
                FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "ALTER TABLE `Customer_Order` ADD COLUMN `CompletedAt` DATE DEFAULT NULL AFTER `OrderDate`",
            "CREATE TABLE IF NOT EXISTS `Order_Item` (
                `OrderItemID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `OrderID` VARCHAR(50) NOT NULL,
                `ProductID` VARCHAR(50) NOT NULL,
                `VoucherID` VARCHAR(50) UNIQUE DEFAULT NULL,
                `ItemType` VARCHAR(20) NOT NULL DEFAULT 'Standard',
                `Quantity` INT NOT NULL DEFAULT 1,
                `UnitPrice` DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (`OrderID`) REFERENCES `Customer_Order`(`OrderID`) ON DELETE CASCADE,
                FOREIGN KEY (`ProductID`) REFERENCES `Product`(`ProductID`),
                FOREIGN KEY (`VoucherID`, `ProductID`) REFERENCES `Voucher`(`VoucherID`, `ProductID`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Order_Item_Material` (
                `OrderItemID` VARCHAR(50) NOT NULL,
                `MaterialID` VARCHAR(50) NOT NULL,
                `QuantityUsed` DECIMAL(12,2) NOT NULL,
                PRIMARY KEY (`OrderItemID`, `MaterialID`),
                FOREIGN KEY (`OrderItemID`) REFERENCES `Order_Item`(`OrderItemID`) ON DELETE CASCADE,
                FOREIGN KEY (`MaterialID`) REFERENCES `Material`(`MaterialID`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Customization` (
                `CustomizationID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `OrderItemID` VARCHAR(50) NOT NULL UNIQUE,
                `MaterialID` VARCHAR(50) DEFAULT NULL,
                `Length` DECIMAL(8,2) DEFAULT NULL,
                `Width` DECIMAL(8,2) DEFAULT NULL,
                `Height` DECIMAL(8,2) DEFAULT NULL,
                `ColorFinish` VARCHAR(100) DEFAULT NULL,
                `Notes` TEXT DEFAULT NULL,
                `ExtraCost` DECIMAL(10,2) NOT NULL DEFAULT 0,
                FOREIGN KEY (`OrderItemID`) REFERENCES `Order_Item`(`OrderItemID`) ON DELETE CASCADE,
                FOREIGN KEY (`MaterialID`) REFERENCES `Material`(`MaterialID`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Payment` (
                `PaymentID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `OrderID` VARCHAR(50) NOT NULL,
                `PaymentDate` DATE NOT NULL,
                `Amount` DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (`OrderID`) REFERENCES `Customer_Order`(`OrderID`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS `Production_Task` (
                `TaskID` VARCHAR(50) NOT NULL PRIMARY KEY,
                `OrderItemID` VARCHAR(50) NOT NULL,
                `StartDate` DATE DEFAULT NULL,
                `EndDate` DATE DEFAULT NULL,
                `TaskStatus` VARCHAR(20) NOT NULL DEFAULT 'Todo',
                FOREIGN KEY (`OrderItemID`) REFERENCES `Order_Item`(`OrderItemID`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        ];

        foreach ($ddlStatements as $sql) {
            try {
                $this->pdo->exec($sql);
            } catch (\Throwable) {
                // Continue if table already exists
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
            throw new DatabaseException('PDO MySQL connection is not active.');
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
     * Seed the 12 MySQL tables in `lillia_rowena_furniture` from built-in default dataset if empty.
     */
    public function seedMySqlIfEmpty(): void
    {
        if ($this->pdo === null) {
            return;
        }

        try {
            $countRow = $this->fetch('SELECT COUNT(*) AS cnt FROM Category');
            if ($countRow !== null && (int) ($countRow['cnt'] ?? 0) > 0) {
                return;
            }

            $store = self::getDefaultStore();

            // 1. Seed Admin
            $this->query(
                "INSERT IGNORE INTO Admin (AdminID, Email, PasswordHash) VALUES ('ADM-LR-901', :email, :hash)",
                [
                    ':email' => 'admin@lilliarowena.com',
                    ':hash'  => password_hash('MasterJoinery#01', PASSWORD_DEFAULT),
                ]
            );

            // 2. Seed Customer
            foreach (($store['customers'] ?? []) as $cust) {
                $custId = (string) ($cust['customerId'] ?? $cust['id'] ?? 'LR-CUS-301');
                $this->query(
                    'INSERT IGNORE INTO Customer (CustomerID, FullName, Email, PasswordHash, PhoneNumber, Address)
                     VALUES (:id, :name, :email, :hash, :phone, :addr)',
                    [
                        ':id'    => $custId,
                        ':name'  => (string) ($cust['fullName'] ?? 'Rowena Vance'),
                        ':email' => (string) ($cust['email'] ?? 'rowena.vance@vancearchitects.com'),
                        ':hash'  => password_hash('ClientPass2025!', PASSWORD_DEFAULT),
                        ':phone' => (string) ($cust['phoneNumber'] ?? '+1 (212) 555-0148'),
                        ':addr'  => (string) ($cust['address'] ?? 'Suite 400, 118 Mercer St, SoHo, New York, NY 10013'),
                    ]
                );
            }

            // 3. Seed Category
            $categoryMap = [
                'living'  => 'CAT-LV-110',
                'dining'  => 'CAT-DN-220',
                'bedroom' => 'CAT-BD-330',
                'office'  => 'CAT-OF-440',
                'kitchen' => 'CAT-KT-550',
            ];
            foreach (($store['categories'] ?? []) as $cat) {
                $catKey = strtolower((string) ($cat['id'] ?? 'living'));
                $catId = (string) ($cat['categoryId'] ?? $categoryMap[$catKey] ?? 'CAT-LV-110');
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
            foreach (($store['products'] ?? []) as $prod) {
                $catKey = strtolower((string) ($prod['categoryId'] ?? 'dining'));
                $catId = $categoryMap[$catKey] ?? 'CAT-DN-220';
                $prodId = strtoupper(trim((string) ($prod['productId'] ?? $prod['sku'] ?? 'LR-DN-213')));
                $this->query(
                    'INSERT IGNORE INTO Product (ProductID, CategoryID, ProductName, BasePrice)
                     VALUES (:id, :catId, :name, :price)',
                    [
                        ':id'    => $prodId,
                        ':catId' => $catId,
                        ':name'  => (string) ($prod['name'] ?? 'Furniture Piece'),
                        ':price' => (float) ($prod['price'] ?? 0),
                    ]
                );
            }

            // 5. Seed Material
            foreach (($store['materials'] ?? []) as $mat) {
                $matId = strtoupper(trim((string) ($mat['materialId'] ?? $mat['code'] ?? 'MAT-WAL-01')));
                $this->query(
                    'INSERT IGNORE INTO Material (MaterialID, MaterialName, MaterialType, Unit, UnitCost, StockQuantity)
                     VALUES (:id, :name, :type, :unit, :cost, :stock)',
                    [
                        ':id'    => $matId,
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
     */
    public function readStore(): array
    {
        if (isset($_SESSION['lr_server_store']) && is_array($_SESSION['lr_server_store'])) {
            $decoded = $_SESSION['lr_server_store'];
        } elseif (self::$memoryStore !== null) {
            $decoded = self::$memoryStore;
        } else {
            $decoded = self::getDefaultStore();
        }

        if ($this->pdo !== null) {
            try {
                $catIdToSlug = [
                    'CAT-LV-110' => ['id' => 'living', 'name' => 'Living Room', 'image' => 'assets/images/category_living_lounge.jpg'],
                    'CAT-DN-220' => ['id' => 'dining', 'name' => 'Dining Room', 'image' => 'assets/images/category_dining_tables.jpg'],
                    'CAT-BD-330' => ['id' => 'bedroom', 'name' => 'Bedroom', 'image' => 'assets/images/category_bedroom_sanctuary.jpg'],
                    'CAT-OF-440' => ['id' => 'office', 'name' => 'Study/Work Desks', 'image' => 'assets/images/category_office_storage.jpg'],
                    'CAT-KT-550' => ['id' => 'kitchen', 'name' => 'Kitchen', 'image' => 'assets/images/category_kitchen_atelier.jpg'],
                ];

                // Sync Material StockQuantity & UnitCost (including new rows added in phpMyAdmin)
                $dbMaterials = $this->fetchAll('SELECT MaterialID, MaterialName, MaterialType, Unit, UnitCost, StockQuantity FROM Material ORDER BY MaterialID ASC');
                if (!empty($dbMaterials)) {
                    $existingMats = isset($decoded['materials']) && is_array($decoded['materials']) ? $decoded['materials'] : [];
                    $matchedMatNames = [];
                    foreach ($existingMats as &$mat) {
                        $key = strtolower(trim((string) ($mat['name'] ?? '')));
                        foreach ($dbMaterials as $row) {
                            if (strtolower(trim((string) $row['MaterialName'])) === $key) {
                                $mat['unitCost'] = (float) $row['UnitCost'];
                                $mat['stockQuantity'] = (float) $row['StockQuantity'];
                                $mat['unit'] = (string) $row['Unit'];
                                $mat['materialType'] = (string) $row['MaterialType'];
                                $matchedMatNames[$key] = true;
                                break;
                            }
                        }
                    }
                    unset($mat);

                    foreach ($dbMaterials as $row) {
                        $key = strtolower(trim((string) $row['MaterialName']));
                        if (!isset($matchedMatNames[$key])) {
                            $matId = strtoupper(trim((string) $row['MaterialID']));
                            $existingMats[] = [
                                'id'            => 'mat-sql-' . strtolower($matId),
                                'materialId'    => $matId,
                                'code'          => $matId,
                                'sku'           => $matId,
                                'name'          => (string) $row['MaterialName'],
                                'materialType'  => (string) ($row['MaterialType'] ?: 'Solid Timber'),
                                'unit'          => (string) ($row['Unit'] ?: 'bd ft'),
                                'unitCost'      => (float) $row['UnitCost'],
                                'stockQuantity' => (float) $row['StockQuantity'],
                                'minStockLevel' => 15,
                                'usedIn'        => 'Custom workshop joinery & catalog production',
                            ];
                        }
                    }
                    $decoded['materials'] = $existingMats;
                }

                // Sync Product BasePrice (including new rows added in phpMyAdmin)
                $dbProducts = $this->fetchAll('SELECT ProductID, CategoryID, ProductName, BasePrice FROM Product ORDER BY ProductID ASC');
                if (!empty($dbProducts)) {
                    $existingProds = isset($decoded['products']) && is_array($decoded['products']) ? $decoded['products'] : [];
                    $matchedProdNames = [];
                    foreach ($existingProds as &$prod) {
                        $key = strtolower(trim((string) ($prod['name'] ?? '')));
                        foreach ($dbProducts as $row) {
                            if (strtolower(trim((string) $row['ProductName'])) === $key) {
                                $prod['price'] = (float) $row['BasePrice'];
                                $pct = (float) ($prod['discountPercent'] ?? 0);
                                $prod['effectivePrice'] = round($prod['price'] * (1.0 - $pct / 100.0));
                                $matchedProdNames[$key] = true;
                                break;
                            }
                        }
                    }
                    unset($prod);

                    foreach ($dbProducts as $row) {
                        $key = strtolower(trim((string) $row['ProductName']));
                        if (!isset($matchedProdNames[$key])) {
                            $pid = strtoupper(trim((string) $row['ProductID']));
                            $cid = strtoupper(trim((string) $row['CategoryID']));
                            $catMeta = $catIdToSlug[$cid] ?? $catIdToSlug['CAT-DN-220'];
                            $basePrice = (float) $row['BasePrice'];
                            $existingProds[] = [
                                'id'                   => 'furn-sql-' . strtolower($pid),
                                'productId'            => $pid,
                                'sku'                  => $pid,
                                'name'                 => (string) $row['ProductName'],
                                'categoryId'           => $catMeta['id'],
                                'categoryName'         => $catMeta['name'],
                                'isBestSeller'         => false,
                                'price'                => $basePrice,
                                'discountPercent'      => 0,
                                'effectivePrice'       => round($basePrice),
                                'dimensions'           => '200cm L × 95cm W × 75cm H',
                                'leadTimeWeeks'        => 4,
                                'inStockCount'         => 5,
                                'minStockLevel'        => 2,
                                'primaryMaterialId'    => 'mat-101',
                                'defaultFinish'        => 'Hand-Rubbed Natural Walnut',
                                'finishes'             => ['Hand-Rubbed Natural Walnut', 'Quarter-Sawn White Oak'],
                                'colorVariants'        => [
                                    ['name' => 'Hand-Rubbed Natural Walnut', 'hex' => '#5C3A21', 'priceDelta' => 0],
                                    ['name' => 'Quarter-Sawn White Oak', 'hex' => '#C8AD88', 'priceDelta' => 0],
                                ],
                                'description'          => 'Handcrafted solid timber piece registered in the phpMyAdmin Product catalog.',
                                'craftsmanshipNote'    => 'Built to order using kiln-dried hardwood and organic oil finish.',
                                'image'                => $catMeta['image'],
                                'isCustomClientDesign' => false,
                                'customClientEmail'    => null,
                            ];
                        }
                    }
                    $decoded['products'] = $existingProds;
                }

                // Sync Voucher Status from PDO MySQL Voucher table
                $dbVouchers = $this->fetchAll('SELECT Code, DiscountValue, ExpiryDate, ExpiresAt, Status, IssuedAt FROM Voucher');
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
                            if (!empty($vByCode[$codeKey]['ExpiresAt']) && empty($v['expiresAt'])) {
                                $v['expiresAt'] = (string) $vByCode[$codeKey]['ExpiresAt'];
                            }
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
     * Write updated state to server session/memory and synchronize all 12 tables to MySQL via PDO when connected.
     *
     * @param array<string, mixed> $data
     */
    public function writeStore(array $data): void
    {
        self::$memoryStore = $data;
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['lr_server_store'] = $data;
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
                'living'  => 'CAT-LV-110',
                'dining'  => 'CAT-DN-220',
                'bedroom' => 'CAT-BD-330',
                'office'  => 'CAT-OF-440',
                'kitchen' => 'CAT-KT-550',
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
                                ':id'    => (string) $existingCust['CustomerID'],
                            ]
                        );
                    }
                }
            }

            // 2. Sync Products (Explicit code ProductID like LR-LV-014)
            if (isset($data['products']) && is_array($data['products'])) {
                foreach ($data['products'] as $prod) {
                    $name = trim((string) ($prod['name'] ?? ''));
                    if ($name === '') {
                        continue;
                    }
                    $catKey = strtolower((string) ($prod['categoryId'] ?? 'dining'));
                    $catId = $categoryMap[$catKey] ?? 'CAT-DN-220';
                    $price = max(0.0, (float) ($prod['price'] ?? 0));
                    $prodId = strtoupper(trim((string) ($prod['productId'] ?? $prod['sku'] ?? 'LR-DN-213')));

                    $existing = $this->fetch('SELECT ProductID FROM Product WHERE ProductID = :id OR ProductName = :name LIMIT 1', [':id' => $prodId, ':name' => $name]);
                    if ($existing !== null) {
                        $this->query(
                            'UPDATE Product SET CategoryID = :catId, BasePrice = :price WHERE ProductID = :id',
                            [
                                ':catId' => $catId,
                                ':price' => $price,
                                ':id'    => (string) $existing['ProductID'],
                            ]
                        );
                    } else {
                        $this->query(
                            'INSERT IGNORE INTO Product (ProductID, CategoryID, ProductName, BasePrice) VALUES (:id, :catId, :name, :price)',
                            [
                                ':id'    => $prodId,
                                ':catId' => $catId,
                                ':name'  => $name,
                                ':price' => $price,
                            ]
                        );
                    }
                }
            }

            // 3. Sync Materials (Explicit code MaterialID like MAT-WAL-01)
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
                    $matId = strtoupper(trim((string) ($mat['materialId'] ?? $mat['code'] ?? 'MAT-WAL-01')));

                    $existing = $this->fetch('SELECT MaterialID FROM Material WHERE MaterialID = :id OR MaterialName = :name LIMIT 1', [':id' => $matId, ':name' => $name]);
                    if ($existing !== null) {
                        $this->query(
                            'UPDATE Material SET MaterialType = :type, Unit = :unit, UnitCost = :cost, StockQuantity = :stock WHERE MaterialID = :id',
                            [
                                ':type'  => $type,
                                ':unit'  => $unit,
                                ':cost'  => $cost,
                                ':stock' => $stock,
                                ':id'    => (string) $existing['MaterialID'],
                            ]
                        );
                    } else {
                        $this->query(
                            'INSERT IGNORE INTO Material (MaterialID, MaterialName, MaterialType, Unit, UnitCost, StockQuantity)
                             VALUES (:id, :name, :type, :unit, :cost, :stock)',
                            [
                                ':id'    => $matId,
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

            // 4. Sync Vouchers (Explicit code VoucherID like VCH-LR-740)
            if (isset($data['vouchers']) && is_array($data['vouchers'])) {
                foreach ($data['vouchers'] as $voucher) {
                    $code = strtoupper(trim((string) ($voucher['code'] ?? '')));
                    if ($code === '') {
                        continue;
                    }
                    $discount = max(1.0, (float) ($voucher['discountAmount'] ?? $voucher['discountValue'] ?? $voucher['discountPercent'] ?? 50));
                    $status = in_array(($voucher['status'] ?? 'Active'), ['Active', 'Expiring Soon', 'Used', 'Expired', 'Revoked', 'Cancelled'], true)
                        ? (string) $voucher['status']
                        : 'Active';
                    $expiry = !empty($voucher['expiryDate']) ? (string) $voucher['expiryDate'] : null;
                    $expiresAtRaw = !empty($voucher['expiresAt']) ? (string) $voucher['expiresAt'] : null;
                    $expiresAtSql = null;
                    if ($expiresAtRaw !== null) {
                        try {
                            $dt = new \DateTimeImmutable($expiresAtRaw, new \DateTimeZone('Asia/Manila'));
                            $expiresAtSql = $dt->setTimezone(new \DateTimeZone('Asia/Manila'))->format('Y-m-d H:i:s');
                        } catch (\Throwable) {
                            $expiresAtSql = null;
                        }
                    }
                    $voucherId = strtoupper(trim((string) ($voucher['voucherId'] ?? ('VCH-LR-' . (100 + (abs((int) crc32($code)) % 899))))));

                    $existing = $this->fetch('SELECT VoucherID FROM Voucher WHERE Code = :code LIMIT 1', [':code' => $code]);
                    if ($existing !== null) {
                        $this->query(
                            'UPDATE Voucher SET DiscountValue = :val, ExpiryDate = :exp, ExpiresAt = :expat, Status = :status WHERE VoucherID = :id',
                            [
                                ':val'    => $discount,
                                ':exp'    => $expiry,
                                ':expat'  => $expiresAtSql,
                                ':status' => $status,
                                ':id'     => (string) $existing['VoucherID'],
                            ]
                        );
                    } else {
                        $this->query(
                            "INSERT IGNORE INTO Voucher (VoucherID, CustomerID, ProductID, AdminID, Code, DiscountValue, ExpiryDate, ExpiresAt, Status)
                             VALUES (:vid, 'LR-CUS-301', 'LR-LV-014', 'ADM-LR-901', :code, :val, :exp, :expat, :status)",
                            [
                                ':vid'    => $voucherId,
                                ':code'   => $code,
                                ':val'    => $discount,
                                ':exp'    => $expiry,
                                ':expat'  => $expiresAtSql,
                                ':status' => $status,
                            ]
                        );
                    }
                }
            }

            // 5. Sync Orders (`Customer_Order`, `Order_Item`, `Order_Item_Material`, `Customization`, `Payment`, `Production_Task`)
            if (isset($data['orders']) && is_array($data['orders'])) {
                // Status changes must sync even when no new order was added.
                foreach (array_reverse($data['orders']) as $ord) {
                    $ordNumStr = strtoupper(trim((string) ($ord['orderId'] ?? $ord['orderNumber'] ?? '')));
                    $orderId = $ordNumStr !== '' ? $ordNumStr : ('ORD-2026-' . (1000 + (abs((int) crc32(uniqid())) % 8900)));
                    $existsOrd = $this->fetch('SELECT OrderID FROM Customer_Order WHERE OrderID = :id LIMIT 1', [':id' => $orderId]);
                    $sqlStatus = in_array(($ord['sqlStatus'] ?? 'Pending'), ['Pending', 'InProduction', 'Ready', 'Delivered', 'Cancelled'], true)
                        ? (string) $ord['sqlStatus']
                        : 'Pending';
                    $orderDate = !empty($ord['orderDate']) ? (string) $ord['orderDate'] : date('Y-m-d');
                    if (stripos((string) ($ord['status'] ?? ''), 'Cancelled') !== false || $sqlStatus === 'Cancelled') {
                        $sqlStatus = 'Cancelled';
                    } elseif (OrderCompletion::isCompleted($ord)) {
                        $sqlStatus = 'Delivered';
                    } elseif ($sqlStatus === 'Delivered') {
                        // Old dispatched/in-transit records are not completed transactions.
                        $sqlStatus = 'Ready';
                    }
                    $completedAt = $sqlStatus === 'Delivered' ? OrderCompletion::reportDate($ord) : null;

                    if ($existsOrd !== null) {
                        $this->query(
                            'UPDATE Customer_Order SET Status = :status, CompletedAt = :completedAt WHERE OrderID = :id',
                            [':status' => $sqlStatus, ':completedAt' => $completedAt, ':id' => $orderId]
                        );
                        continue;
                    }

                    $this->query(
                        "INSERT INTO Customer_Order (OrderID, CustomerID, OrderDate, Status, CompletedAt)
                         VALUES (:id, 'LR-CUS-301', :odate, :status, :completedAt)",
                        [
                            ':id'     => $orderId,
                            ':odate'  => $orderDate,
                            ':status' => $sqlStatus,
                            ':completedAt' => $completedAt,
                        ]
                    );

                    $itemType = (($ord['itemType'] ?? 'Standard') === 'Custom') ? 'Custom' : 'Standard';
                    $qty = max(1, (int) ($ord['quantity'] ?? 1));
                    $unitPrice = max(0.0, (float) ($ord['unitPrice'] ?? $ord['totalAmount'] ?? 1000));
                    $suffixDigits = preg_replace('/\D+/', '', substr($orderId, -4)) ?: '5841';
                    $orderItemId = strtoupper(trim((string) ($ord['orderItemId'] ?? ('ITM-2026-' . $suffixDigits))));

                    $this->query(
                        "INSERT INTO Order_Item (OrderItemID, OrderID, ProductID, VoucherID, ItemType, Quantity, UnitPrice)
                         VALUES (:oiid, :oid, 'LR-LV-014', NULL, :itype, :qty, :uprice)",
                        [
                            ':oiid'   => $orderItemId,
                            ':oid'    => $orderId,
                            ':itype'  => $itemType,
                            ':qty'    => $qty,
                            ':uprice' => $unitPrice,
                        ]
                    );

                    if ($orderItemId !== '') {
                        $this->query(
                            "INSERT IGNORE INTO Order_Item_Material (OrderItemID, MaterialID, QuantityUsed)
                             VALUES (:oiid, 'MAT-WAL-01', :qused)",
                            [
                                ':oiid'  => $orderItemId,
                                ':qused' => max(1.0, (float) ($ord['materialQtyUsed'] ?? 12)),
                            ]
                        );

                        if ($itemType === 'Custom') {
                            $customizationId = strtoupper(trim((string) ($ord['customizationId'] ?? ('CSM-2026-' . $suffixDigits))));
                            $this->query(
                                "INSERT IGNORE INTO Customization (CustomizationID, OrderItemID, MaterialID, Length, Width, Height, ColorFinish, Notes, ExtraCost)
                                 VALUES (:cid, :oiid, 'MAT-WAL-01', :len, :wid, :hei, :finish, :notes, :extra)",
                                [
                                    ':cid'    => $customizationId,
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
                        $taskId = strtoupper(trim((string) ($ord['taskId'] ?? ('TSK-2026-' . $suffixDigits))));
                        $this->query(
                            'INSERT INTO Production_Task (TaskID, OrderItemID, StartDate, TaskStatus)
                             VALUES (:tid, :oiid, :sdate, :tstatus)',
                            [
                                ':tid'     => $taskId,
                                ':oiid'    => $orderItemId,
                                ':sdate'   => $orderDate,
                                ':tstatus' => $taskStatus,
                            ]
                        );
                    }

                    $paidAmount = max(1.0, (float) ($ord['depositPaid'] ?? $ord['totalAmount'] ?? 500));
                    $paymentId = strtoupper(trim((string) ($ord['paymentId'] ?? ('PAY-2026-' . $suffixDigits))));
                    $this->query(
                        'INSERT INTO Payment (PaymentID, OrderID, PaymentDate, Amount)
                         VALUES (:pid, :oid, :pdate, :amt)',
                        [
                            ':pid'   => $paymentId,
                            ':oid'   => $orderId,
                            ':pdate' => $orderDate,
                            ':amt'   => $paidAmount,
                        ]
                    );
                }
            }
        } catch (\Throwable) {
            // Non-fatal if MySQL schema constraints differ during bulk sync
        }
    }

    /**
     * Built-in default store dataset corresponding to the 12 MySQL tables in `database/furniture.sql`.
     *
     * @return array<string, mixed>
     */
    public static function getDefaultStore(): array
    {
        return [
            'messengerConfig' => [
                'adminMessengerUrl' => 'https://www.messenger.com/t/100000505712325',
                'businessOwnerName' => 'Lillia and Rowena Furniture',
            ],
            'messengerConversations' => [
                [
                    'id' => 'msg-thread-101',
                    'customerName' => 'Rowena Vance',
                    'customerEmail' => 'rowena.vance@vancearchitects.com',
                    'topic' => 'Custom 300cm Monolith Walnut Conference & Dining Slab',
                    'categoryId' => 'dining',
                    'suggestedName' => 'Rowena Custom 300cm Walnut Monolith Table',
                    'suggestedSku' => 'LR-CUST-300',
                    'suggestedPrice' => 5200,
                    'suggestedDimensions' => '300cm L × 115cm W × 75cm H',
                    'customizationNotes' => 'Extended 300cm book-matched walnut slab with concealed brass floor-box cable grommets.',
                    'updatedAt' => '2026-11-12',
                ],
                [
                    'id' => 'msg-thread-102',
                    'customerName' => 'Julian Mercier',
                    'customerEmail' => 'j.mercier@mercierstudio.co',
                    'topic' => 'Bespoke Deep-Seat Bouclé L-Sectional Sofa',
                    'categoryId' => 'living',
                    'suggestedName' => 'Mercier Bespoke Bouclé Corner Sectional',
                    'suggestedSku' => 'LR-CUST-204',
                    'suggestedPrice' => 5650,
                    'suggestedDimensions' => '310cm W × 165cm D × 74cm H',
                    'customizationNotes' => 'Left-return chaise configuration in heavyweight Alabaster Belgian bouclé over a smoked oak plinth.',
                    'updatedAt' => '2026-11-11',
                ],
                [
                    'id' => 'msg-thread-103',
                    'customerName' => 'Elena Rostova',
                    'customerEmail' => 'elena@rostovainteriors.com',
                    'topic' => 'Floating Fluted Ash Acoustic Media Credenza',
                    'categoryId' => 'office',
                    'suggestedName' => 'Rostova Floating Fluted Ash Credenza',
                    'suggestedSku' => 'LR-CUST-410',
                    'suggestedPrice' => 3490,
                    'suggestedDimensions' => '240cm W × 45cm D × 52cm H',
                    'customizationNotes' => 'Wall-hung French cleat mounting with acoustic linen center doors and concealed soundbar compartment.',
                    'updatedAt' => '2026-11-10',
                ],
                [
                    'id' => 'msg-thread-104',
                    'customerName' => 'Marcus Sterling',
                    'customerEmail' => 'm.sterling@sterlingcapital.io',
                    'topic' => 'California King Belgian Linen Tall-Headboard Platform Bed',
                    'categoryId' => 'bedroom',
                    'suggestedName' => 'Sterling Cal-King Tailored Linen Bed',
                    'suggestedSku' => 'LR-CUST-512',
                    'suggestedPrice' => 4280,
                    'suggestedDimensions' => '228cm L × 200cm W × 105cm H',
                    'customizationNotes' => 'Extra-tall 105cm acoustic wool headboard with integrated warm-bronze reading sconce cutouts.',
                    'updatedAt' => '2026-11-09',
                ],
            ],
            'categories' => [
                [
                    'id' => 'living',
                    'categoryId' => 'CAT-LV-110',
                    'name' => 'Living Room',
                    'code' => 'CAT-01 / LIVING',
                    'tagline' => 'Sculpted Bouclé Sofas, Solid Oak Lounge Chairs & Travertine Plinths',
                    'description' => 'Low-slung architectural silhouettes upholstered in heavyweight Belgian linen and nubby wool bouclé, paired with kiln-dried white oak lounge frames and honed Italian travertine surfaces.',
                    'materialPalette' => ['Kiln-Dried White Oak', 'Heavyweight Wool Bouclé', 'Honed Roman Travertine'],
                    'leadTimeRange' => '3–6 Weeks',
                    'pieceCount' => 3,
                    'startingPrice' => 1680,
                    'image' => 'assets/images/category_living_lounge.jpg',
                ],
                [
                    'id' => 'dining',
                    'categoryId' => 'CAT-DN-220',
                    'name' => 'Dining Room',
                    'code' => 'CAT-02 / DINING',
                    'tagline' => 'Monolithic Black Walnut Slab Tables & Woven Danish Cord Seating',
                    'description' => 'Heirloom dining tables milled from FAS-grade American black walnut and European white oak slabs, finished with hand-rubbed organic linseed oil and paired with Danish paper-cord chairs.',
                    'materialPalette' => ['FAS American Black Walnut', 'Quarter-Sawn White Oak', 'Danish Waxed Paper Cord'],
                    'leadTimeRange' => '4–8 Weeks',
                    'pieceCount' => 2,
                    'startingPrice' => 1290,
                    'image' => 'assets/images/category_dining_tables.jpg',
                ],
                [
                    'id' => 'bedroom',
                    'categoryId' => 'CAT-BD-330',
                    'name' => 'Bedroom',
                    'code' => 'CAT-03 / BEDROOM',
                    'tagline' => 'Tailored Belgian Linen Platform Beds & Cantilevered Ash Nightstands',
                    'description' => 'Quiet, grounding sleep architecture featuring Belgian flax linen headboards, solid ash timber platform rails, and cantilevered bedside tables with soft-close dovetail drawers.',
                    'materialPalette' => ['Belgian Unbleached Flax Linen', 'Solid European Ash', 'Brushed Unlacquered Brass'],
                    'leadTimeRange' => '3–5 Weeks',
                    'pieceCount' => 2,
                    'startingPrice' => 1180,
                    'image' => 'assets/images/category_bedroom_sanctuary.jpg',
                ],
                [
                    'id' => 'office',
                    'categoryId' => 'CAT-OF-440',
                    'name' => 'Study/Work Desks',
                    'code' => 'CAT-04 / STUDY',
                    'tagline' => 'Fluted Walnut Sideboards, Architect Work Desks & Shelving Systems',
                    'description' => 'Commanding work desks and custom-milled fluted credenzas engineered with concealed cable channels, solid brass hardware, and book-matched walnut veneer interiors.',
                    'materialPalette' => ['Fluted Black Walnut', 'Saddle-Stitched Bridle Leather', 'Aged Bronze Hardware'],
                    'leadTimeRange' => '2–6 Weeks',
                    'pieceCount' => 2,
                    'startingPrice' => 2150,
                    'image' => 'assets/images/category_office_storage.jpg',
                ],
                [
                    'id' => 'kitchen',
                    'categoryId' => 'CAT-KT-550',
                    'name' => 'Kitchen',
                    'code' => 'CAT-05 / KITCHEN',
                    'tagline' => 'Monolithic Walnut Kitchen Islands, Travertine Prep Blocks & Counter Stools',
                    'description' => 'Architectural kitchen islands, honed Roman travertine prep surfaces, and sculpted solid oak counter stools crafted for open-plan culinary ateliers.',
                    'materialPalette' => ['Honed Roman Travertine', 'FAS Black Walnut', 'Soap-Finished White Oak'],
                    'leadTimeRange' => '3–6 Weeks',
                    'pieceCount' => 2,
                    'startingPrice' => 1450,
                    'image' => 'assets/images/category_kitchen_atelier.jpg',
                ],
            ],
            'products' => [
                [
                    'id' => 'furn-lv-01',
                    'productId' => 'LR-LV-014',
                    'sku' => 'LR-LV-014',
                    'name' => 'Rowena Curved Bouclé Lounge Sofa',
                    'categoryId' => 'living',
                    'categoryName' => 'Living Room',
                    'isBestSeller' => true,
                    'bestSellerBadge' => 'Best Seller · #1 Living Room',
                    'price' => 4850,
                    'discountPercent' => 10,
                    'effectivePrice' => 4365,
                    'dimensions' => '245cm W × 104cm D × 74cm H',
                    'leadTimeWeeks' => 4,
                    'inStockCount' => 4,
                    'minStockLevel' => 2,
                    'primaryMaterialId' => 'mat-104',
                    'defaultFinish' => 'Warm Oat Bouclé / Natural Oak',
                    'finishes' => [
                        'Warm Oat Bouclé / Natural Oak',
                        'Alabaster Heavy Linen / Smoked Oak',
                        'Raw Umber Wool / American Walnut',
                        'Midnight Indigo Mohair / Ebonized Oak',
                    ],
                    'colorVariants' => [
                        ['name' => 'Warm Oat Bouclé / Natural Oak', 'hex' => '#E6DEC8', 'priceDelta' => 0],
                        ['name' => 'Alabaster Heavy Linen / Smoked Oak', 'hex' => '#F4F1EA', 'priceDelta' => 220],
                        ['name' => 'Raw Umber Wool / American Walnut', 'hex' => '#6E5239', 'priceDelta' => 380],
                        ['name' => 'Midnight Indigo Mohair / Ebonized Oak', 'hex' => '#243B55', 'priceDelta' => 520],
                    ],
                    'description' => 'A sweeping crescent silhouette engineered for conversational salon layouts. Built over a solid kiln-dried white oak plinth with multi-density natural latex and down-wrapped cushions.',
                    'craftsmanshipNote' => 'Hand-tufted internal spring suspension with mortise-and-tenon oak base rail.',
                    'image' => 'assets/images/category_living_lounge.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-dn-01',
                    'productId' => 'LR-DN-108',
                    'sku' => 'LR-DN-108',
                    'name' => 'Lillia Monolith Solid Walnut Dining Table',
                    'categoryId' => 'dining',
                    'categoryName' => 'Dining Room',
                    'isBestSeller' => true,
                    'bestSellerBadge' => 'Best Seller · Flagship Slab',
                    'price' => 4200,
                    'discountPercent' => 12,
                    'effectivePrice' => 3696,
                    'dimensions' => '240cm L × 105cm W × 75cm H',
                    'leadTimeWeeks' => 5,
                    'inStockCount' => 5,
                    'minStockLevel' => 2,
                    'primaryMaterialId' => 'mat-101',
                    'defaultFinish' => 'Hand-Rubbed Natural Walnut',
                    'finishes' => [
                        'Hand-Rubbed Natural Walnut',
                        'Quarter-Sawn White Oak',
                        'Ebonized Ash Timber',
                        'Book-Matched Burl Walnut Reserve',
                    ],
                    'colorVariants' => [
                        ['name' => 'Hand-Rubbed Natural Walnut', 'hex' => '#5C3A21', 'priceDelta' => 0],
                        ['name' => 'Quarter-Sawn White Oak', 'hex' => '#C8AD88', 'priceDelta' => -150],
                        ['name' => 'Ebonized Ash Timber', 'hex' => '#222428', 'priceDelta' => 240],
                        ['name' => 'Book-Matched Burl Walnut Reserve', 'hex' => '#472914', 'priceDelta' => 550],
                    ],
                    'description' => 'Our flagship dining table featuring a 45mm thick book-matched walnut slab top with a subtle live-inspired chamfered edge and sculptural trestle stretchers.',
                    'craftsmanshipNote' => 'Reinforced with concealed solid brass butterfly keys and zero-VOC cold-pressed tung oil.',
                    'image' => 'assets/images/category_dining_tables.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-bd-01',
                    'productId' => 'LR-BD-204',
                    'sku' => 'LR-BD-204',
                    'name' => 'Serene Belgian Linen Platform Bed (King)',
                    'categoryId' => 'bedroom',
                    'categoryName' => 'Bedroom',
                    'isBestSeller' => true,
                    'bestSellerBadge' => 'Recommended · Bedroom Sanctuary',
                    'price' => 3650,
                    'discountPercent' => 0,
                    'effectivePrice' => 3650,
                    'dimensions' => '218cm L × 206cm W × 98cm H',
                    'leadTimeWeeks' => 4,
                    'inStockCount' => 6,
                    'minStockLevel' => 2,
                    'primaryMaterialId' => 'mat-105',
                    'defaultFinish' => 'Oatmeal Flax Linen / Ash Base',
                    'finishes' => [
                        'Oatmeal Flax Linen / Ash Base',
                        'Warm Stone Linen / Walnut Base',
                        'Chalk Bouclé / White Oak Base',
                    ],
                    'colorVariants' => [
                        ['name' => 'Oatmeal Flax Linen / Ash Base', 'hex' => '#DDD3C2', 'priceDelta' => 0],
                        ['name' => 'Warm Stone Linen / Walnut Base', 'hex' => '#9E9484', 'priceDelta' => 280],
                        ['name' => 'Chalk Bouclé / White Oak Base', 'hex' => '#F7F5F0', 'priceDelta' => 350],
                    ],
                    'description' => 'Architectural low-profile platform bed with removable tailored Belgian linen upholstery and solid ash European slat support requiring no box spring.',
                    'craftsmanshipNote' => 'Acoustic wool headboard padding with precision mitered solid timber corner joinery.',
                    'image' => 'assets/images/category_bedroom_sanctuary.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-of-02',
                    'productId' => 'LR-OF-315',
                    'sku' => 'LR-OF-315',
                    'name' => 'Quarter-Sawn Oak Architect Work Desk',
                    'categoryId' => 'office',
                    'categoryName' => 'Study/Work Desks',
                    'isBestSeller' => true,
                    'bestSellerBadge' => 'Recommended · Architect Desk',
                    'price' => 2150,
                    'discountPercent' => 0,
                    'effectivePrice' => 2150,
                    'dimensions' => '165cm W × 78cm D × 75cm H',
                    'leadTimeWeeks' => 3,
                    'inStockCount' => 7,
                    'minStockLevel' => 2,
                    'primaryMaterialId' => 'mat-102',
                    'defaultFinish' => 'Natural White Oak / Brass Pulls',
                    'finishes' => [
                        'Natural White Oak / Brass Pulls',
                        'Smoked Chestnut Oak / Bronze',
                        'American Black Walnut / Cognac Leather',
                    ],
                    'colorVariants' => [
                        ['name' => 'Natural White Oak / Brass Pulls', 'hex' => '#CBB28D', 'priceDelta' => 0],
                        ['name' => 'Smoked Chestnut Oak / Bronze', 'hex' => '#7D593D', 'priceDelta' => 175],
                        ['name' => 'American Black Walnut / Cognac Leather', 'hex' => '#4E321F', 'priceDelta' => 310],
                    ],
                    'description' => 'A serene architectural worktable with dual flush-front stationery drawers, vegetable-tanned leather interior liners, and a hidden rear power trough.',
                    'craftsmanshipNote' => 'Inlaid full-grain Italian desktop blotter and solid timber leg stretchers.',
                    'image' => 'assets/images/category_office_storage.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-of-01',
                    'productId' => 'LR-OF-302',
                    'sku' => 'LR-OF-302',
                    'name' => 'Mercier Fluted Walnut Sideboard Credenza',
                    'categoryId' => 'office',
                    'categoryName' => 'Study/Work Desks',
                    'isBestSeller' => false,
                    'price' => 3890,
                    'discountPercent' => 15,
                    'effectivePrice' => 3307,
                    'dimensions' => '210cm W × 48cm D × 76cm H',
                    'leadTimeWeeks' => 4,
                    'inStockCount' => 4,
                    'minStockLevel' => 2,
                    'primaryMaterialId' => 'mat-101',
                    'defaultFinish' => 'Natural Walnut / Aged Brass',
                    'finishes' => [
                        'Natural Walnut / Aged Brass',
                        'Smoked White Oak / Bronze',
                        'Ebonized Oak / Brushed Steel',
                    ],
                    'colorVariants' => [
                        ['name' => 'Natural Walnut / Aged Brass', 'hex' => '#63412C', 'priceDelta' => 0],
                        ['name' => 'Smoked White Oak / Bronze', 'hex' => '#9C8265', 'priceDelta' => -120],
                        ['name' => 'Ebonized Oak / Brushed Steel', 'hex' => '#28292D', 'priceDelta' => 260],
                    ],
                    'description' => 'Rhythmic half-round solid walnut reeds across four seamless cabinet doors conceal adjustable shelving, velvet-lined flatware trays, and media ventilation.',
                    'craftsmanshipNote' => 'CNC-indexed and hand-sanded solid walnut fluting with Blum soft-close architectural hinges.',
                    'image' => 'assets/images/category_office_storage.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-lv-02',
                    'productId' => 'LR-LV-029',
                    'sku' => 'LR-LV-029',
                    'name' => 'Cavana Sculpted White Oak Lounge Chair',
                    'categoryId' => 'living',
                    'categoryName' => 'Living Room',
                    'isBestSeller' => false,
                    'price' => 1680,
                    'discountPercent' => 0,
                    'effectivePrice' => 1680,
                    'dimensions' => '76cm W × 82cm D × 73cm H',
                    'leadTimeWeeks' => 2,
                    'inStockCount' => 9,
                    'minStockLevel' => 3,
                    'primaryMaterialId' => 'mat-102',
                    'defaultFinish' => 'Soap-Finished White Oak / Cream Bouclé',
                    'finishes' => [
                        'Soap-Finished White Oak / Cream Bouclé',
                        'Fumed Dark Oak / Cognac Leather',
                        'Oiled Black Walnut / Sand Linen',
                    ],
                    'colorVariants' => [
                        ['name' => 'Soap-Finished White Oak / Cream Bouclé', 'hex' => '#DECBB1', 'priceDelta' => 0],
                        ['name' => 'Fumed Dark Oak / Cognac Leather', 'hex' => '#8A4B29', 'priceDelta' => 160],
                        ['name' => 'Oiled Black Walnut / Sand Linen', 'hex' => '#5E3F28', 'priceDelta' => 290],
                    ],
                    'description' => 'Steam-bent armrests flow seamlessly into tapered rear legs via precision finger-jointed transitions. Equally suited as a reading chair or architectural pair.',
                    'craftsmanshipNote' => 'Hand-shaved spokeshave arm profiles with full-grain vegetable-tanned saddle straps.',
                    'image' => 'assets/images/hero_living_room_atelier.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-lv-03',
                    'productId' => 'LR-LV-042',
                    'sku' => 'LR-LV-042',
                    'name' => 'Verona Honed Travertine Plinth Table',
                    'categoryId' => 'living',
                    'categoryName' => 'Living Room',
                    'isBestSeller' => false,
                    'price' => 2350,
                    'discountPercent' => 0,
                    'effectivePrice' => 2350,
                    'dimensions' => '135cm L × 85cm W × 34cm H',
                    'leadTimeWeeks' => 3,
                    'inStockCount' => 3,
                    'minStockLevel' => 2,
                    'primaryMaterialId' => 'mat-106',
                    'defaultFinish' => 'Unfilled Matte Roman Travertine',
                    'finishes' => [
                        'Unfilled Matte Roman Travertine',
                        'Honed Warm Limestone',
                        'Silver Vein Titanium Travertine',
                    ],
                    'colorVariants' => [
                        ['name' => 'Unfilled Matte Roman Travertine', 'hex' => '#D8CABB', 'priceDelta' => 0],
                        ['name' => 'Honed Warm Limestone', 'hex' => '#E5DDD0', 'priceDelta' => 190],
                        ['name' => 'Silver Vein Titanium Travertine', 'hex' => '#9BA0A4', 'priceDelta' => 360],
                    ],
                    'description' => 'Cut from monolithic blocks of porous Roman travertine with a softly bullnosed organic top resting on two offset architectural column cylinders.',
                    'craftsmanshipNote' => 'Breathable penetrating stone sealer applied in-shop for stain resistance.',
                    'image' => 'assets/images/category_living_lounge.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-dn-02',
                    'productId' => 'LR-DN-115',
                    'sku' => 'LR-DN-115',
                    'name' => 'Solenne Woven Cord Dining Chair (Set of 2)',
                    'categoryId' => 'dining',
                    'categoryName' => 'Dining Room',
                    'isBestSeller' => false,
                    'price' => 1290,
                    'discountPercent' => 0,
                    'effectivePrice' => 1290,
                    'dimensions' => '54cm W × 52cm D × 77cm H',
                    'leadTimeWeeks' => 2,
                    'inStockCount' => 14,
                    'minStockLevel' => 4,
                    'primaryMaterialId' => 'mat-108',
                    'defaultFinish' => 'Oiled Walnut / Natural Cord',
                    'finishes' => [
                        'Oiled Walnut / Natural Cord',
                        'White Oak / Natural Cord',
                        'Walnut / Black Danish Cord',
                    ],
                    'colorVariants' => [
                        ['name' => 'Oiled Walnut / Natural Cord', 'hex' => '#6E4B32', 'priceDelta' => 0],
                        ['name' => 'White Oak / Natural Cord', 'hex' => '#D2BC9A', 'priceDelta' => -80],
                        ['name' => 'Walnut / Black Danish Cord', 'hex' => '#2A2624', 'priceDelta' => 140],
                    ],
                    'description' => 'Hand-woven over four hours using 130 meters of wax-coated Danish paper cord per seat. Designed to tuck flush beneath the Lillia Monolith Dining Table.',
                    'craftsmanshipNote' => 'Continuous steam-bent backrest rail with wedged mortise joinery.',
                    'image' => 'assets/images/category_dining_tables.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-bd-02',
                    'productId' => 'LR-BD-219',
                    'sku' => 'LR-BD-219',
                    'name' => 'Cantilevered Ash Bedside Nightstand (Pair)',
                    'categoryId' => 'bedroom',
                    'categoryName' => 'Bedroom',
                    'isBestSeller' => false,
                    'price' => 1180,
                    'discountPercent' => 0,
                    'effectivePrice' => 1180,
                    'dimensions' => '56cm W × 42cm D × 46cm H',
                    'leadTimeWeeks' => 2,
                    'inStockCount' => 8,
                    'minStockLevel' => 2,
                    'primaryMaterialId' => 'mat-103',
                    'defaultFinish' => 'Natural Matte Ash',
                    'finishes' => [
                        'Natural Matte Ash',
                        'Smoked White Oak',
                        'Oiled Black Walnut',
                    ],
                    'colorVariants' => [
                        ['name' => 'Natural Matte Ash', 'hex' => '#D9C7AE', 'priceDelta' => 0],
                        ['name' => 'Smoked White Oak', 'hex' => '#9E8468', 'priceDelta' => 120],
                        ['name' => 'Oiled Black Walnut', 'hex' => '#543824', 'priceDelta' => 210],
                    ],
                    'description' => 'Wall-mounted or plinth-supported floating bedside cases with mitered waterfall grain wrap, aromatic Spanish cedar drawer bottoms, and concealed rear cord pass-throughs.',
                    'craftsmanshipNote' => 'Hand-cut half-blind dovetail drawer boxes with solid brass knurled pulls.',
                    'image' => 'assets/images/category_bedroom_sanctuary.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-kt-01',
                    'productId' => 'LR-KT-401',
                    'sku' => 'LR-KT-401',
                    'name' => 'Valen Travertine & Walnut Kitchen Island',
                    'categoryId' => 'kitchen',
                    'categoryName' => 'Kitchen',
                    'isBestSeller' => false,
                    'price' => 3850,
                    'discountPercent' => 10,
                    'effectivePrice' => 3465,
                    'dimensions' => '220cm L × 95cm W × 90cm H',
                    'leadTimeWeeks' => 5,
                    'inStockCount' => 3,
                    'minStockLevel' => 2,
                    'primaryMaterialId' => 'mat-106',
                    'defaultFinish' => 'Honed Travertine / Natural Walnut',
                    'finishes' => [
                        'Honed Travertine / Natural Walnut',
                        'Warm Limestone / Quarter-Sawn Oak',
                        'Titanium Travertine / Ebonized Ash',
                    ],
                    'colorVariants' => [
                        ['name' => 'Honed Travertine / Natural Walnut', 'hex' => '#5C3A21', 'priceDelta' => 0],
                        ['name' => 'Warm Limestone / Quarter-Sawn Oak', 'hex' => '#C8AD88', 'priceDelta' => -120],
                        ['name' => 'Titanium Travertine / Ebonized Ash', 'hex' => '#28292D', 'priceDelta' => 290],
                    ],
                    'description' => 'An architectural culinary island crowned with a 50mm honed Roman travertine slab over fluted American black walnut cabinetry and soft-close cutlery drawers.',
                    'craftsmanshipNote' => 'Integrated overhang for four counter stools with concealed brass power receptacles.',
                    'image' => 'assets/images/category_kitchen_atelier.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
                [
                    'id' => 'furn-kt-02',
                    'productId' => 'LR-KT-412',
                    'sku' => 'LR-KT-412',
                    'name' => 'Soren Sculpted Oak Counter Stools (Set of 2)',
                    'categoryId' => 'kitchen',
                    'categoryName' => 'Kitchen',
                    'isBestSeller' => false,
                    'price' => 1450,
                    'discountPercent' => 0,
                    'effectivePrice' => 1450,
                    'dimensions' => '44cm W × 42cm D × 66cm H',
                    'leadTimeWeeks' => 2,
                    'inStockCount' => 10,
                    'minStockLevel' => 3,
                    'primaryMaterialId' => 'mat-102',
                    'defaultFinish' => 'Soap-Finished White Oak',
                    'finishes' => [
                        'Soap-Finished White Oak',
                        'Hand-Rubbed Black Walnut',
                        'Ebonized Ash / Brass Footrest',
                    ],
                    'colorVariants' => [
                        ['name' => 'Soap-Finished White Oak', 'hex' => '#DECBB1', 'priceDelta' => 0],
                        ['name' => 'Hand-Rubbed Black Walnut', 'hex' => '#5E3F28', 'priceDelta' => 160],
                        ['name' => 'Ebonized Ash / Brass Footrest', 'hex' => '#222428', 'priceDelta' => 210],
                    ],
                    'description' => 'CNC-carved and hand-sanded solid timber saddle seats perched on tapered cylindrical legs with a solid brushed brass footrest.',
                    'craftsmanshipNote' => 'Mortise-and-wedged-tenon joinery built for daily kitchen island seating.',
                    'image' => 'assets/images/category_kitchen_atelier.jpg',
                    'isCustomClientDesign' => false,
                    'customClientEmail' => null,
                ],
            ],
            'materials' => [
                [
                    'id' => 'mat-101',
                    'materialId' => 'MAT-WAL-01',
                    'code' => 'MAT-WAL-01',
                    'name' => 'FAS American Black Walnut Slabs',
                    'materialType' => 'Solid Timber',
                    'unit' => 'bd ft',
                    'unitCost' => 28,
                    'stockQuantity' => 180,
                    'minStockLevel' => 45,
                    'usedIn' => 'Dining tables, fluted credenzas, custom monolith slabs',
                ],
                [
                    'id' => 'mat-102',
                    'materialId' => 'MAT-OAK-02',
                    'code' => 'MAT-OAK-02',
                    'name' => 'Quarter-Sawn European White Oak',
                    'materialType' => 'Solid Timber',
                    'unit' => 'bd ft',
                    'unitCost' => 22,
                    'stockQuantity' => 145,
                    'minStockLevel' => 40,
                    'usedIn' => 'Lounge chair frames, writing desks, sofa plinths',
                ],
                [
                    'id' => 'mat-103',
                    'materialId' => 'MAT-ASH-03',
                    'code' => 'MAT-ASH-03',
                    'name' => 'Kiln-Dried European Ash Timber',
                    'materialType' => 'Solid Timber',
                    'unit' => 'bd ft',
                    'unitCost' => 19,
                    'stockQuantity' => 28,
                    'minStockLevel' => 35,
                    'usedIn' => 'Cantilevered nightstands, platform bed slat rails',
                ],
                [
                    'id' => 'mat-104',
                    'materialId' => 'MAT-BCL-04',
                    'code' => 'MAT-BCL-04',
                    'name' => 'Heavyweight Belgian Wool Bouclé',
                    'materialType' => 'Upholstery Textile',
                    'unit' => 'sq m',
                    'unitCost' => 68,
                    'stockQuantity' => 84,
                    'minStockLevel' => 20,
                    'usedIn' => 'Rowena curved lounge sofas, lounge chair cushions',
                ],
                [
                    'id' => 'mat-105',
                    'materialId' => 'MAT-LIN-05',
                    'code' => 'MAT-LIN-05',
                    'name' => 'Unbleached Belgian Flax Linen',
                    'materialType' => 'Upholstery Textile',
                    'unit' => 'sq m',
                    'unitCost' => 54,
                    'stockQuantity' => 62,
                    'minStockLevel' => 18,
                    'usedIn' => 'Serene platform bed headboards & tailored upholstery',
                ],
                [
                    'id' => 'mat-106',
                    'materialId' => 'MAT-TRV-06',
                    'code' => 'MAT-TRV-06',
                    'name' => 'Honed Roman Travertine Blocks',
                    'materialType' => 'Architectural Stone',
                    'unit' => 'slabs',
                    'unitCost' => 420,
                    'stockQuantity' => 6,
                    'minStockLevel' => 3,
                    'usedIn' => 'Verona honed travertine plinth coffee tables',
                ],
                [
                    'id' => 'mat-107',
                    'materialId' => 'MAT-BRS-07',
                    'code' => 'MAT-BRS-07',
                    'name' => 'Solid Aged Brass Hardware & Butterfly Keys',
                    'materialType' => 'Hardware & Joinery',
                    'unit' => 'sets',
                    'unitCost' => 95,
                    'stockQuantity' => 32,
                    'minStockLevel' => 10,
                    'usedIn' => 'Credenza hinges, knurled drawer pulls, slab butterfly keys',
                ],
                [
                    'id' => 'mat-108',
                    'materialId' => 'MAT-CRD-08',
                    'code' => 'MAT-CRD-08',
                    'name' => 'Danish Waxed Paper Cord & Cold-Pressed Linseed Oil',
                    'materialType' => 'Cord & Finishes',
                    'unit' => 'rolls',
                    'unitCost' => 42,
                    'stockQuantity' => 24,
                    'minStockLevel' => 8,
                    'usedIn' => 'Solenne woven cord chairs & zero-VOC timber finishing',
                ],
            ],
            'vouchers' => [
                [
                    'id' => 'vch-101',
                    'voucherId' => 'VCH-LR-740',
                    'code' => 'VCH-ROWENA-SOFA400',
                    'customerEmail' => 'rowena.vance@vancearchitects.com',
                    'customerName' => 'Rowena Vance',
                    'furnitureId' => 'furn-lv-01',
                    'furnitureSku' => 'LR-LV-014',
                    'furnitureName' => 'Rowena Curved Bouclé Lounge Sofa',
                    'discountType' => 'fixed',
                    'discountAmount' => 400,
                    'status' => 'Active',
                    'issuedByAdmin' => 'Lillia Mercier',
                    'createdAt' => '2026-11-10',
                    'issuedAt' => null,
                    'expiryDate' => '2026-12-31',
                    'expiresAt' => null,
                ],
                [
                    'id' => 'vch-102',
                    'voucherId' => 'VCH-LR-735',
                    'code' => 'VCH-ROWENA-WALNUT350',
                    'customerEmail' => 'rowena.vance@vancearchitects.com',
                    'customerName' => 'Rowena Vance',
                    'furnitureId' => 'furn-dn-01',
                    'furnitureSku' => 'LR-DN-108',
                    'furnitureName' => 'Lillia Monolith Solid Walnut Dining Table',
                    'discountType' => 'fixed',
                    'discountAmount' => 350,
                    'status' => 'Active',
                    'issuedByAdmin' => 'Lillia Mercier',
                    'createdAt' => '2026-11-11',
                    'issuedAt' => null,
                    'expiryDate' => '2026-12-31',
                    'expiresAt' => null,
                ],
                [
                    'id' => 'vch-103',
                    'voucherId' => 'VCH-LR-725',
                    'code' => 'VCH-JULIAN-BED250',
                    'customerEmail' => 'j.mercier@mercierstudio.co',
                    'customerName' => 'Julian Mercier',
                    'furnitureId' => 'furn-bd-01',
                    'furnitureSku' => 'LR-BD-204',
                    'furnitureName' => 'Serene Belgian Linen Platform Bed (King)',
                    'discountType' => 'fixed',
                    'discountAmount' => 250,
                    'status' => 'Active',
                    'issuedByAdmin' => 'Lillia Mercier',
                    'createdAt' => '2026-11-09',
                    'issuedAt' => null,
                    'expiryDate' => '2026-12-15',
                    'expiresAt' => null,
                ],
                [
                    'id' => 'vch-104',
                    'voucherId' => 'VCH-LR-752',
                    'code' => 'VCH-ELENA-ISLAND300',
                    'customerEmail' => 'elena@rostovainteriors.com',
                    'customerName' => 'Elena Rostova',
                    'furnitureId' => 'furn-kt-01',
                    'furnitureSku' => 'LR-KT-401',
                    'furnitureName' => 'Valen Travertine & Walnut Kitchen Island',
                    'discountType' => 'fixed',
                    'discountAmount' => 300,
                    'status' => 'Used',
                    'issuedByAdmin' => 'Lillia Mercier',
                    'createdAt' => '2026-11-02',
                    'issuedAt' => '2026-11-02T10:15:00+08:00',
                    'redeemedAt' => '2026-11-04T15:30:00+08:00',
                    'expiryDate' => '2026-11-30',
                    'expiresAt' => '2026-11-30T23:59:59+08:00',
                ],
                [
                    'id' => 'vch-105',
                    'voucherId' => 'VCH-LR-761',
                    'code' => 'VCH-MARCUS-DESK180',
                    'customerEmail' => 'm.sterling@sterlingcapital.io',
                    'customerName' => 'Marcus Sterling',
                    'furnitureId' => 'furn-of-02',
                    'furnitureSku' => 'LR-OF-315',
                    'furnitureName' => 'Quarter-Sawn Oak Architect Work Desk',
                    'discountType' => 'fixed',
                    'discountAmount' => 180,
                    'status' => 'Expired',
                    'issuedByAdmin' => 'Lillia Mercier',
                    'createdAt' => '2026-10-05',
                    'issuedAt' => '2026-10-05T09:00:00+08:00',
                    'expiryDate' => '2026-10-28',
                    'expiresAt' => '2026-10-28T23:59:59+08:00',
                ],
                [
                    'id' => 'vch-106',
                    'voucherId' => 'VCH-LR-779',
                    'code' => 'VCH-JULIAN-CHAIR150',
                    'customerEmail' => 'j.mercier@mercierstudio.co',
                    'customerName' => 'Julian Mercier',
                    'furnitureId' => 'furn-dn-02',
                    'furnitureSku' => 'LR-DN-115',
                    'furnitureName' => 'Solenne Woven Cord Dining Chair (Set of 2)',
                    'discountType' => 'fixed',
                    'discountAmount' => 150,
                    'status' => 'Revoked',
                    'issuedByAdmin' => 'Lillia Mercier',
                    'createdAt' => '2026-11-06',
                    'issuedAt' => '2026-11-06T11:20:00+08:00',
                    'revokedAt' => '2026-11-08T16:00:00+08:00',
                    'expiryDate' => '2026-11-25',
                    'expiresAt' => '2026-11-25T23:59:59+08:00',
                ],
            ],
            'orders' => [
                [
                    'id' => 'ord-101',
                    'orderId' => 'ORD-2026-8841',
                    'orderItemId' => 'ITM-2026-5841',
                    'customizationId' => 'CSM-2026-6841',
                    'taskId' => 'TSK-2026-2841',
                    'paymentId' => 'PAY-2026-9841',
                    'orderNumber' => 'ORD-2026-8841',
                    'clientName' => 'Rowena Vance',
                    'clientEmail' => 'rowena.vance@vancearchitects.com',
                    'clientCompany' => 'Vance & Associates Spatial Design',
                    'furnitureId' => 'furn-dn-01',
                    'furnitureName' => 'Lillia Monolith Solid Walnut Dining Table',
                    'sku' => 'LR-DN-108',
                    'categoryName' => 'Dining & Tables',
                    'itemType' => 'Custom',
                    'selectedFinish' => 'Hand-Rubbed Natural Walnut',
                    'customDimensions' => '260cm L × 110cm W × 75cm H',
                    'materialId' => 'mat-101',
                    'materialName' => 'FAS American Black Walnut Slabs',
                    'materialQtyUsed' => 48,
                    'materialUnit' => 'bd ft',
                    'quantity' => 1,
                    'unitPrice' => 3696,
                    'extraCost' => 0,
                    'totalAmount' => 3696,
                    'depositPaid' => 1848,
                    'status' => 'In Joinery & Millwork',
                    'sqlStatus' => 'InProduction',
                    'taskStatus' => 'InProgress',
                    'deliveryStatus' => 'Scheduled',
                    'driverName' => 'Devon Vance',
                    'paymentStatus' => '50% Deposit Paid',
                    'orderDate' => '2026-10-18',
                    'estimatedDelivery' => '2026-11-24',
                    'deliveryAddress' => 'Suite 400, 118 Mercer St, SoHo, NY',
                    'assignedCraftsperson' => 'Mateo Cruz',
                    'notes' => 'Book-matched walnut slab approved by client via slab photography.',
                    'appliedVoucherCode' => null,
                    'voucherDiscountAmount' => 0,
                ],
                [
                    'id' => 'ord-102',
                    'orderId' => 'ORD-2026-8834',
                    'orderItemId' => 'ITM-2026-5834',
                    'taskId' => 'TSK-2026-2834',
                    'paymentId' => 'PAY-2026-9834',
                    'orderNumber' => 'ORD-2026-8834',
                    'clientName' => 'Rowena Vance',
                    'clientEmail' => 'rowena.vance@vancearchitects.com',
                    'clientCompany' => 'Vance & Associates Spatial Design',
                    'furnitureId' => 'furn-lv-01',
                    'furnitureName' => 'Rowena Curved Bouclé Lounge Sofa',
                    'sku' => 'LR-LV-014',
                    'categoryName' => 'Living & Lounge',
                    'itemType' => 'Standard',
                    'selectedFinish' => 'Warm Oat Bouclé / Natural Oak',
                    'customDimensions' => '245cm W × 104cm D × 74cm H',
                    'materialId' => 'mat-104',
                    'materialName' => 'Heavyweight Belgian Wool Bouclé',
                    'materialQtyUsed' => 14,
                    'materialUnit' => 'sq m',
                    'quantity' => 1,
                    'unitPrice' => 4365,
                    'extraCost' => 0,
                    'totalAmount' => 4365,
                    'depositPaid' => 4365,
                    'status' => 'Quality Inspection · Ready for Dispatch',
                    'sqlStatus' => 'Ready',
                    'taskStatus' => 'Done',
                    'deliveryStatus' => 'Scheduled',
                    'driverName' => 'Devon Vance',
                    'paymentStatus' => 'Paid in Full',
                    'orderDate' => '2026-10-04',
                    'estimatedDelivery' => '2026-11-15',
                    'deliveryAddress' => 'Suite 400, 118 Mercer St, SoHo, NY',
                    'assignedCraftsperson' => 'Clara Lindqvist',
                    'notes' => 'White-glove freight elevator reservation confirmed for 9:00 AM.',
                    'appliedVoucherCode' => null,
                    'voucherDiscountAmount' => 0,
                ],
                [
                    'id' => 'ord-103',
                    'orderId' => 'ORD-2026-8829',
                    'orderItemId' => 'ITM-2026-5829',
                    'taskId' => 'TSK-2026-2829',
                    'paymentId' => 'PAY-2026-9829',
                    'orderNumber' => 'ORD-2026-8829',
                    'clientName' => 'Julian Mercier',
                    'clientEmail' => 'j.mercier@mercierstudio.co',
                    'clientCompany' => 'Mercier Residential Studio',
                    'furnitureId' => 'furn-of-01',
                    'furnitureName' => 'Mercier Fluted Walnut Sideboard Credenza',
                    'sku' => 'LR-OF-302',
                    'categoryName' => 'Study & Credenzas',
                    'itemType' => 'Standard',
                    'selectedFinish' => 'Natural Walnut / Aged Brass',
                    'customDimensions' => '210cm W × 48cm D × 76cm H',
                    'materialId' => 'mat-101',
                    'materialName' => 'FAS American Black Walnut Slabs',
                    'materialQtyUsed' => 64,
                    'materialUnit' => 'bd ft',
                    'quantity' => 2,
                    'unitPrice' => 3307,
                    'extraCost' => 0,
                    'totalAmount' => 6614,
                    'depositPaid' => 3307,
                    'status' => 'Hand-Rubbed Finishing & Upholstery',
                    'sqlStatus' => 'InProduction',
                    'taskStatus' => 'InProgress',
                    'deliveryStatus' => 'Scheduled',
                    'driverName' => 'Devon Vance',
                    'paymentStatus' => '50% Deposit Paid',
                    'orderDate' => '2026-10-11',
                    'estimatedDelivery' => '2026-11-19',
                    'deliveryAddress' => '742 Evergreen Terrace, Pacific Heights, SF',
                    'assignedCraftsperson' => 'Soren Henriksen',
                    'notes' => 'Matched grain sequence across both credenzas for gallery corridor.',
                    'appliedVoucherCode' => null,
                    'voucherDiscountAmount' => 0,
                ],
                [
                    'id' => 'ord-104',
                    'orderId' => 'ORD-2026-8815',
                    'orderItemId' => 'ITM-2026-5815',
                    'taskId' => 'TSK-2026-2815',
                    'paymentId' => 'PAY-2026-9815',
                    'orderNumber' => 'ORD-2026-8815',
                    'clientName' => 'Elena Rostova',
                    'clientEmail' => 'elena@rostovainteriors.com',
                    'clientCompany' => 'Rostova Architectural Interiors',
                    'furnitureId' => 'furn-bd-01',
                    'furnitureName' => 'Serene Belgian Linen Platform Bed (King)',
                    'sku' => 'LR-BD-204',
                    'categoryName' => 'Bedroom Sanctuary',
                    'itemType' => 'Standard',
                    'selectedFinish' => 'Oatmeal Flax Linen / Ash Base',
                    'customDimensions' => '218cm L × 206cm W × 98cm H',
                    'materialId' => 'mat-105',
                    'materialName' => 'Unbleached Belgian Flax Linen',
                    'materialQtyUsed' => 16,
                    'materialUnit' => 'sq m',
                    'quantity' => 1,
                    'unitPrice' => 3650,
                    'extraCost' => 0,
                    'totalAmount' => 3650,
                    'depositPaid' => 3650,
                    'status' => 'Dispatched · White-Glove Transit',
                    'sqlStatus' => 'Ready',
                    'taskStatus' => 'Done',
                    'deliveryStatus' => 'InTransit',
                    'driverName' => 'Devon Vance',
                    'paymentStatus' => 'Paid in Full',
                    'orderDate' => '2026-09-26',
                    'estimatedDelivery' => '2026-11-12',
                    'deliveryAddress' => '29A Kensington Park Rd, Notting Hill',
                    'assignedCraftsperson' => 'Mateo Cruz',
                    'notes' => 'In transit with White-Glove Carrier #WG-209.',
                    'appliedVoucherCode' => null,
                    'voucherDiscountAmount' => 0,
                ],
                [
                    'id' => 'ord-105',
                    'orderId' => 'ORD-2026-8850',
                    'orderItemId' => 'ITM-2026-5850',
                    'taskId' => 'TSK-2026-2850',
                    'orderNumber' => 'ORD-2026-8850',
                    'clientName' => 'Marcus Sterling',
                    'clientEmail' => 'm.sterling@sterlingcapital.io',
                    'clientCompany' => 'Sterling Private Residence',
                    'furnitureId' => 'furn-lv-02',
                    'furnitureName' => 'Cavana Sculpted White Oak Lounge Chair',
                    'sku' => 'LR-LV-029',
                    'categoryName' => 'Living & Lounge',
                    'itemType' => 'Standard',
                    'selectedFinish' => 'Fumed Dark Oak / Cognac Leather',
                    'customDimensions' => '76cm W × 82cm D × 73cm H',
                    'materialId' => 'mat-102',
                    'materialName' => 'Quarter-Sawn European White Oak',
                    'materialQtyUsed' => 24,
                    'materialUnit' => 'bd ft',
                    'quantity' => 2,
                    'unitPrice' => 1840,
                    'extraCost' => 0,
                    'totalAmount' => 3680,
                    'depositPaid' => 0,
                    'status' => 'Timber Selection & Kiln Verification',
                    'sqlStatus' => 'Pending',
                    'taskStatus' => 'Todo',
                    'deliveryStatus' => 'Scheduled',
                    'driverName' => 'Devon Vance',
                    'paymentStatus' => 'Awaiting Deposit',
                    'orderDate' => '2026-11-08',
                    'estimatedDelivery' => '2026-11-29',
                    'deliveryAddress' => '880 Lake Shore Drive, Apt 32B, Chicago',
                    'assignedCraftsperson' => 'Clara Lindqvist',
                    'notes' => 'Fumed Dark Oak +$160 color tier selected.',
                    'appliedVoucherCode' => null,
                    'voucherDiscountAmount' => 0,
                ],
                [
                    'id' => 'ord-106',
                    'orderId' => 'ORD-2026-8854',
                    'orderItemId' => 'ITM-2026-5854',
                    'taskId' => 'TSK-2026-2854',
                    'paymentId' => 'PAY-2026-9854',
                    'orderNumber' => 'ORD-2026-8854',
                    'clientName' => 'Elena Rostova',
                    'clientEmail' => 'elena@rostovainteriors.com',
                    'clientCompany' => 'Rostova Architectural Interiors',
                    'furnitureId' => 'furn-kt-01',
                    'furnitureName' => 'Valen Travertine & Walnut Kitchen Island',
                    'sku' => 'LR-KT-401',
                    'categoryName' => 'Kitchen',
                    'itemType' => 'Standard',
                    'selectedFinish' => 'Honed Travertine / Natural Walnut',
                    'customDimensions' => '220cm L × 95cm W × 90cm H',
                    'materialId' => 'mat-106',
                    'materialName' => 'Honed Roman Travertine Blocks',
                    'materialQtyUsed' => 2,
                    'materialUnit' => 'slabs',
                    'quantity' => 1,
                    'unitPrice' => 3465,
                    'extraCost' => 0,
                    'totalAmount' => 3165,
                    'depositPaid' => 3165,
                    'status' => 'Delivered · Completed',
                    'sqlStatus' => 'Delivered',
                    'taskStatus' => 'Done',
                    'deliveryStatus' => 'Delivered',
                    'isCompleted' => true,
                    'completedAt' => '2026-11-12',
                    'transactionReference' => 'TXN-2026-8854',
                    'driverName' => 'Devon Vance',
                    'paymentStatus' => 'Paid in Full',
                    'orderDate' => '2026-11-04',
                    'estimatedDelivery' => '2026-11-12',
                    'deliveryAddress' => '29A Kensington Park Rd, Notting Hill',
                    'assignedCraftsperson' => 'Mateo Cruz',
                    'notes' => 'Completed white-glove installation in culinary atelier.',
                    'appliedVoucherCode' => 'VCH-ELENA-ISLAND300',
                    'voucherDiscountAmount' => 300,
                ],
                [
                    'id' => 'ord-107',
                    'orderId' => 'ORD-2026-8858',
                    'orderItemId' => 'ITM-2026-5858',
                    'taskId' => 'TSK-2026-2858',
                    'paymentId' => 'PAY-2026-9858',
                    'orderNumber' => 'ORD-2026-8858',
                    'clientName' => 'Julian Mercier',
                    'clientEmail' => 'j.mercier@mercierstudio.co',
                    'clientCompany' => 'Mercier Residential Studio',
                    'furnitureId' => 'furn-dn-02',
                    'furnitureName' => 'Solenne Woven Cord Dining Chair (Set of 2)',
                    'sku' => 'LR-DN-115',
                    'categoryName' => 'Dining Room',
                    'itemType' => 'Standard',
                    'selectedFinish' => 'Oiled Walnut / Natural Cord',
                    'customDimensions' => '54cm W × 52cm D × 77cm H',
                    'materialId' => 'mat-108',
                    'materialName' => 'Danish Waxed Paper Cord & Cold-Pressed Linseed Oil',
                    'materialQtyUsed' => 6,
                    'materialUnit' => 'rolls',
                    'quantity' => 3,
                    'unitPrice' => 1290,
                    'extraCost' => 0,
                    'totalAmount' => 3870,
                    'depositPaid' => 3870,
                    'status' => 'Delivered · Completed',
                    'sqlStatus' => 'Delivered',
                    'taskStatus' => 'Done',
                    'deliveryStatus' => 'Delivered',
                    'isCompleted' => true,
                    'completedAt' => '2026-11-14',
                    'transactionReference' => 'TXN-2026-8858',
                    'driverName' => 'Devon Vance',
                    'paymentStatus' => 'Paid in Full',
                    'orderDate' => '2026-11-11',
                    'estimatedDelivery' => '2026-11-14',
                    'deliveryAddress' => '742 Evergreen Terrace, Pacific Heights, SF',
                    'assignedCraftsperson' => 'Soren Henriksen',
                    'notes' => 'Set of 6 dining chairs delivered and inspected.',
                    'appliedVoucherCode' => null,
                    'voucherDiscountAmount' => 0,
                ],
                [
                    'id' => 'ord-108',
                    'orderId' => 'ORD-2026-8862',
                    'orderItemId' => 'ITM-2026-5862',
                    'taskId' => 'TSK-2026-2862',
                    'paymentId' => 'PAY-2026-9862',
                    'orderNumber' => 'ORD-2026-8862',
                    'clientName' => 'Rowena Vance',
                    'clientEmail' => 'rowena.vance@vancearchitects.com',
                    'clientCompany' => 'Vance & Associates Spatial Design',
                    'furnitureId' => 'furn-of-02',
                    'furnitureName' => 'Quarter-Sawn Oak Architect Work Desk',
                    'sku' => 'LR-OF-315',
                    'categoryName' => 'Study/Work Desks',
                    'itemType' => 'Standard',
                    'selectedFinish' => 'Natural White Oak / Brass Pulls',
                    'customDimensions' => '165cm W × 78cm D × 75cm H',
                    'materialId' => 'mat-102',
                    'materialName' => 'Quarter-Sawn European White Oak',
                    'materialQtyUsed' => 28,
                    'materialUnit' => 'bd ft',
                    'quantity' => 1,
                    'unitPrice' => 2150,
                    'extraCost' => 0,
                    'totalAmount' => 2150,
                    'depositPaid' => 2150,
                    'status' => 'In Joinery & Millwork',
                    'sqlStatus' => 'InProduction',
                    'taskStatus' => 'InProgress',
                    'deliveryStatus' => 'Scheduled',
                    'driverName' => 'Devon Vance',
                    'paymentStatus' => 'Paid in Full',
                    'orderDate' => '2026-11-15',
                    'estimatedDelivery' => '2026-11-30',
                    'deliveryAddress' => 'Suite 400, 118 Mercer St, SoHo, NY',
                    'assignedCraftsperson' => 'Mateo Cruz',
                    'notes' => 'Flush brass pulls fitted.',
                    'appliedVoucherCode' => null,
                    'voucherDiscountAmount' => 0,
                ],
            ],
            'workshopLogs' => [
                [
                    'id' => 'log-01',
                    'timestamp' => '2026-11-11 08:40',
                    'station' => 'Kiln & Timber Vault',
                    'craftsperson' => 'Mateo Cruz',
                    'orderNumber' => 'ORD-2026-8841',
                    'note' => 'FAS Black Walnut Slab #W-904 moisture verified at 7.2% MC; butterfly keys inlaid.',
                    'qcPassed' => true,
                ],
                [
                    'id' => 'log-02',
                    'timestamp' => '2026-11-11 11:15',
                    'station' => 'Upholstery Bench 02',
                    'craftsperson' => 'Clara Lindqvist',
                    'orderNumber' => 'ORD-2026-8834',
                    'note' => 'Belgian bouclé seam tension and crescent backrest curvature passed 12-point inspection.',
                    'qcPassed' => true,
                ],
                [
                    'id' => 'log-03',
                    'timestamp' => '2026-11-10 16:50',
                    'station' => 'Oil & Wax Finishing Room',
                    'craftsperson' => 'Soren Henriksen',
                    'orderNumber' => 'ORD-2026-8829',
                    'note' => 'Third coat of cold-pressed organic linseed oil hand-buffed on fluted walnut doors.',
                    'qcPassed' => true,
                ],
                [
                    'id' => 'log-04',
                    'timestamp' => '2026-11-09 14:20',
                    'station' => 'White-Glove Crating Dock',
                    'craftsperson' => 'Devon Vance',
                    'orderNumber' => 'ORD-2026-8815',
                    'note' => 'Custom felt-lined timber crate sealed with shock-telemetry sensor attached.',
                    'qcPassed' => true,
                ],
            ],
            'inventoryTransactions' => [
                [
                    'id' => 'inv-tx-101',
                    'materialId' => 'mat-101',
                    'materialName' => 'FAS American Black Walnut Slabs',
                    'materialCode' => 'MAT-WAL-01',
                    'materialType' => 'Solid Timber',
                    'unit' => 'bd ft',
                    'transactionType' => 'Stock In',
                    'quantity' => 60,
                    'previousStock' => 120,
                    'newStock' => 180,
                    'purchaseCost' => 1680,
                    'unitCost' => 28,
                    'reason' => 'Workshop Raw Material Restock',
                    'dateTime' => '2026-11-11 09:30',
                    'adminName' => 'Lillia Mercier (Business Owner)',
                ],
                [
                    'id' => 'inv-tx-102',
                    'materialId' => 'mat-104',
                    'materialName' => 'Heavyweight Belgian Wool Bouclé',
                    'materialCode' => 'MAT-BCL-04',
                    'materialType' => 'Upholstery Textile',
                    'unit' => 'sq m',
                    'transactionType' => 'Stock In',
                    'quantity' => 30,
                    'previousStock' => 54,
                    'newStock' => 84,
                    'purchaseCost' => 2040,
                    'unitCost' => 68,
                    'reason' => 'Workshop Raw Material Restock',
                    'dateTime' => '2026-11-10 14:15',
                    'adminName' => 'Lillia Mercier (Business Owner)',
                ],
                [
                    'id' => 'inv-tx-103',
                    'materialId' => 'mat-101',
                    'materialName' => 'FAS American Black Walnut Slabs',
                    'materialCode' => 'MAT-WAL-01',
                    'materialType' => 'Solid Timber',
                    'unit' => 'bd ft',
                    'transactionType' => 'Stock Out',
                    'quantity' => 48,
                    'previousStock' => 228,
                    'newStock' => 180,
                    'purchaseCost' => null,
                    'unitCost' => 28,
                    'reason' => 'Allocated to Workshop Production (Order #ORD-2026-8841)',
                    'dateTime' => '2026-11-09 16:40',
                    'adminName' => 'Mateo Cruz · Workshop Millwork',
                ],
                [
                    'id' => 'inv-tx-104',
                    'materialId' => 'mat-102',
                    'materialName' => 'Quarter-Sawn European White Oak',
                    'materialCode' => 'MAT-OAK-02',
                    'materialType' => 'Solid Timber',
                    'unit' => 'bd ft',
                    'transactionType' => 'Stock Out',
                    'quantity' => 28,
                    'previousStock' => 173,
                    'newStock' => 145,
                    'purchaseCost' => null,
                    'unitCost' => 22,
                    'reason' => 'Allocated to Workshop Production (Order #ORD-2026-8862)',
                    'dateTime' => '2026-11-15 11:20',
                    'adminName' => 'Mateo Cruz · Workshop Millwork',
                ],
                [
                    'id' => 'inv-tx-105',
                    'materialId' => 'mat-108',
                    'materialName' => 'Danish Waxed Paper Cord & Cold-Pressed Linseed Oil',
                    'materialCode' => 'MAT-CRD-08',
                    'materialType' => 'Cord & Finishes',
                    'unit' => 'rolls',
                    'transactionType' => 'Stock Out',
                    'quantity' => 6,
                    'previousStock' => 30,
                    'newStock' => 24,
                    'purchaseCost' => null,
                    'unitCost' => 42,
                    'reason' => 'Allocated to Workshop Production (Order #ORD-2026-8858)',
                    'dateTime' => '2026-11-11 15:10',
                    'adminName' => 'Soren Henriksen · Finishing Bench',
                ],
            ],
            'customerProfile' => [
                'name' => 'Rowena Vance',
                'company' => 'Vance & Associates Spatial Design',
                'email' => 'rowena.vance@vancearchitects.com',
                'phone' => '+1 (212) 555-0148',
                'city' => 'New York, NY 10013',
                'address' => 'Suite 400, 118 Mercer St, SoHo',
                'notes' => 'Freight elevator requires 24h advance certificate of insurance (COI).',
            ],
            'customers' => [
                [
                    'id' => 'LR-CUS-301',
                    'customerId' => 'LR-CUS-301',
                    'role' => 'Customer',
                    'fullName' => 'Rowena Vance',
                    'email' => 'rowena.vance@vancearchitects.com',
                    'phoneNumber' => '+1 (212) 555-0148',
                    'address' => 'Suite 400, 118 Mercer St, SoHo, NY',
                    'registeredAt' => '2026-09-14',
                ],
                [
                    'id' => 'LR-CUS-302',
                    'customerId' => 'LR-CUS-302',
                    'role' => 'Customer',
                    'fullName' => 'Julian Mercier',
                    'email' => 'j.mercier@mercierstudio.co',
                    'phoneNumber' => '+1 (415) 555-0192',
                    'address' => '742 Evergreen Terrace, Pacific Heights, SF',
                    'registeredAt' => '2026-10-08',
                ],
                [
                    'id' => 'LR-CUS-304',
                    'customerId' => 'LR-CUS-304',
                    'role' => 'Customer',
                    'fullName' => 'Elena Rostova',
                    'email' => 'elena@rostovainteriors.com',
                    'phoneNumber' => '+44 20 7946 0821',
                    'address' => '29A Kensington Park Rd, Notting Hill',
                    'registeredAt' => '2026-09-22',
                ],
                [
                    'id' => 'LR-CUS-308',
                    'customerId' => 'LR-CUS-308',
                    'role' => 'Customer',
                    'fullName' => 'Marcus Sterling',
                    'email' => 'm.sterling@sterlingcapital.io',
                    'phoneNumber' => '+1 (312) 555-0174',
                    'address' => '880 Lake Shore Drive, Apt 32B, Chicago',
                    'registeredAt' => '2026-11-05',
                ],
            ],
            'offers' => [],
            'sessionUser' => null,
            'cartItems' => [],
        ];
    }
}

