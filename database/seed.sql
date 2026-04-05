
INSERT INTO users (name, email, password_hash) VALUES
('Admin', 'admin@ims.com', '$2a$10$Xl0yhvzLIaJCDdKBS0Lld.ksK7c2Wss1t8ml/VQKLtEeYFMYGj5fC');
-- Default password: admin123

INSERT INTO categories (name) VALUES ('Electronics'), ('Clothing'), ('Food & Beverage'), ('Office Supplies');

INSERT INTO suppliers (name, contact, email, phone) VALUES
('TechSupply Co.',  'Alice Wang',  'alice@techsupply.com',  '+1-555-0101'),
('Fashion Hub',     'Bob Miller',  'bob@fashionhub.com',    '+1-555-0102');

INSERT INTO products (sku, name, category_id, qty, reorder_level, unit_price) VALUES
('ELEC-001', 'Laptop 15"',      1, 25, 5,  999.99),
('ELEC-002', 'Wireless Mouse',  1, 80, 10,  19.99),
('CLTH-001', 'T-Shirt M',       2, 150,20,  12.99),
('CLTH-002', 'Jeans 32',        2, 3,  10,  49.99),
('FOOD-001', 'Coffee Beans 1kg',3, 0,  15,  14.99),
('OFFC-001', 'A4 Paper (ream)', 4, 60, 20,   6.49);