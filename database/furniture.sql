-- =====================================================================
-- Physical design (MySQL 8.0.16 or newer, InnoDB)
-- 8.0.16+ is needed so CHECK constraints are actually enforced.
-- Tables are created in dependency order.
-- MySQL automatically indexes foreign key columns, so no separate
-- CREATE INDEX statements are needed.
-- =====================================================================

-- ---------- Independent tables ----------

CREATE TABLE Admin (
    AdminID       INT AUTO_INCREMENT PRIMARY KEY,
    Email         VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash  VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Category (
    CategoryID    INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName  VARCHAR(100) NOT NULL UNIQUE,
    Description   TEXT
) ENGINE=InnoDB;

CREATE TABLE Customer (
    CustomerID    INT AUTO_INCREMENT PRIMARY KEY,
    FullName      VARCHAR(150) NOT NULL,
    Email         VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash  VARCHAR(255) NOT NULL,
    PhoneNumber   VARCHAR(30),
    Address       VARCHAR(255)
) ENGINE=InnoDB;

-- ---------- Catalog ----------

CREATE TABLE Product (
    ProductID    INT AUTO_INCREMENT PRIMARY KEY,
    CategoryID   INT NOT NULL,
    ProductName  VARCHAR(150) NOT NULL,
    BasePrice    DECIMAL(10,2) NOT NULL CHECK (BasePrice >= 0),
    FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
) ENGINE=InnoDB;

CREATE TABLE Material (
    MaterialID     INT AUTO_INCREMENT PRIMARY KEY,
    MaterialName   VARCHAR(150) NOT NULL,
    MaterialType   VARCHAR(100),
    Unit           VARCHAR(20) NOT NULL,
    UnitCost       DECIMAL(10,2) NOT NULL CHECK (UnitCost >= 0),
    StockQuantity  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (StockQuantity >= 0)
) ENGINE=InnoDB;

-- ---------- Voucher (issued by an admin to ONE customer for ONE product) ----------

CREATE TABLE Voucher (
    VoucherID      INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID     INT NOT NULL,
    ProductID      INT NOT NULL,
    AdminID        INT NOT NULL,                                  -- admin who issued it
    Code           VARCHAR(50) NOT NULL UNIQUE,
    DiscountValue  DECIMAL(10,2) NOT NULL CHECK (DiscountValue > 0),   -- fixed amount off
    ExpiryDate     DATE,                                          -- NULL = never expires
    Status         VARCHAR(20) NOT NULL DEFAULT 'Active'
                   CHECK (Status IN ('Active','Used','Expired','Cancelled')),
    IssuedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- lets Order_Item prove the voucher's product matches the item's product
    UNIQUE (VoucherID, ProductID),
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID),
    FOREIGN KEY (ProductID)  REFERENCES Product(ProductID),
    FOREIGN KEY (AdminID)    REFERENCES Admin(AdminID)
) ENGINE=InnoDB;

-- ---------- Orders ----------

CREATE TABLE Customer_Order (
    OrderID     INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID  INT NOT NULL,
    OrderDate   DATE NOT NULL DEFAULT (CURRENT_DATE),
    Status      VARCHAR(20) NOT NULL DEFAULT 'Pending'
                CHECK (Status IN ('Pending','InProduction','Ready','Delivered','Cancelled')),
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID)
) ENGINE=InnoDB;

CREATE TABLE Order_Item (
    OrderItemID  INT AUTO_INCREMENT PRIMARY KEY,
    OrderID      INT NOT NULL,
    ProductID    INT NOT NULL,
    VoucherID    INT UNIQUE,                                      -- single use
    ItemType     VARCHAR(20) NOT NULL DEFAULT 'Standard'
                 CHECK (ItemType IN ('Standard','Custom')),
    Quantity     INT NOT NULL CHECK (Quantity > 0),
    UnitPrice    DECIMAL(10,2) NOT NULL CHECK (UnitPrice >= 0),   -- snapshot at purchase
    FOREIGN KEY (OrderID)   REFERENCES Customer_Order(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Product(ProductID),
    -- voucher must be for the same product as the item
    FOREIGN KEY (VoucherID, ProductID) REFERENCES Voucher(VoucherID, ProductID)
) ENGINE=InnoDB;

CREATE TABLE Order_Item_Material (
    OrderItemID   INT NOT NULL,
    MaterialID    INT NOT NULL,
    QuantityUsed  DECIMAL(12,2) NOT NULL CHECK (QuantityUsed > 0),
    PRIMARY KEY (OrderItemID, MaterialID),
    FOREIGN KEY (OrderItemID) REFERENCES Order_Item(OrderItemID) ON DELETE CASCADE,
    FOREIGN KEY (MaterialID)  REFERENCES Material(MaterialID)
) ENGINE=InnoDB;

CREATE TABLE Customization (
    CustomizationID  INT AUTO_INCREMENT PRIMARY KEY,
    OrderItemID      INT NOT NULL UNIQUE,                         -- optional 1:1 with Order_Item
    MaterialID       INT,                                         -- optional
    Length           DECIMAL(8,2) CHECK (Length > 0),
    Width            DECIMAL(8,2) CHECK (Width > 0),
    Height           DECIMAL(8,2) CHECK (Height > 0),
    ColorFinish      VARCHAR(100),
    Notes            TEXT,
    ExtraCost        DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (ExtraCost >= 0),
    FOREIGN KEY (OrderItemID) REFERENCES Order_Item(OrderItemID) ON DELETE CASCADE,
    FOREIGN KEY (MaterialID)  REFERENCES Material(MaterialID)
) ENGINE=InnoDB;

CREATE TABLE Payment (
    PaymentID    INT AUTO_INCREMENT PRIMARY KEY,
    OrderID      INT NOT NULL,
    PaymentDate  DATE NOT NULL DEFAULT (CURRENT_DATE),
    Amount       DECIMAL(10,2) NOT NULL CHECK (Amount > 0),
    FOREIGN KEY (OrderID) REFERENCES Customer_Order(OrderID)
) ENGINE=InnoDB;

CREATE TABLE Production_Task (
    TaskID       INT AUTO_INCREMENT PRIMARY KEY,
    OrderItemID  INT NOT NULL,
    StartDate    DATE,
    EndDate      DATE,
    TaskStatus   VARCHAR(20) NOT NULL DEFAULT 'Todo'
                 CHECK (TaskStatus IN ('Todo','InProgress','Done','Blocked')),
    CHECK (EndDate IS NULL OR StartDate IS NULL OR EndDate >= StartDate),
    FOREIGN KEY (OrderItemID) REFERENCES Order_Item(OrderItemID) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Voucher rules checked when a voucher is attached to an order item ----------
--  * only the customer it was issued to can use it
--  * it must be Active and not past its ExpiryDate (checked when first attached)
-- Your app should set Voucher.Status = 'Used' after the item is saved.
-- (Run this part with the DELIMITER lines; phpMyAdmin and the mysql client both support them.)

DELIMITER $$

CREATE PROCEDURE check_voucher_use(
    IN p_voucher_id   INT,
    IN p_order_id     INT,
    IN p_check_status BOOLEAN
)
BEGIN
    DECLARE v_customer INT;
    DECLARE v_status   VARCHAR(20);
    DECLARE v_expiry   DATE;
    DECLARE o_customer INT;

    IF p_voucher_id IS NOT NULL THEN
        SELECT CustomerID, Status, ExpiryDate
          INTO v_customer, v_status, v_expiry
          FROM Voucher WHERE VoucherID = p_voucher_id;

        SELECT CustomerID INTO o_customer
          FROM Customer_Order WHERE OrderID = p_order_id;

        IF v_customer <> o_customer THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Voucher does not belong to the customer of this order';
        END IF;

        IF p_check_status THEN
            IF v_status <> 'Active' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Voucher is not active';
            END IF;
            IF v_expiry IS NOT NULL AND v_expiry < CURRENT_DATE THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Voucher has expired';
            END IF;
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_order_item_bi
BEFORE INSERT ON Order_Item
FOR EACH ROW
BEGIN
    CALL check_voucher_use(NEW.VoucherID, NEW.OrderID, TRUE);
END$$

CREATE TRIGGER trg_order_item_bu
BEFORE UPDATE ON Order_Item
FOR EACH ROW
BEGIN
    -- status/expiry are only re-checked when the voucher itself changes
    CALL check_voucher_use(NEW.VoucherID, NEW.OrderID, NOT (NEW.VoucherID <=> OLD.VoucherID));
END$$

CREATE PROCEDURE sp_record_stock_movement(
    IN p_material_id   INT,
    IN p_admin_id      INT,
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

-- =============================================================================
-- INITIAL SEED DATA (12 Tables)
-- =============================================================================

-- 1. Admin
INSERT IGNORE INTO Admin (AdminID, Email, PasswordHash) VALUES
(1, 'admin@lilliarowena.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- 2. Category (5 Showroom Categories)
INSERT IGNORE INTO Category (CategoryID, CategoryName, Description) VALUES
(1, 'Living Room', 'Low-slung architectural silhouettes upholstered in heavyweight Belgian linen and nubby wool bouclé, paired with kiln-dried white oak lounge frames and honed Italian travertine surfaces.'),
(2, 'Dining Room', 'Heirloom dining tables milled from FAS-grade American black walnut and European white oak slabs, finished with hand-rubbed organic linseed oil and paired with Danish paper-cord chairs.'),
(3, 'Bedroom', 'Quiet, grounding sleep architecture featuring Belgian flax linen headboards, solid ash timber platform rails, and cantilevered bedside tables with soft-close dovetail drawers.'),
(4, 'Study/Work Desks', 'Commanding work desks and custom-milled fluted credenzas engineered with concealed cable channels, solid brass hardware, and book-matched walnut veneer interiors.'),
(5, 'Kitchen', 'Architectural kitchen islands, honed Roman travertine prep surfaces, and sculpted solid oak counter stools crafted for open-plan culinary ateliers.');

-- 3. Customer
INSERT IGNORE INTO Customer (CustomerID, FullName, Email, PasswordHash, PhoneNumber, Address) VALUES
(1, 'Rowena Vance', 'rowena.vance@vancearchitects.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1 (212) 555-0148', 'Suite 400, 118 Mercer St, SoHo, New York, NY 10013'),
(2, 'Julian Mercier', 'j.mercier@mercierstudio.co', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1 (415) 555-0192', '742 Evergreen Terrace, Pacific Heights, SF'),
(3, 'Elena Rostova', 'elena@rostovainteriors.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+44 20 7946 0821', '29A Kensington Park Rd, Notting Hill'),
(4, 'Marcus Sterling', 'm.sterling@sterlingcapital.io', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1 (312) 555-0164', '880 Lake Shore Drive, Apt 32B, Chicago');

-- 4. Product (10 Showroom Pieces)
INSERT IGNORE INTO Product (ProductID, CategoryID, ProductName, BasePrice) VALUES
(1, 1, 'Rowena Curved Bouclé Lounge Sofa', 4850.00),
(2, 2, 'Lillia Monolith Solid Walnut Dining Table', 4200.00),
(3, 3, 'Serene Belgian Linen Platform Bed (King)', 3650.00),
(4, 4, 'Quarter-Sawn Oak Architect Work Desk', 2150.00),
(5, 4, 'Mercier Fluted Walnut Sideboard Credenza', 3890.00),
(6, 1, 'Cavana Sculpted White Oak Lounge Chair', 1680.00),
(7, 1, 'Verona Honed Travertine Plinth Table', 2350.00),
(8, 2, 'Solenne Woven Cord Dining Chair (Set of 2)', 1290.00),
(9, 3, 'Cantilevered Ash Bedside Nightstand (Pair)', 1180.00),
(10, 5, 'Valen Travertine & Walnut Kitchen Island', 3850.00),
(11, 5, 'Soren Sculpted Oak Counter Stools (Set of 2)', 1450.00);

-- 5. Material (8 Workshop Raw Materials)
INSERT IGNORE INTO Material (MaterialID, MaterialName, MaterialType, Unit, UnitCost, StockQuantity) VALUES
(1, 'FAS American Black Walnut Slabs', 'Solid Timber', 'bd ft', 28.00, 180.00),
(2, 'Quarter-Sawn European White Oak', 'Solid Timber', 'bd ft', 22.00, 145.00),
(3, 'Kiln-Dried European Ash Timber', 'Solid Timber', 'bd ft', 19.00, 28.00),
(4, 'Heavyweight Belgian Wool Bouclé', 'Upholstery Textile', 'sq m', 68.00, 84.00),
(5, 'Unbleached Belgian Flax Linen', 'Upholstery Textile', 'sq m', 54.00, 62.00),
(6, 'Honed Roman Travertine Blocks', 'Architectural Stone', 'slabs', 420.00, 6.00),
(7, 'Solid Aged Brass Hardware & Butterfly Keys', 'Hardware & Joinery', 'sets', 95.00, 32.00),
(8, 'Danish Waxed Paper Cord & Cold-Pressed Linseed Oil', 'Cord & Finishes', 'rolls', 42.00, 24.00);

-- 6. Voucher (Single-Customer, Single-Product Vouchers)
INSERT IGNORE INTO Voucher (VoucherID, CustomerID, ProductID, AdminID, Code, DiscountValue, ExpiryDate, Status) VALUES
(1, 1, 1, 1, 'VCH-ROWENA-SOFA400', 400.00, '2026-12-31', 'Active'),
(2, 1, 2, 1, 'VCH-ROWENA-WALNUT350', 350.00, '2026-12-31', 'Active'),
(3, 2, 3, 1, 'VCH-JULIAN-BED250', 250.00, '2026-12-15', 'Active');

-- 7. Customer_Order
INSERT IGNORE INTO Customer_Order (OrderID, CustomerID, OrderDate, Status) VALUES
(1, 1, '2026-10-18', 'InProduction'),
(2, 1, '2026-10-04', 'Ready'),
(3, 2, '2026-10-11', 'InProduction'),
(4, 3, '2026-09-26', 'Delivered'),
(5, 4, '2026-11-08', 'Pending');

-- 8. Order_Item
INSERT IGNORE INTO Order_Item (OrderItemID, OrderID, ProductID, VoucherID, ItemType, Quantity, UnitPrice) VALUES
(1, 1, 2, NULL, 'Custom', 1, 3696.00),
(2, 2, 1, NULL, 'Standard', 1, 4365.00),
(3, 3, 5, NULL, 'Standard', 2, 3307.00),
(4, 4, 3, NULL, 'Standard', 1, 3650.00),
(5, 5, 6, NULL, 'Standard', 2, 1840.00);

-- 9. Order_Item_Material
INSERT IGNORE INTO Order_Item_Material (OrderItemID, MaterialID, QuantityUsed) VALUES
(1, 1, 48.00),
(2, 4, 14.00),
(3, 1, 64.00),
(4, 5, 16.00),
(5, 2, 24.00);

-- 10. Customization
INSERT IGNORE INTO Customization (CustomizationID, OrderItemID, MaterialID, Length, Width, Height, ColorFinish, Notes, ExtraCost) VALUES
(1, 1, 1, 260.00, 110.00, 75.00, 'Hand-Rubbed Natural Walnut', 'Book-matched walnut slab approved by client via slab photography.', 0.00);

-- 11. Payment
INSERT IGNORE INTO Payment (PaymentID, OrderID, PaymentDate, Amount) VALUES
(1, 1, '2026-10-18', 1848.00),
(2, 2, '2026-10-04', 4365.00),
(3, 3, '2026-10-11', 3307.00),
(4, 4, '2026-09-26', 3650.00);

-- 12. Production_Task
INSERT IGNORE INTO Production_Task (TaskID, OrderItemID, StartDate, CompletionDate, TaskStatus) VALUES
(1, 1, '2026-10-18', NULL, 'InProgress'),
(2, 2, '2026-10-04', '2026-11-12', 'Done'),
(3, 3, '2026-10-11', NULL, 'InProgress'),
(4, 4, '2026-09-26', '2026-11-08', 'Done'),
(5, 5, '2026-11-08', NULL, 'Todo');

