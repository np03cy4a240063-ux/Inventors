CREATE DATABASE IF NOT EXISTS reinvent_db_v2;
USE reinvent_db_v2;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    company VARCHAR(100),
    phone VARCHAR(20),
    profile_photo LONGTEXT,
    notif_low_stock BOOLEAN DEFAULT TRUE,
    notif_order_updates BOOLEAN DEFAULT TRUE,
    notif_aging_stock BOOLEAN DEFAULT TRUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
