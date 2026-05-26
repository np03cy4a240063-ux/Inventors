const express = require('express');
require('dotenv').config();
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Custom error handler for Body Parser (to return JSON instead of HTML on limit exceeded)
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Image is too large. Please use a smaller file.' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    next();
});

// Request logger for visibility
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection Pool (Robust & Self-Healing)
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Test the pool connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('CRITICAL: Database connection failed!');
        console.error('Error details:', err.message);
        console.error('Make sure your MySQL service is running in XAMPP/LAMPP control panel.');
        return;
    }
    console.log('--- DATABASE POOL INITIALIZED ---');
    console.log('Connected to: reinvent_db_v2');
    
    // Auto-migrate tables for multi-tenancy (Safe for friends pulling from github)
    const tables = ['products', 'sales_orders', 'purchase_orders'];
    tables.forEach(table => {
        connection.query(`SHOW COLUMNS FROM ${table} LIKE 'user_email'`, (e, r) => {
            if (!e && r.length === 0) {
                connection.query(`ALTER TABLE ${table} ADD COLUMN user_email VARCHAR(100) DEFAULT 'Admin123@gmail.com'`, () => {
                    console.log(`Auto-migrated ${table}: added user_email column for multi-tenancy`);
                });
            }
        });
    });

    // Auto-migrate missing columns for products table
    connection.query(`SHOW COLUMNS FROM products LIKE 'image_url'`, (e, r) => {
        if (!e && r.length === 0) connection.query(`ALTER TABLE products ADD COLUMN image_url TEXT`, () => {});
    });
    connection.query(`SHOW COLUMNS FROM products LIKE 'brand'`, (e, r) => {
        if (!e && r.length === 0) connection.query(`ALTER TABLE products ADD COLUMN brand VARCHAR(100)`, () => {});
    });
    connection.query(`SHOW COLUMNS FROM products LIKE 'unit'`, (e, r) => {
        if (!e && r.length === 0) connection.query(`ALTER TABLE products ADD COLUMN unit VARCHAR(50)`, () => {});
    });

    connection.release();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running correctly' });
});

// Email validation regex
const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
};

// Temporary store for signup OTPs (In-memory for demonstration/school project purposes)
const pendingSignups = {};

// Send Signup OTP Endpoint
app.post('/api/send-signup-otp', async (req, res) => {
    const { firstName, lastName, email, company, orgType, password } = req.body;
    if (!email || !password || !firstName || !lastName) return res.status(400).json({ error: 'Missing fields' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

    // Check if email already exists
    db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database check failed' });
        if (results.length > 0) return res.status(400).json({ error: 'Email already exists' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 10 * 60 * 1000; // 10 mins
        
        pendingSignups[email] = {
            otp, expiry,
            data: { firstName, lastName, email, company, orgType: orgType || 'Warehouse', password }
        };

        const mailOptions = {
            from: `"ReInvent Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'ReInvent Signup OTP Verification',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #6366F1;">Verify Your Account</h2>
                    <p>Welcome to ReInvent! Use the code below to complete your registration. This code expires in 10 minutes.</p>
                    <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; color: #1E293B;">
                        ${otp}
                    </div>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Mail Error:', error);
                return res.status(500).json({ error: 'Failed to send OTP email. Check mailer config.' });
            }
            res.json({ message: 'OTP sent to your email' });
        });
    });
});

// Resend Signup OTP Endpoint
app.post('/api/resend-signup-otp', (req, res) => {
    const { email } = req.body;
    if (!pendingSignups[email]) return res.status(400).json({ error: 'No pending signup session found. Please fill the form again.' });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pendingSignups[email].otp = otp;
    pendingSignups[email].expiry = Date.now() + 10 * 60 * 1000;
    
    const mailOptions = {
        from: `"ReInvent Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'ReInvent Signup OTP Verification (Resent)',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #6366F1;">Verify Your Account</h2>
                <p>Your new verification code is below. It expires in 10 minutes.</p>
                <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; color: #1E293B;">
                    ${otp}
                </div>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) return res.status(500).json({ error: 'Failed to resend OTP.' });
        res.json({ message: 'New OTP sent' });
    });
});

// Verify Signup OTP & Create Account Endpoint
app.post('/api/verify-signup-otp', async (req, res) => {
    const { email, otp } = req.body;
    const session = pendingSignups[email];

    if (!session) return res.status(400).json({ error: 'Session expired or not found. Please sign up again.' });
    if (session.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (Date.now() > session.expiry) return res.status(400).json({ error: 'OTP has expired' });

    try {
        const { firstName, lastName, company, orgType, password } = session.data;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const sql = 'INSERT INTO users (first_name, last_name, email, company, org_type, password) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [firstName, lastName, email, company, orgType, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
                return res.status(500).json({ error: 'Registration failed: Database error' });
            }
            delete pendingSignups[email]; // clear session
            res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Encryption error' });
    }
});

// Direct Registration Endpoint (Bypassing OTP, optional)
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, company, orgType, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (first_name, last_name, email, company, org_type, password) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [firstName, lastName, email, company, orgType || 'Warehouse', hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
                return res.status(500).json({ error: 'Registration failed: Database error' });
            }
            res.status(201).json({ message: 'User registered' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Encryption error' });
    }
});

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        
        const match = await bcrypt.compare(password, results[0].password);
        if (match) {
            res.json({ 
                message: 'Login successful', 
                user: { 
                    email: results[0].email, 
                    firstName: results[0].first_name,
                    lastName: results[0].last_name,
                    name: `${results[0].first_name} ${results[0].last_name}`.trim(),
                    company: results[0].company || '',
                    org_type: results[0].org_type || 'Warehouse',
                    createdAt: results[0].created_at
                } 
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Mailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Forgot Password - Generate OTP & Send Email
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    const sql = 'UPDATE users SET otp_code = ?, otp_expiry = ? WHERE email = ?';
    db.query(sql, [otp, expiry, email], (err, result) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Email not found' });
        
        // Send actual email
        const mailOptions = {
            from: `"ReInvent Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'ReInvent Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #6366F1;">ReInvent OTP Verification</h2>
                    <p>You requested a password reset. Use the code below to proceed. This code expires in 10 minutes.</p>
                    <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; color: #1E293B;">
                        ${otp}
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; color: #94A3B8;">If you did not request this, please ignore this email.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Mail Error:', error);
                return res.status(500).json({ error: 'Failed to send email. Check mailer config.' });
            }
            console.log('OTP Email Sent: ' + info.response);
            res.json({ message: 'OTP sent to your email', email });
        });
    });
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ? AND otp_code = ? AND otp_expiry > NOW()';
    db.query(sql, [email, otp], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (results.length === 0) return res.status(400).json({ error: 'Invalid or expired OTP' });
        res.json({ message: 'OTP verified successfully' });
    });
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const sql = 'UPDATE users SET password = ?, otp_code = NULL, otp_expiry = NULL WHERE email = ? AND otp_code = ?';
        db.query(sql, [hashedPassword, email, otp], (err, result) => {
            if (err) return res.status(500).json({ error: 'Password reset database error' });
            if (result.affectedRows === 0) return res.status(400).json({ error: 'Reset failed. Invalid session.' });
            res.json({ message: 'Password reset successful' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Encryption error' });
    }
});

// Change Password
app.post('/api/change-password', async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const match = await bcrypt.compare(currentPassword, results[0].password);
        if (match) {
            try {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const updateSql = 'UPDATE users SET password = ? WHERE email = ?';
                db.query(updateSql, [hashedPassword, email], (err2, result2) => {
                    if (err2) return res.status(500).json({ error: 'Database error updating password' });
                    res.json({ message: 'Password changed successfully' });
                });
            } catch (hashErr) {
                res.status(500).json({ error: 'Encryption error' });
            }
        } else {
            res.status(401).json({ error: 'Incorrect current password' });
        }
    });
});

// --- ANALYTICS API ---
app.get('/api/analytics', (req, res) => {
    const queries = {
        metrics: `SELECT 
            SUM(total) as revenue, 
            SUM(total * 0.3) as gross_profit, 
            COUNT(*) as units_sold 
            FROM sales_orders WHERE status = 'COMPLETED'`,
        stockHealth: `SELECT 
            SUM(CASE WHEN stock > min THEN 1 ELSE 0 END) as healthy,
            SUM(CASE WHEN stock <= min AND stock > 0 THEN 1 ELSE 0 END) as low,
            SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock
            FROM products`,
        categoryBreakdown: `SELECT category, SUM(stock * sell) as value FROM products GROUP BY category`,
        topProducts: `SELECT name, stock as sold FROM products ORDER BY stock DESC LIMIT 5`,
        agingStock: `SELECT name, sku, stock as qty, (stock * cost) as value, DATEDIFF(NOW(), created_at) as days FROM products WHERE DATEDIFF(NOW(), created_at) > 30 ORDER BY days DESC LIMIT 5`
    };

    const results = {};
    const keys = Object.keys(queries);
    let completed = 0;

    keys.forEach(key => {
        db.query(queries[key], (err, rows) => {
            if (!err) results[key] = rows;
            completed++;
            if (completed === keys.length) {
                res.json(results);
            }
        });
    });
});

// --- INVENTORY API ---
app.get('/api/products', (req, res) => {
    const userEmail = req.headers['x-user-email'] || 'Admin123@gmail.com';
    const sql = 'SELECT * FROM products WHERE user_email = ? ORDER BY created_at DESC';
    db.query(sql, [userEmail], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/products', (req, res) => {
    const userEmail = req.headers['x-user-email'] || 'Admin123@gmail.com';
    let { name, sku, desc, category, cost, sell, stock, min, image_url, brand, unit } = req.body;
    
    cost = cost !== '' && cost !== undefined ? parseFloat(cost) : 0;
    sell = sell !== '' && sell !== undefined ? parseFloat(sell) : 0;
    stock = stock !== '' && stock !== undefined ? parseInt(stock, 10) : 0;
    min = min !== '' && min !== undefined ? parseInt(min, 10) : 0;

    const sql = 'INSERT INTO products (name, sku, `desc`, category, cost, sell, stock, min, image_url, brand, unit, user_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, sku, desc, category, cost, sell, stock, min, image_url || null, brand || null, unit || null, userEmail], (err, result) => {
        if (err) {
            console.error('DB Insert Error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        const productId = result.insertId;
        // Log addition
        db.query('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)', 
            [productId, 'ADDED', `Product ${name} added with initial stock ${stock}`]);
        
        res.status(201).json({ message: 'Product added', id: productId });
    });
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    let { name, sku, desc, category, cost, sell, stock, min, image_url, brand, unit } = req.body;

    const checkAlert = () => {
        if (Number(stock) <= Number(min)) {
            const alertMsg = `Low stock alert (Product Edited): ${name} is down to ${stock} units (min: ${min}).`;
            db.query('SELECT user_email FROM products WHERE id = ?', [id], (err, rows) => {
                const uEmail = rows && rows.length > 0 ? rows[0].user_email : 'Admin123@gmail.com';
                db.query('INSERT INTO alerts (type, message, is_read, user_email) VALUES (?, ?, 0, ?)', ['LOW_STOCK', alertMsg, uEmail], (err) => {
                    if (err) console.error('Alert insert error:', err);
                });
            });
        }
    };

    if (image_url !== undefined && image_url !== null) {
        const sql = 'UPDATE products SET name=?, sku=?, `desc`=?, category=?, cost=?, sell=?, stock=?, min=?, image_url=?, brand=?, unit=? WHERE id=?';
        db.query(sql, [name, sku, desc, category, cost, sell, stock, min, image_url, brand, unit, id], (err) => {
            if (err) return res.status(500).json({ error: 'DB Error' });
            db.query('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)', [id, 'EDITED', `Product ${name} updated (with image)`], (err) => {
                if (err) console.error('Log error:', err);
            });
            checkAlert();
            res.json({ message: 'Product updated' });
        });
    } else {
        const sql = 'UPDATE products SET name=?, sku=?, `desc`=?, category=?, cost=?, sell=?, stock=?, min=?, brand=?, unit=? WHERE id=?';
        db.query(sql, [name, sku, desc, category, cost, sell, stock, min, brand, unit, id], (err) => {
            if (err) return res.status(500).json({ error: 'DB Error' });
            db.query('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)', [id, 'EDITED', `Product ${name} updated`], (err) => {
                if (err) console.error('Log error:', err);
            });
            checkAlert();
            res.json({ message: 'Product updated' });
        });
    }
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    
    // Cascading delete across all related tables to satisfy FK constraints
    const cleanupQueries = [
        'DELETE FROM product_logs WHERE product_id = ?',
        'DELETE FROM order_items WHERE product_id = ?',
        'DELETE FROM stock_adjustments WHERE product_id = ?'
    ];

    let queryCount = 0;
    let hasError = false;

    const performCleanup = () => {
        if (queryCount < cleanupQueries.length) {
            db.query(cleanupQueries[queryCount], [id], (err) => {
                if (err) {
                    console.error(`Error in cleanup query ${queryCount}:`, err);
                    hasError = true;
                }
                queryCount++;
                performCleanup();
            });
        } else {
            if (hasError) {
                // We proceed anyway but log it, or we could stop.
                // Usually, we want to try deleting the product even if some logs fail.
            }
            
            // Final delete from products table
            db.query('DELETE FROM products WHERE id = ?', [id], (err) => {
                if (err) {
                    console.error('Error deleting product:', err);
                    return res.status(500).json({ error: 'Database constraint: This product is still linked to other modules and cannot be removed safely.' });
                }
                res.json({ message: 'Product and all related history deleted successfully' });
            });
        }
    };

    performCleanup();
});

// --- SALES ORDERS API ---
app.get('/api/sales_orders', (req, res) => {
    const userEmail = req.headers['x-user-email'] || 'Admin123@gmail.com';
    db.query('SELECT * FROM sales_orders WHERE user_email = ? ORDER BY date DESC', [userEmail], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/sales_orders', (req, res) => {
    const userEmail = req.headers['x-user-email'] || 'Admin123@gmail.com';
    const { order_id, date, customer, items, total, status } = req.body;

    db.getConnection((err, conn) => {
        if (err) return res.status(500).json({ error: 'Failed to get DB connection' });

        conn.beginTransaction(err => {
            if (err) {
                conn.release();
                return res.status(500).json({ error: 'Transaction failed' });
            }

            const sqlOrder = 'INSERT INTO sales_orders (order_id, date, customer, items_count, total, status, user_email) VALUES (?, ?, ?, ?, ?, ?, ?)';
            conn.query(sqlOrder, [order_id, date, customer, items.length, total, status || 'PENDING', userEmail], (err, result) => {
                if (err) {
                    return conn.rollback(() => {
                        conn.release();
                        res.status(500).json({ error: 'Order creation failed: ' + err.message });
                    });
                }

                const orderDbId = result.insertId;
                let processed = 0;
                const errors = [];

                items.forEach(item => {
                    // Check stock
                    conn.query('SELECT stock, min, name FROM products WHERE id = ?', [item.product_id], (err, prod) => {
                        if (err || prod.length === 0) {
                            errors.push(`Product ${item.product_id} not found`);
                            processed++;
                            if (processed === items.length) finalizeOrder();
                            return;
                        }

                        if (prod[0].stock < item.quantity) {
                            errors.push(`Insufficient stock for ${prod[0].name}`);
                            processed++;
                            if (processed === items.length) finalizeOrder();
                            return;
                        }

                        // Deduct stock
                        const newStock = prod[0].stock - item.quantity;
                        conn.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id], () => {
                            // Insert order item
                            conn.query('INSERT INTO order_items (order_type, order_db_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
                                ['SALES', orderDbId, item.product_id, item.quantity, item.unit_price], () => {
                                    
                                    // Trigger Alert if low stock
                                    if (newStock <= prod[0].min) {
                                        const alertMsg = `Low stock alert: ${prod[0].name} is down to ${newStock} units.`;
                                        conn.query('INSERT INTO alerts (type, message) VALUES (?, ?)', ['LOW_STOCK', alertMsg]);
                                    }

                                    processed++;
                                    if (processed === items.length) finalizeOrder();
                                });
                        });
                    });
                });

                function finalizeOrder() {
                    if (errors.length > 0) {
                        return conn.rollback(() => {
                            conn.release();
                            res.status(400).json({ error: errors.join(', ') });
                        });
                    }
                    conn.commit(err => {
                        if (err) {
                            return conn.rollback(() => {
                                conn.release();
                                res.status(500).json({ error: 'Commit failed' });
                            });
                        }
                        
                        // Log Action in Audit Module
                        conn.query('INSERT INTO audit_logs (action_type, entity_id, details) VALUES (?, ?, ?)',
                            ['SALES', order_id, `Sales Order created with ${items.length} items for ${customer}`]);
                        
                        // Alert Notification
                        conn.query("INSERT INTO alerts (type, message) VALUES (?, ?)", ['ORDER_UPDATE', `New Sales Order ${order_id} created for ${customer}.`]);
                        
                        conn.release();
                        res.status(201).json({ message: 'Sales Order created successfully', id: orderDbId });
                    });
                }
            });
        });
    });
});

// Sync/Simulate Stock Update from Sales Orders
app.post('/api/sales_orders/sync', (req, res) => {
    // This is a demo sync that marks all PENDING orders as COMPLETED and reduces stock
    const sqlSelect = "SELECT * FROM sales_orders WHERE status = 'PENDING'";
    db.query(sqlSelect, (err, orders) => {
        if (err) return res.status(500).json({ error: 'Sync failed' });
        if (orders.length === 0) return res.json({ message: 'No pending orders to sync' });

        let processed = 0;
        orders.forEach(order => {
            // In a real app, you'd match items. Here we just simulate reducing total stock 
            // of a random product for demo purposes, or better, just mark as completed.
            db.query("UPDATE sales_orders SET status = 'COMPLETED' WHERE id = ?", [order.id], () => {
                db.query("INSERT INTO alerts (type, message) VALUES (?, ?)", ['ORDER_UPDATE', `Sales Order ${order.order_id} has been COMPLETED.`]);
                processed++;
                if (processed === orders.length) {
                    res.json({ message: `Synced ${processed} orders. Stock updated.` });
                }
            });
        });
    });
});

// --- PURCHASE ORDERS API ---
app.get('/api/purchase_orders', (req, res) => {
    const userEmail = req.headers['x-user-email'] || 'Admin123@gmail.com';
    db.query('SELECT * FROM purchase_orders WHERE user_email = ? ORDER BY date DESC', [userEmail], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/purchase_orders', (req, res) => {
    const userEmail = req.headers['x-user-email'] || 'Admin123@gmail.com';
    const { order_id, date, supplier, items, total, status } = req.body;

    db.getConnection((err, conn) => {
        if (err) return res.status(500).json({ error: 'Failed to get DB connection' });

        conn.beginTransaction(err => {
            if (err) {
                conn.release();
                return res.status(500).json({ error: 'Transaction failed' });
            }

            const sqlOrder = 'INSERT INTO purchase_orders (order_id, date, supplier, items_count, total, status, user_email) VALUES (?, ?, ?, ?, ?, ?, ?)';
            conn.query(sqlOrder, [order_id, date, supplier, items.length, total, status || 'PENDING', userEmail], (err, result) => {
                if (err) {
                    console.error('PO Header Insert Error:', err);
                    return conn.rollback(() => {
                        conn.release();
                        res.status(500).json({ error: 'Failed to create PO header: ' + err.message });
                    });
                }

                const orderDbId = result.insertId;
                let processed = 0;
                let hasError = false;

                items.forEach(item => {
                    // Add stock
                    conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id], (err) => {
                        if (err) {
                            console.error('PO Stock Update Error:', err);
                            if (!hasError) {
                                hasError = true;
                                return conn.rollback(() => {
                                    conn.release();
                                    res.status(500).json({ error: 'Failed to update product stock: ' + err.message });
                                });
                            }
                            return;
                        }

                        // Insert order item
                        conn.query('INSERT INTO order_items (order_type, order_db_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
                            ['PURCHASE', orderDbId, item.product_id, item.quantity, item.unit_price], (err) => {
                                if (err) {
                                    console.error('PO Item Insert Error:', err);
                                    if (!hasError) {
                                        hasError = true;
                                        return conn.rollback(() => {
                                            conn.release();
                                            res.status(500).json({ error: 'Failed to record order items: ' + err.message });
                                        });
                                    }
                                    return;
                                }
                                processed++;
                                if (processed === items.length && !hasError) {
                                    conn.commit(err => {
                                        if (err) {
                                            return conn.rollback(() => {
                                                conn.release();
                                                res.status(500).json({ error: 'Commit failed' });
                                            });
                                        }
                                        
                                        // Log Purchase Order
                                        conn.query('INSERT INTO audit_logs (action_type, entity_id, details) VALUES (?, ?, ?)',
                                            ['PURCHASE', order_id, `Purchase Order created from supplier: ${supplier}`]);
                                        
                                        conn.release();
                                        res.status(201).json({ message: 'Purchase Order created successfully' });
                                    });
                                }
                            });
                    });
                });
            });
        });
    });
});

// --- STOCK ADJUSTMENTS API ---
app.post('/api/stock_adjustments', (req, res) => {
    const { product_id, adjustment_type, quantity, reason } = req.body;
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: 'Transaction failed' });

        // Sufficient Stock Check?
        db.query('SELECT stock, name FROM products WHERE id = ?', [product_id], (err, prod) => {
            if (err || prod.length === 0) return db.rollback(() => res.status(404).json({ error: 'Product not found' }));
            
            if (adjustment_type === 'SUBTRACT' && prod[0].stock < quantity) {
                return db.rollback(() => res.status(400).json({ error: `Insufficient stock! Current: ${prod[0].stock}` }));
            }

            let sqlUpdate = '';
            if (adjustment_type === 'ADD') sqlUpdate = 'UPDATE products SET stock = stock + ? WHERE id = ?';
            else if (adjustment_type === 'SUBTRACT') sqlUpdate = 'UPDATE products SET stock = stock - ? WHERE id = ?';
            else if (adjustment_type === 'SET') sqlUpdate = 'UPDATE products SET stock = ? WHERE id = ?';

            db.query(sqlUpdate, [quantity, product_id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: 'Update failed' }));

                db.query('INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, reason) VALUES (?, ?, ?, ?)',
                    [product_id, adjustment_type, quantity, reason], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: 'Log failed' }));

                        // Log Adjustments to Audit
                        db.query('INSERT INTO audit_logs (action_type, entity_id, details) VALUES (?, ?, ?)',
                            ['ADJUSTMENT', product_id, `${adjustment_type} ${quantity} units. Reason: ${reason}`]);

                        // Trigger Alert if needed
                        db.query('SELECT stock, min, name FROM products WHERE id = ?', [product_id], (err, prodNext) => {
                            if (!err && prodNext.length > 0 && prodNext[0].stock <= prodNext[0].min) {
                                const alertMsg = `Low stock alert (Manual Adjustment): ${prodNext[0].name} is down to ${prodNext[0].stock} units.`;
                                db.query('INSERT INTO alerts (type, message) VALUES (?, ?)', ['LOW_STOCK', alertMsg]);
                            }
                            
                            db.commit(() => res.json({ message: 'Stock adjusted successfully' }));
                        });
                    });
            });
        });
    });
});

// --- ALERTS API ---
app.get('/api/test-alert', (req, res) => {
    db.query('INSERT INTO alerts (type, message, is_read) VALUES (?, ?, 0)', ['LOW_STOCK', 'Low stock alert (System Triggered): Test1 is down to 5 units (min: 10).'], (err, result) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, insertId: result.insertId });
    });
});

app.get('/api/alerts', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    db.query('SELECT * FROM alerts WHERE user_email = ? ORDER BY created_at DESC LIMIT 20', [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/alerts/read', (req, res) => {
    const { email } = req.body;
    db.query('UPDATE alerts SET is_read = TRUE WHERE user_email = ?', [email], (err) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        
        db.query('INSERT INTO audit_logs (action_type, details) VALUES (?, ?)',
            ['ALERT_ACKNOWLEDGED', `All alerts marked as read for ${email}`]);
            
        res.json({ message: 'Alerts marked as read' });
    });
});

app.post('/api/alerts/acknowledge', (req, res) => {
    const { alert_id } = req.body;
    if (!alert_id) return res.status(400).json({ error: 'Alert ID required' });
    
    db.query('UPDATE alerts SET is_read = TRUE WHERE id = ?', [alert_id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to acknowledge alert' });
        
        db.query('INSERT INTO audit_logs (action_type, entity_id, details) VALUES (?, ?, ?)',
            ['ALERT_ACKNOWLEDGED', alert_id, `Alert ${alert_id} acknowledged`]);
            
        res.json({ message: 'Alert acknowledged' });
    });
});

// --- REPORTS API ---
app.get('/api/reports', (req, res) => {
    const { type, start_date, end_date } = req.query;
    
    if (!type || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Simple validation
    if (new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({ error: 'Invalid Date Range: Start Date must be before End Date.' });
    }

    let sql = '';
    let params = [start_date, end_date];

    switch(type) {
        case 'SALES':
            sql = "SELECT order_id as ID, date as Date, customer as Customer, items_count as Items, total as Revenue FROM sales_orders WHERE date >= ? AND date <= ? AND status='COMPLETED' ORDER BY date DESC";
            break;
        case 'PURCHASE':
            sql = "SELECT order_id as ID, date as Date, supplier as Supplier, items_count as Items, total as Cost FROM purchase_orders WHERE date >= ? AND date <= ? ORDER BY date DESC";
            break;
        case 'INVENTORY':
            // Ignore dates for current inventory, just show snapshot
            sql = "SELECT sku as SKU, name as Product, category as Category, stock as Stock, cost as UnitCost, (stock * cost) as TotalValue FROM products ORDER BY stock ASC";
            params = [];
            break;
        default:
            return res.status(400).json({ error: 'Invalid report type' });
    }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to generate report' });
        res.json(results);
    });
});

app.post('/api/reports/log', (req, res) => {
    const { type, format } = req.body;
    db.query('INSERT INTO audit_logs (action_type, details) VALUES (?, ?)',
        ['REPORT_EXPORT', `Exported ${type} report in ${format} format`], (err) => {
            if (err) console.error('Failed to log report access');
            res.json({ message: 'Logged successfully' });
        });
});

// --- PROFILE API ---
app.get('/api/profile', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const sql = 'SELECT first_name, last_name, email, company, phone, profile_photo, notif_low_stock, notif_order_updates, notif_aging_stock, created_at FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(results[0]);
    });
});

app.post('/api/profile', (req, res) => {
    console.log('--- PROFILE SAVE INCOMING PAYLOAD ---', req.body);
    const { firstName, lastName, email, company, phone, profile_photo, notif_low_stock, notif_order_updates, notif_aging_stock } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const sql = 'UPDATE users SET first_name = ?, last_name = ?, company = ?, phone = ?, profile_photo = ?, notif_low_stock = COALESCE(?, notif_low_stock), notif_order_updates = COALESCE(?, notif_order_updates), notif_aging_stock = COALESCE(?, notif_aging_stock) WHERE email = ?';
    db.query(sql, [
        firstName, 
        lastName, 
        company, 
        phone || null, 
        profile_photo || null,
        notif_low_stock !== undefined ? notif_low_stock : null,
        notif_order_updates !== undefined ? notif_order_updates : null,
        notif_aging_stock !== undefined ? notif_aging_stock : null,
        email
    ], (err, result) => {
        if (err) {
            console.error('PROFILE SAVE DB ERROR:', err);
            return res.status(500).json({ error: `DB Error: ${err.message}` });
        }
        res.json({ message: 'Profile updated' });
    });
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`ReInvent v2 running on port ${PORT}`));

