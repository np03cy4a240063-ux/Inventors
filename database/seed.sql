-- ReInvent IMS Seed Data
-- Simplified for local basic needs: Clothing, Food & Office Supplies

USE ims_db;

-- 1. SEED CATEGORIES
INSERT IGNORE INTO categories (name) VALUES 
('Clothing'), 
('Food & Beverage'), 
('Office Supplies');

-- 2. SEED USERS
INSERT IGNORE INTO users (first_name, last_name, email, password_hash, company_name, is_admin) VALUES
('Admin', 'User', 'admin@reinvent.com', '$2b$10$Xl0yhvzLIaJCDdKBS0Lld.ksK7c2Wss1t8ml/VQKLtEeYFMYGj5fC', 'Lidea Inc.', TRUE);
-- Note: Default password is 'admin123'

-- 3. SEED PRODUCTS (Inventory Snapshot & Action Intelligence)
-- Updated category IDs: 1 = Clothing, 2 = Food, 3 = Office
INSERT IGNORE INTO products (sku, name, category_id, quantity, reorder_level, unit_price) VALUES
('CLTH-001', 'Heavy Cotton T-Shirt', 1, 120, 20,  19.99),
('CLTH-002', 'Denim Jeans (Blue)',   1, 4,  10,  69.99), -- Low-Stock
('FOOD-001', 'Espresso Beans 500g',  2, 0,  15,  18.50), -- Out-of-Stock
('OFFC-001', 'Executive Desk Chair', 3, 8,  5,   249.00);

-- 4. SEED SALES ORDERS (Pending Sales tracking)
INSERT INTO sales_orders (user_id, customer_name, status, total_amount) VALUES
(1, 'John Smith', 'pending', 1359.98),
(1, 'Jane Adams', 'completed', 59.99);

-- 5. SEED PURCHASE ORDERS (Pending Purchase tracking)
INSERT INTO purchase_orders (user_id, supplier_name, status, total_amount) VALUES
(1, 'Global Wholesale', 'pending', 2499.00),
(1, 'FashionFabrics Ltd', 'received', 280.00);

-- 6. SEED ACTIVITY LOGS (Security & Governance)
INSERT INTO activity_logs (user_id, action_type, description) VALUES
(1, 'LOGIN', 'Admin User logged in successfully'),
(1, 'STOCK_UPDATE', 'Product (Espresso Beans) stock reached zero');