-- IMS Database Schema

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  sku           VARCHAR(100) UNIQUE NOT NULL,
  name          VARCHAR(255) NOT NULL,
  category_id   INT,
  qty           INT DEFAULT 0,
  reorder_level INT DEFAULT 10,
  unit_price    DECIMAL(10,2) DEFAULT 0.00,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(255) NOT NULL,
  contact VARCHAR(255),
  email   VARCHAR(255),
  phone   VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(255),
  status        ENUM('pending','completed','cancelled') DEFAULT 'pending',
  total         DECIMAL(10,2) DEFAULT 0.00,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  qty        INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT,
  status      ENUM('pending','received','cancelled') DEFAULT 'pending',
  total       DECIMAL(10,2) DEFAULT 0.00,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS stock_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  change_qty INT,
  reason     VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);