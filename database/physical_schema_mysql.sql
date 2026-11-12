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

CREATE TABLE Product (
    ProductID    INT AUTO_INCREMENT PRIMARY KEY,
    CategoryID   INT NOT NULL,
    ProductName  VARCHAR(150) NOT NULL,
    BasePrice    DECIMAL(10,2) NOT NULL CHECK (BasePrice >= 0),
    FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
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
    Status      VARCHAR(20) NOT NULL DEFAULT 'Pending'
                CHECK (Status IN ('Pending','InProduction','Ready','Delivered','Cancelled')),
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID),
    FOREIGN KEY (EmployeeID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY (DeliveryID) REFERENCES Delivery(DeliveryID) ON DELETE SET NULL
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
    EmployeeID   INT,
    StartDate    DATE,
    EndDate      DATE,
    TaskStatus   VARCHAR(20) NOT NULL DEFAULT 'Todo'
                 CHECK (TaskStatus IN ('Todo','InProgress','Done','Blocked')),
    CHECK (EndDate IS NULL OR StartDate IS NULL OR EndDate >= StartDate),
    FOREIGN KEY (OrderItemID) REFERENCES Order_Item(OrderItemID) ON DELETE CASCADE,
    FOREIGN KEY (EmployeeID)  REFERENCES Employee(EmployeeID)
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

DELIMITER ;
