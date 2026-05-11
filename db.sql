CREATE DATABASE IF NOT EXISTS reinvent_db_v2;
USE reinvent_db_v2;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    company VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    `desc` TEXT,
    category VARCHAR(100),
    cost DECIMAL(10, 2) NOT NULL,
    sell DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL,
    min INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id INT PRIMARY KEY,
    firstName VARCHAR(50),
    lastName VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    company VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS sales_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    customer VARCHAR(255) NOT NULL,
    items_count INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a sample product
INSERT INTO products (name, sku, `desc`, category, cost, sell, stock, min) 
VALUES ('Test1', 'Skuxxxxx', 'test 0', 'wdwd', 1200.00, 2200.00, 50, 10);

-- Insert a sample sales order
INSERT INTO sales_orders (order_id, date, customer, items_count, total, status)
VALUES ('SO-2026-001', '2026-04-13', 'Acme Trading Co.', 5, 12500.00, 'PENDING');

CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    items_count INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Audit Logs for operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- SALES, PURCHASE, ADJUSTMENT, PRODUCT
    entity_id VARCHAR(50), -- Order ID or Product ID
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_type ENUM('SALES', 'PURCHASE') NOT NULL,
    order_db_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'LOW_STOCK', 'OUT_OF_STOCK', 'ORDER_PLACED'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    adjustment_type ENUM('ADD', 'SUBTRACT', 'SET') NOT NULL,
    quantity INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'ADDED', 'EDITED', 'DELETED'
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
