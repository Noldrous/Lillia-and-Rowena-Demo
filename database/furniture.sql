-- =====================================================================
-- Lillia and Rowena Furniture — MySQL / MariaDB (XAMPP phpMyAdmin) Schema & Seed
-- Automatically creates and selects the `lillia_rowena_furniture` database
-- so you can import or run this file directly in phpMyAdmin.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `lillia_rowena_furniture`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lillia_rowena_furniture`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TRIGGER IF EXISTS `trg_order_item_bi`;
DROP TRIGGER IF EXISTS `trg_order_item_bu`;
DROP PROCEDURE IF EXISTS `check_voucher_use`;
DROP PROCEDURE IF EXISTS `sp_record_stock_movement`;

DROP TABLE IF EXISTS `Production_Task`;
DROP TABLE IF EXISTS `Payment`;
DROP TABLE IF EXISTS `Customization`;
DROP TABLE IF EXISTS `Order_Item_Material`;
DROP TABLE IF EXISTS `Order_Item`;
DROP TABLE IF EXISTS `Customer_Order`;
DROP TABLE IF EXISTS `Voucher`;
DROP TABLE IF EXISTS `Material`;
DROP TABLE IF EXISTS `Product`;
DROP TABLE IF EXISTS `Customer`;
DROP TABLE IF EXISTS `Category`;
DROP TABLE IF EXISTS `Admin`;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------- 1. Independent tables (Non-Incrementing Code IDs) ----------

CREATE TABLE `Admin` (
    `AdminID`       VARCHAR(50) NOT NULL PRIMARY KEY,
    `Email`         VARCHAR(255) NOT NULL UNIQUE,
    `PasswordHash`  VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Category` (
    `CategoryID`    VARCHAR(50) NOT NULL PRIMARY KEY,
    `CategoryName`  VARCHAR(100) NOT NULL UNIQUE,
    `Description`   TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Customer` (
    `CustomerID`    VARCHAR(50) NOT NULL PRIMARY KEY,
    `FullName`      VARCHAR(150) NOT NULL,
    `Email`         VARCHAR(255) NOT NULL UNIQUE,
    `PasswordHash`  VARCHAR(255) NOT NULL,
    `PhoneNumber`   VARCHAR(30),
    `Address`       VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 2. Catalog & Workshop Inventory ----------

CREATE TABLE `Product` (
    `ProductID`    VARCHAR(50) NOT NULL PRIMARY KEY,
    `CategoryID`   VARCHAR(50) NOT NULL,
    `ProductName`  VARCHAR(150) NOT NULL,
    `BasePrice`    DECIMAL(10,2) NOT NULL CHECK (`BasePrice` >= 0),
    FOREIGN KEY (`CategoryID`) REFERENCES `Category`(`CategoryID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Material` (
    `MaterialID`     VARCHAR(50) NOT NULL PRIMARY KEY,
    `MaterialName`   VARCHAR(150) NOT NULL,
    `MaterialType`   VARCHAR(100),
    `Unit`           VARCHAR(20) NOT NULL,
    `UnitCost`       DECIMAL(10,2) NOT NULL CHECK (`UnitCost` >= 0),
    `StockQuantity`  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (`StockQuantity` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 3. Voucher (issued by an admin to ONE customer for ONE product) ----------

CREATE TABLE `Voucher` (
    `VoucherID`      VARCHAR(50) NOT NULL PRIMARY KEY,
    `CustomerID`     VARCHAR(50) NOT NULL,
    `ProductID`      VARCHAR(50) NOT NULL,
    `AdminID`        VARCHAR(50) NOT NULL,
    `Code`           VARCHAR(50) NOT NULL UNIQUE,
    `DiscountValue`  DECIMAL(10,2) NOT NULL CHECK (`DiscountValue` > 0),
    `ExpiryDate`     DATE DEFAULT NULL,
    `ExpiresAt`      DATETIME DEFAULT NULL,
    `Status`         VARCHAR(20) NOT NULL DEFAULT 'Active'
                     CHECK (`Status` IN ('Active','Expiring Soon','Used','Expired','Revoked','Cancelled')),
    `IssuedAt`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (`VoucherID`, `ProductID`),
    FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`),
    FOREIGN KEY (`ProductID`)  REFERENCES `Product`(`ProductID`),
    FOREIGN KEY (`AdminID`)    REFERENCES `Admin`(`AdminID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 4. Orders, Items, Customizations, Payments & Tasks ----------

CREATE TABLE `Customer_Order` (
    `OrderID`     VARCHAR(50) NOT NULL PRIMARY KEY,
    `CustomerID`  VARCHAR(50) NOT NULL,
    `OrderDate`   DATE NOT NULL,
    `CompletedAt` DATE DEFAULT NULL,
    `Status`      VARCHAR(20) NOT NULL DEFAULT 'Pending'
                  CHECK (`Status` IN ('Pending','InProduction','Ready','Delivered','Cancelled')),
    FOREIGN KEY (`CustomerID`) REFERENCES `Customer`(`CustomerID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Order_Item` (
    `OrderItemID`  VARCHAR(50) NOT NULL PRIMARY KEY,
    `OrderID`      VARCHAR(50) NOT NULL,
    `ProductID`    VARCHAR(50) NOT NULL,
    `VoucherID`    VARCHAR(50) UNIQUE DEFAULT NULL,
    `ItemType`     VARCHAR(20) NOT NULL DEFAULT 'Standard'
                   CHECK (`ItemType` IN ('Standard','Custom')),
    `Quantity`     INT NOT NULL DEFAULT 1 CHECK (`Quantity` > 0),
    `UnitPrice`    DECIMAL(10,2) NOT NULL CHECK (`UnitPrice` >= 0),
    FOREIGN KEY (`OrderID`)   REFERENCES `Customer_Order`(`OrderID`) ON DELETE CASCADE,
    FOREIGN KEY (`ProductID`) REFERENCES `Product`(`ProductID`),
    FOREIGN KEY (`VoucherID`, `ProductID`) REFERENCES `Voucher`(`VoucherID`, `ProductID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Order_Item_Material` (
    `OrderItemID`   VARCHAR(50) NOT NULL,
    `MaterialID`    VARCHAR(50) NOT NULL,
    `QuantityUsed`  DECIMAL(12,2) NOT NULL CHECK (`QuantityUsed` > 0),
    PRIMARY KEY (`OrderItemID`, `MaterialID`),
    FOREIGN KEY (`OrderItemID`) REFERENCES `Order_Item`(`OrderItemID`) ON DELETE CASCADE,
    FOREIGN KEY (`MaterialID`)  REFERENCES `Material`(`MaterialID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Customization` (
    `CustomizationID`  VARCHAR(50) NOT NULL PRIMARY KEY,
    `OrderItemID`      VARCHAR(50) NOT NULL UNIQUE,
    `MaterialID`       VARCHAR(50) DEFAULT NULL,
    `Length`           DECIMAL(8,2) DEFAULT NULL,
    `Width`            DECIMAL(8,2) DEFAULT NULL,
    `Height`           DECIMAL(8,2) DEFAULT NULL,
    `ColorFinish`      VARCHAR(100) DEFAULT NULL,
    `Notes`            TEXT DEFAULT NULL,
    `ExtraCost`        DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (`ExtraCost` >= 0),
    FOREIGN KEY (`OrderItemID`) REFERENCES `Order_Item`(`OrderItemID`) ON DELETE CASCADE,
    FOREIGN KEY (`MaterialID`)  REFERENCES `Material`(`MaterialID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Payment` (
    `PaymentID`    VARCHAR(50) NOT NULL PRIMARY KEY,
    `OrderID`      VARCHAR(50) NOT NULL,
    `PaymentDate`  DATE NOT NULL,
    `Amount`       DECIMAL(10,2) NOT NULL CHECK (`Amount` > 0),
    FOREIGN KEY (`OrderID`) REFERENCES `Customer_Order`(`OrderID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Production_Task` (
    `TaskID`       VARCHAR(50) NOT NULL PRIMARY KEY,
    `OrderItemID`  VARCHAR(50) NOT NULL,
    `StartDate`    DATE DEFAULT NULL,
    `EndDate`      DATE DEFAULT NULL,
    `TaskStatus`   VARCHAR(20) NOT NULL DEFAULT 'Todo'
                   CHECK (`TaskStatus` IN ('Todo','InProgress','Done','Blocked')),
    FOREIGN KEY (`OrderItemID`) REFERENCES `Order_Item`(`OrderItemID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- INITIAL SEED DATA (12 Tables — Non-Incrementing Code IDs like LR-LV-014)
-- =============================================================================

-- 1. Admin
INSERT INTO `Admin` (`AdminID`, `Email`, `PasswordHash`) VALUES
('ADM-LR-901', 'admin@lilliarowena.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- 2. Category (5 Showroom Categories)
INSERT INTO `Category` (`CategoryID`, `CategoryName`, `Description`) VALUES
('CAT-LV-110', 'Living Room', 'Low-slung architectural silhouettes upholstered in heavyweight Belgian linen and nubby wool bouclé, paired with kiln-dried white oak lounge frames and honed Italian travertine surfaces.'),
('CAT-DN-220', 'Dining Room', 'Heirloom dining tables milled from FAS-grade American black walnut and European white oak slabs, finished with hand-rubbed organic linseed oil and paired with Danish paper-cord chairs.'),
('CAT-BD-330', 'Bedroom', 'Quiet, grounding sleep architecture featuring Belgian flax linen headboards, solid ash timber platform rails, and cantilevered bedside tables with soft-close dovetail drawers.'),
('CAT-OF-440', 'Study/Work Desks', 'Commanding work desks and custom-milled fluted credenzas engineered with concealed cable channels, solid brass hardware, and book-matched walnut veneer interiors.'),
('CAT-KT-550', 'Kitchen', 'Architectural kitchen islands, honed Roman travertine prep surfaces, and sculpted solid oak counter stools crafted for open-plan culinary ateliers.');

-- 3. Customer
INSERT INTO `Customer` (`CustomerID`, `FullName`, `Email`, `PasswordHash`, `PhoneNumber`, `Address`) VALUES
('LR-CUS-301', 'Rowena Vance', 'rowena.vance@vancearchitects.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1 (212) 555-0148', 'Suite 400, 118 Mercer St, SoHo, New York, NY 10013'),
('LR-CUS-302', 'Julian Mercier', 'j.mercier@mercierstudio.co', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1 (415) 555-0192', '742 Evergreen Terrace, Pacific Heights, SF'),
('LR-CUS-304', 'Elena Rostova', 'elena@rostovainteriors.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+44 20 7946 0821', '29A Kensington Park Rd, Notting Hill'),
('LR-CUS-308', 'Marcus Sterling', 'm.sterling@sterlingcapital.io', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1 (312) 555-0164', '880 Lake Shore Drive, Apt 32B, Chicago');

-- 4. Product (11 Showroom Pieces — Explicit Product Code IDs like LR-LV-014)
INSERT INTO `Product` (`ProductID`, `CategoryID`, `ProductName`, `BasePrice`) VALUES
('LR-LV-014', 'CAT-LV-110', 'Rowena Curved Bouclé Lounge Sofa', 4850.00),
('LR-DN-108', 'CAT-DN-220', 'Lillia Monolith Solid Walnut Dining Table', 4200.00),
('LR-BD-204', 'CAT-BD-330', 'Serene Belgian Linen Platform Bed (King)', 3650.00),
('LR-OF-315', 'CAT-OF-440', 'Quarter-Sawn Oak Architect Work Desk', 2150.00),
('LR-OF-302', 'CAT-OF-440', 'Mercier Fluted Walnut Sideboard Credenza', 3890.00),
('LR-LV-029', 'CAT-LV-110', 'Cavana Sculpted White Oak Lounge Chair', 1680.00),
('LR-LV-042', 'CAT-LV-110', 'Verona Honed Travertine Plinth Table', 2350.00),
('LR-DN-115', 'CAT-DN-220', 'Solenne Woven Cord Dining Chair (Set of 2)', 1290.00),
('LR-BD-219', 'CAT-BD-330', 'Cantilevered Ash Bedside Nightstand (Pair)', 1180.00),
('LR-KT-401', 'CAT-KT-550', 'Valen Travertine & Walnut Kitchen Island', 3850.00),
('LR-KT-412', 'CAT-KT-550', 'Soren Sculpted Oak Counter Stools (Set of 2)', 1450.00);

-- 5. Material (8 Workshop Raw Materials — Explicit Material Code IDs)
INSERT INTO `Material` (`MaterialID`, `MaterialName`, `MaterialType`, `Unit`, `UnitCost`, `StockQuantity`) VALUES
('MAT-WAL-01', 'FAS American Black Walnut Slabs', 'Solid Timber', 'bd ft', 28.00, 180.00),
('MAT-OAK-02', 'Quarter-Sawn European White Oak', 'Solid Timber', 'bd ft', 22.00, 145.00),
('MAT-ASH-03', 'Kiln-Dried European Ash Timber', 'Solid Timber', 'bd ft', 19.00, 28.00),
('MAT-BCL-04', 'Heavyweight Belgian Wool Bouclé', 'Upholstery Textile', 'sq m', 68.00, 84.00),
('MAT-LIN-05', 'Unbleached Belgian Flax Linen', 'Upholstery Textile', 'sq m', 54.00, 62.00),
('MAT-TRV-06', 'Honed Roman Travertine Blocks', 'Architectural Stone', 'slabs', 420.00, 6.00),
('MAT-BRS-07', 'Solid Aged Brass Hardware & Butterfly Keys', 'Hardware & Joinery', 'sets', 95.00, 32.00),
('MAT-CRD-08', 'Danish Waxed Paper Cord & Cold-Pressed Linseed Oil', 'Cord & Finishes', 'rolls', 42.00, 24.00);

-- 6. Voucher (Single-Customer, Single-Product Fixed-Amount Vouchers — Explicit Voucher Code IDs)
INSERT INTO `Voucher` (`VoucherID`, `CustomerID`, `ProductID`, `AdminID`, `Code`, `DiscountValue`, `ExpiryDate`, `Status`) VALUES
('VCH-LR-740', 'LR-CUS-301', 'LR-LV-014', 'ADM-LR-901', 'VCH-ROWENA-SOFA400', 400.00, '2026-12-31', 'Active'),
('VCH-LR-735', 'LR-CUS-301', 'LR-DN-108', 'ADM-LR-901', 'VCH-ROWENA-WALNUT350', 350.00, '2026-12-31', 'Active'),
('VCH-LR-725', 'LR-CUS-302', 'LR-BD-204', 'ADM-LR-901', 'VCH-JULIAN-BED250', 250.00, '2026-12-15', 'Active'),
('VCH-LR-710', 'LR-CUS-304', 'LR-OF-315', 'ADM-LR-901', 'VCH-ELENA-DESK300', 300.00, '2026-12-10', 'Used'),
('VCH-LR-705', 'LR-CUS-308', 'LR-LV-029', 'ADM-LR-901', 'VCH-MARCUS-CHAIR200', 200.00, '2026-10-31', 'Expired'),
('VCH-LR-690', 'LR-CUS-302', 'LR-OF-302', 'ADM-LR-901', 'VCH-JULIAN-CREDENZA150', 150.00, '2026-12-20', 'Revoked');

-- 7. Customer_Order (Explicit Order Code IDs across September, October, and November 2026)
INSERT INTO `Customer_Order` (`OrderID`, `CustomerID`, `OrderDate`, `Status`) VALUES
('ORD-2026-8841', 'LR-CUS-301', '2026-10-18', 'InProduction'),
('ORD-2026-8834', 'LR-CUS-301', '2026-10-04', 'Ready'),
('ORD-2026-8829', 'LR-CUS-302', '2026-10-11', 'InProduction'),
('ORD-2026-8815', 'LR-CUS-304', '2026-09-26', 'Delivered'),
('ORD-2026-8850', 'LR-CUS-308', '2026-11-08', 'Pending'),
('ORD-2026-8854', 'LR-CUS-304', '2026-11-04', 'Delivered'),
('ORD-2026-8858', 'LR-CUS-301', '2026-11-11', 'Delivered'),
('ORD-2026-8862', 'LR-CUS-302', '2026-11-15', 'InProduction');

-- 8. Order_Item (Explicit OrderItem Code IDs)
INSERT INTO `Order_Item` (`OrderItemID`, `OrderID`, `ProductID`, `VoucherID`, `ItemType`, `Quantity`, `UnitPrice`) VALUES
('ITM-2026-5841', 'ORD-2026-8841', 'LR-DN-108', NULL, 'Custom', 1, 3696.00),
('ITM-2026-5834', 'ORD-2026-8834', 'LR-LV-014', NULL, 'Standard', 1, 4365.00),
('ITM-2026-5829', 'ORD-2026-8829', 'LR-OF-302', NULL, 'Standard', 2, 3307.00),
('ITM-2026-5815', 'ORD-2026-8815', 'LR-BD-204', NULL, 'Standard', 1, 3650.00),
('ITM-2026-5850', 'ORD-2026-8850', 'LR-LV-029', NULL, 'Standard', 2, 1840.00),
('ITM-2026-5854', 'ORD-2026-8854', 'LR-KT-401', 'VCH-LR-710', 'Standard', 1, 3165.00),
('ITM-2026-5858', 'ORD-2026-8858', 'LR-DN-115', NULL, 'Standard', 3, 1290.00),
('ITM-2026-5862', 'ORD-2026-8862', 'LR-OF-315', NULL, 'Standard', 1, 2150.00);

-- 9. Order_Item_Material
INSERT INTO `Order_Item_Material` (`OrderItemID`, `MaterialID`, `QuantityUsed`) VALUES
('ITM-2026-5841', 'MAT-WAL-01', 48.00),
('ITM-2026-5834', 'MAT-BCL-04', 14.00),
('ITM-2026-5829', 'MAT-WAL-01', 64.00),
('ITM-2026-5815', 'MAT-LIN-05', 16.00),
('ITM-2026-5850', 'MAT-OAK-02', 24.00),
('ITM-2026-5854', 'MAT-TRV-06', 2.00),
('ITM-2026-5858', 'MAT-CRD-08', 4.00),
('ITM-2026-5862', 'MAT-OAK-02', 18.00);

-- 10. Customization (Explicit Customization Code ID)
INSERT INTO `Customization` (`CustomizationID`, `OrderItemID`, `MaterialID`, `Length`, `Width`, `Height`, `ColorFinish`, `Notes`, `ExtraCost`) VALUES
('CSM-2026-6841', 'ITM-2026-5841', 'MAT-WAL-01', 260.00, 110.00, 75.00, 'Hand-Rubbed Natural Walnut', 'Book-matched walnut slab approved by client via slab photography.', 0.00);

-- 11. Payment (Explicit Payment Code IDs)
INSERT INTO `Payment` (`PaymentID`, `OrderID`, `PaymentDate`, `Amount`) VALUES
('PAY-2026-9841', 'ORD-2026-8841', '2026-10-18', 1848.00),
('PAY-2026-9834', 'ORD-2026-8834', '2026-10-04', 4365.00),
('PAY-2026-9829', 'ORD-2026-8829', '2026-10-11', 3307.00),
('PAY-2026-9815', 'ORD-2026-8815', '2026-09-26', 3650.00),
('PAY-2026-9854', 'ORD-2026-8854', '2026-11-04', 3165.00),
('PAY-2026-9858', 'ORD-2026-8858', '2026-11-11', 3870.00),
('PAY-2026-9862', 'ORD-2026-8862', '2026-11-15', 2150.00);

-- 12. Production_Task (Explicit Task Code IDs)
INSERT INTO `Production_Task` (`TaskID`, `OrderItemID`, `StartDate`, `EndDate`, `TaskStatus`) VALUES
('TSK-2026-2841', 'ITM-2026-5841', '2026-10-18', NULL, 'InProgress'),
('TSK-2026-2834', 'ITM-2026-5834', '2026-10-04', '2026-11-12', 'Done'),
('TSK-2026-2829', 'ITM-2026-5829', '2026-10-11', NULL, 'InProgress'),
('TSK-2026-2815', 'ITM-2026-5815', '2026-09-26', '2026-11-08', 'Done'),
('TSK-2026-2850', 'ITM-2026-5850', '2026-11-08', NULL, 'Todo'),
('TSK-2026-2854', 'ITM-2026-5854', '2026-11-04', '2026-11-14', 'Done'),
('TSK-2026-2858', 'ITM-2026-5858', '2026-11-11', '2026-11-15', 'Done'),
('TSK-2026-2862', 'ITM-2026-5862', '2026-11-15', NULL, 'InProgress');

-- =============================================================================
-- STORED PROCEDURES & TRIGGERS
-- =============================================================================

DELIMITER $$

CREATE PROCEDURE `check_voucher_use`(
    IN p_voucher_id   VARCHAR(50),
    IN p_order_id     VARCHAR(50),
    IN p_check_status BOOLEAN
)
BEGIN
    DECLARE v_customer   VARCHAR(50);
    DECLARE v_product    VARCHAR(50);
    DECLARE v_discount   DECIMAL(10,2);
    DECLARE v_status     VARCHAR(20);
    DECLARE v_expiry     DATE;
    DECLARE v_expires_at DATETIME;
    DECLARE p_base_price DECIMAL(10,2);
    DECLARE o_customer   VARCHAR(50);

    IF p_voucher_id IS NOT NULL THEN
        SELECT CustomerID, ProductID, DiscountValue, Status, ExpiryDate, ExpiresAt
          INTO v_customer, v_product, v_discount, v_status, v_expiry, v_expires_at
          FROM Voucher WHERE VoucherID = p_voucher_id;

        SELECT BasePrice INTO p_base_price
          FROM Product WHERE ProductID = v_product;

        SELECT CustomerID INTO o_customer
          FROM Customer_Order WHERE OrderID = p_order_id;

        IF v_customer <> o_customer THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Voucher does not belong to the customer of this order';
        END IF;

        IF v_discount <= 0 OR (p_base_price IS NOT NULL AND v_discount > p_base_price) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Voucher discount amount is invalid or exceeds product price';
        END IF;

        IF p_check_status THEN
            IF v_status NOT IN ('Active', 'Expiring Soon') THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Voucher is not active';
            END IF;
            IF v_expires_at IS NOT NULL AND v_expires_at <= NOW() THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Voucher has expired';
            END IF;
            IF v_expires_at IS NULL AND v_expiry IS NOT NULL AND v_expiry < CURDATE() THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Voucher has expired';
            END IF;
        END IF;
    END IF;
END$$

CREATE TRIGGER `trg_order_item_bi`
BEFORE INSERT ON `Order_Item`
FOR EACH ROW
BEGIN
    CALL check_voucher_use(NEW.VoucherID, NEW.OrderID, TRUE);
END$$

CREATE TRIGGER `trg_order_item_bu`
BEFORE UPDATE ON `Order_Item`
FOR EACH ROW
BEGIN
    CALL check_voucher_use(NEW.VoucherID, NEW.OrderID, NOT (NEW.VoucherID <=> OLD.VoucherID));
END$$

CREATE PROCEDURE `sp_record_stock_movement`(
    IN p_material_id   VARCHAR(50),
    IN p_admin_id      VARCHAR(50),
    IN p_movement_type VARCHAR(20),
    IN p_quantity      DECIMAL(12,2),
    IN p_unit_cost     DECIMAL(10,2),
    IN p_reason        VARCHAR(150)
)
BEGIN
    DECLARE v_prev_stock DECIMAL(12,2);
    DECLARE v_new_stock  DECIMAL(12,2);

    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock movement quantity must be greater than zero';
    END IF;

    START TRANSACTION;

    SELECT StockQuantity INTO v_prev_stock
      FROM Material
     WHERE MaterialID = p_material_id
       FOR UPDATE;

    IF v_prev_stock IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Material not found for stock movement';
    END IF;

    IF p_movement_type = 'Stock In' THEN
        SET v_new_stock = v_prev_stock + p_quantity;
    ELSEIF p_movement_type = 'Stock Out' THEN
        IF v_prev_stock < p_quantity THEN
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock: cannot deduct more than available quantity';
        END IF;
        SET v_new_stock = v_prev_stock - p_quantity;
    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid movement type (must be Stock In or Stock Out)';
    END IF;

    UPDATE Material
       SET StockQuantity = v_new_stock,
           UnitCost      = COALESCE(p_unit_cost, UnitCost)
     WHERE MaterialID = p_material_id;

    COMMIT;
END$$

DELIMITER ;
