-- ── Migration: Add user isolation columns ─────────────────────────────────
-- Run this once against your existing reinvent_db_v2 database.
-- It safely adds missing columns without dropping existing data.

USE reinvent_db_v2;

-- Add phone, otp_code, otp_expiry to users if missing
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS otp_expiry DATETIME;

-- Add image_url, brand, unit to products if missing
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS image_url LONGTEXT,
    ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
    ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- Add user_id to products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS user_id INT AFTER id;

-- Add user_id to sales_orders
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS user_id INT AFTER id;

-- Add user_id to purchase_orders
ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS user_id INT AFTER id;

-- Add user_id to alerts
ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS user_id INT AFTER id;

-- NOTE: Existing rows will have user_id = NULL.
-- They will not appear for any logged-in user, which is the correct
-- privacy behaviour. New data created after login will be scoped correctly.
