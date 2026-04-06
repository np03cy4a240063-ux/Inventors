
CREATE DATABASE IF NOT EXISTS ims_db;
USE ims_db;

-- 1. USERS TABLE (Signup support)
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name  VARCHAR(255),
    is_admin      BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CATEGORIES (Inventory Intelligence)
CREATE TABLE IF NOT EXISTS categories (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. PRODUCTS (Inventory Snapshot & Intelligence)
CREATE TABLE IF NOT EXISTS products (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    sku           VARCHAR(100) UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    category_id   INT,
    quantity      INT DEFAULT 0,
    reorder_level INT DEFAULT 10, -- For Low-Stock Alerts
    unit_price    DECIMAL(10,2) DEFAULT 0.00,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 4. SALES ORDERS (Action Required Intelligence)
CREATE TABLE IF NOT EXISTS sales_orders (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT,
    customer_name VARCHAR(255),
    status        ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    total_amount  DECIMAL(10,2) DEFAULT 0.00,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL,
    quantity   INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 5. PURCHASE ORDERS (Action Required Intelligence)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT,
    supplier_name VARCHAR(255),
    status        ENUM('pending', 'received', 'cancelled') DEFAULT 'pending',
    total_amount  DECIMAL(10,2) DEFAULT 0.00,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL,
    quantity   INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 6. ACTIVITY LOGS (Security & Governance)
CREATE TABLE IF NOT EXISTS activity_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT,
    action_type VARCHAR(100), -- e.g., 'LOGIN', 'STOCK_UPDATE', 'ORDER_CREATE'
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);