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

CREATE TABLE Supplier (
    SupplierID         INT AUTO_INCREMENT PRIMARY KEY,
    SupplierName       VARCHAR(150) NOT NULL,
    ContactPersonName  VARCHAR(100),
    Phone              VARCHAR(30),
    Address            VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE Customer (
    CustomerID    INT AUTO_INCREMENT PRIMARY KEY,
    FullName      VARCHAR(150) NOT NULL,
    Email         VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash  VARCHAR(255) NOT NULL,
    PhoneNumber   VARCHAR(30),
    Address       VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE Employee (
    EmployeeID   INT AUTO_INCREMENT PRIMARY KEY,
    FullName     VARCHAR(150) NOT NULL,
    Role         VARCHAR(30) NOT NULL
                 CHECK (Role IN ('Manager','Sales','Carpenter','Driver','Other')),
    PhoneNumber  VARCHAR(30),
    HireDate     DATE,
    Status       VARCHAR(20) NOT NULL DEFAULT 'Active'
                 CHECK (Status IN ('Active','Inactive','OnLeave'))
) ENGINE=InnoDB;

-- ---------- Catalog ----------

-- 1. Product: Added Description, ImagePath, and IsCustomizable
CREATE TABLE Product (
    ProductID       INT AUTO_INCREMENT PRIMARY KEY,
    CategoryID      INT NOT NULL,
    ProductName     VARCHAR(150) NOT NULL,
    Description     TEXT,
    BasePrice       DECIMAL(10,2) NOT NULL CHECK (BasePrice >= 0),
    ImagePath       VARCHAR(255),
    IsCustomizable  TINYINT(1) NOT NULL DEFAULT 1 CHECK (IsCustomizable IN (0, 1)),
    CONSTRAINT fk_product_category FOREIGN KEY (CategoryID) 
        REFERENCES Category(CategoryID)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE Material (
    MaterialID     INT AUTO_INCREMENT PRIMARY KEY,
    SupplierID     INT NOT NULL,
    MaterialName   VARCHAR(150) NOT NULL,
    MaterialType   VARCHAR(100),
    Unit           VARCHAR(20) NOT NULL,
    UnitCost       DECIMAL(10,2) NOT NULL CHECK (UnitCost >= 0),
    StockQuantity  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (StockQuantity >= 0),
    FOREIGN KEY (SupplierID) REFERENCES Supplier(SupplierID)
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

-- ---------- Delivery (batch: one delivery carries many orders) ----------

CREATE TABLE Delivery (
    DeliveryID       INT AUTO_INCREMENT PRIMARY KEY,
    EmployeeID       INT,                                         -- driver
    ReceiverName     VARCHAR(150),
    DeliveryAddress  VARCHAR(255) NOT NULL,
    ScheduledDate    DATE,
    DeliveryStatus   VARCHAR(20) NOT NULL DEFAULT 'Scheduled'
                     CHECK (DeliveryStatus IN ('Scheduled','InTransit','Delivered','Failed')),
    FOREIGN KEY (EmployeeID) REFERENCES Employee(EmployeeID)
) ENGINE=InnoDB;

-- ---------- Orders ----------

CREATE TABLE Customer_Order (
    OrderID     INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID  INT NOT NULL,
    EmployeeID  INT,                                              -- handler, optional
    DeliveryID  INT,                                              -- set once scheduled
    OrderDate   DATE NOT NULL DEFAULT (CURRENT_DATE),
    DueDate     DATE,
    Status      VARCHAR(20) NOT NULL DEFAULT 'Pending'
                CHECK (Status IN ('Pending','Confirmed','InProduction','Ready','Delivered','Completed','Cancelled')),
    CONSTRAINT chk_order_dates CHECK (DueDate IS NULL OR DueDate >= OrderDate),
    CONSTRAINT fk_order_customer FOREIGN KEY (CustomerID) 
        REFERENCES Customer(CustomerID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_order_employee FOREIGN KEY (EmployeeID) 
        REFERENCES Employee(EmployeeID)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_delivery FOREIGN KEY (DeliveryID) 
        REFERENCES Delivery(DeliveryID) 
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Order_Item: Made ProductID nullable for bespoke items + guarded Voucher FK
CREATE TABLE Order_Item (
    OrderItemID  INT AUTO_INCREMENT PRIMARY KEY,
    OrderID      INT NOT NULL,
    ProductID    INT NULL,                                        -- NULL allowed for 100% custom/bespoke pieces
    VoucherID    INT UNIQUE,                                      -- single use
    ItemType     VARCHAR(20) NOT NULL DEFAULT 'Standard'
                 CHECK (ItemType IN ('Standard','Custom')),
    Quantity     INT NOT NULL DEFAULT 1 CHECK (Quantity > 0),
    UnitPrice    DECIMAL(10,2) NOT NULL CHECK (UnitPrice >= 0),   -- snapshot at purchase
    -- Guard rules:
    -- 1) Standard items must link to a catalog ProductID
    -- 2) Product-specific vouchers require a non-null ProductID
    CONSTRAINT chk_standard_has_product CHECK (ItemType = 'Custom' OR ProductID IS NOT NULL),
    CONSTRAINT chk_voucher_requires_product CHECK (VoucherID IS NULL OR ProductID IS NOT NULL),
    CONSTRAINT fk_item_order FOREIGN KEY (OrderID) 
        REFERENCES Customer_Order(OrderID) 
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_item_product FOREIGN KEY (ProductID) 
        REFERENCES Product(ProductID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_item_voucher_product FOREIGN KEY (VoucherID, ProductID) 
        REFERENCES Voucher(VoucherID, ProductID)
        ON UPDATE CASCADE ON DELETE RESTRICT
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
    PaymentType  VARCHAR(20) NOT NULL DEFAULT 'Downpayment'
                 CHECK (PaymentType IN ('Downpayment','Progress','Final')),
    PaymentDate  DATE NOT NULL DEFAULT (CURRENT_DATE),
    Amount       DECIMAL(10,2) NOT NULL CHECK (Amount > 0),
    CONSTRAINT fk_payment_order FOREIGN KEY (OrderID) 
        REFERENCES Customer_Order(OrderID)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE Production_Task (
    TaskID       INT AUTO_INCREMENT PRIMARY KEY,
    OrderItemID  INT NOT NULL,
    EmployeeID   INT NULL,                                        -- NULL until assigned to a worker
    Stage        VARCHAR(30) NOT NULL
                 CHECK (Stage IN ('Cutting','Assembly','Sanding','Finishing')),
    StartDate    DATE,
    EndDate      DATE,
    TaskStatus   VARCHAR(20) NOT NULL DEFAULT 'Todo'
                 CHECK (TaskStatus IN ('Todo','InProgress','Done','Blocked')),
    CONSTRAINT chk_task_dates CHECK (EndDate IS NULL OR StartDate IS NULL OR EndDate >= StartDate),
    CONSTRAINT fk_task_item FOREIGN KEY (OrderItemID) 
        REFERENCES Order_Item(OrderItemID) 
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_task_employee FOREIGN KEY (EmployeeID) 
        REFERENCES Employee(EmployeeID)
        ON UPDATE CASCADE ON DELETE SET NULL
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
    IN p_product_id    INT,
    IN p_supplier_id   INT,
    IN p_admin_id      INT,
    IN p_movement_type VARCHAR(20),
    IN p_quantity      INT,
    IN p_unit_cost     DECIMAL(10,2),
    IN p_reason        VARCHAR(150)
)
BEGIN
    DECLARE v_prev_stock INT;
    DECLARE v_new_stock  INT;

    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock movement quantity must be greater than zero';
    END IF;

    START TRANSACTION;

    SELECT StockQuantity INTO v_prev_stock
      FROM Product
     WHERE ProductID = p_product_id
       FOR UPDATE;

    IF v_prev_stock IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product not found for stock movement';
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

    UPDATE Product
       SET StockQuantity = v_new_stock
     WHERE ProductID = p_product_id;

    INSERT INTO Inventory_Record (ProductID, AvailableStock)
    VALUES (p_product_id, v_new_stock)
    ON DUPLICATE KEY UPDATE AvailableStock = v_new_stock;

    INSERT INTO Stock_Movement (
        ProductID, SupplierID, AdminID, MovementType,
        Quantity, PreviousStock, NewStock, UnitPurchaseCost, Reason
    ) VALUES (
        p_product_id, p_supplier_id, p_admin_id, p_movement_type,
        p_quantity, v_prev_stock, v_new_stock, p_unit_cost, p_reason
    );

    COMMIT;
END$$

DELIMITER ;