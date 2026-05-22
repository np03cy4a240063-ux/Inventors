const express = require('express');
require('dotenv').config();
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Mailer Configuration (must be before any route that uses it) ──
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

app.use(cors({
    origin: function(origin, callback) {
        callback(null, true);
    },
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ── Session Middleware ──
app.use(session({
    secret: process.env.SESSION_SECRET || 'reinvent_secure_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,       // set true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000  // 24 hours
    }
}));

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

// Global In-Memory Map for temporary signups
const tempSignups = new Map();

// Send Signup OTP Endpoint
app.post('/api/send-signup-otp', async (req, res) => {
    const { firstName, lastName, email, phone, company, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

    // Check if email already exists in database
    const checkSql = 'SELECT 1 FROM users WHERE email = ?';
    db.query(checkSql, [email], async (err, results) => {
        if (err) {
            console.error('Database check error:', err);
            return res.status(500).json({ error: 'Database error check failed' });
        }
        if (results.length > 0) return res.status(400).json({ error: 'Email already exists' });

        try {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const hashedPassword = await bcrypt.hash(password, 10);
            const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

            tempSignups.set(email, {
                firstName,
                lastName,
                email,
                phone: phone || '',
                company: company || '',
                password: hashedPassword,
                otp,
                expiry
            });

            // Send actual email
            const mailOptions = {
                from: `"ReInvent Support" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'ReInvent Registration OTP',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #6366F1;">ReInvent Registration</h2>
                        <p>Welcome! Thank you for signing up for ReInvent. Use the code below to complete your registration. This code is valid for 10 minutes.</p>
                        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; color: #1E293B;">
                            ${otp}
                        </div>
                        <p style="margin-top: 20px; font-size: 12px; color: #94A3B8;">If you did not request this, please ignore this email.</p>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('CRITICAL - Mail Error:', error.message);
                    console.error('Full error:', error);
                    // Log OTP to console for debugging
                    console.log(`[DEV FALLBACK] OTP for ${email}: ${otp}`);
                    // Still allow signup to proceed with fallback
                    return res.status(500).json({ 
                        error: 'Failed to send OTP email. Please check your email configuration.',
                        fallback: `OTP: ${otp}` // Only for development
                    });
                }
                console.log('Signup OTP Email Sent Successfully to:', email);
                res.json({ message: 'OTP sent to your email' });
            });
        } catch (err) {
            console.error('Encryption error:', err);
            res.status(500).json({ error: 'Encryption error' });
        }
    });
});

// Verify Signup OTP Endpoint
app.post('/api/verify-signup-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Missing email or OTP' });

    const tempUser = tempSignups.get(email);
    if (!tempUser) return res.status(400).json({ error: 'No signup session found. Please request a new OTP.' });

    if (Date.now() > tempUser.expiry) {
        tempSignups.delete(email);
        return res.status(400).json({ error: 'OTP has expired. Please sign up again.' });
    }

    if (tempUser.otp !== otp) {
        return res.status(400).json({ error: 'Incorrect OTP.' });
    }

    // OTP is correct! Insert user into database
    const sql = 'INSERT INTO users (first_name, last_name, email, phone, company, password) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [tempUser.firstName, tempUser.lastName, tempUser.email, tempUser.phone, tempUser.company, tempUser.password], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
            return res.status(500).json({ error: 'Registration failed: Database error' });
        }
        
        // Remove from temporary signups
        tempSignups.delete(email);
        res.json({ message: 'Registration verified and completed successfully.' });
    });
});

// Resend Signup OTP Endpoint
app.post('/api/resend-signup-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const tempUser = tempSignups.get(email);
    if (!tempUser) return res.status(400).json({ error: 'No active signup session found' });

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    tempUser.otp = newOtp;
    tempUser.expiry = Date.now() + 10 * 60 * 1000;
    tempSignups.set(email, tempUser);

    const mailOptions = {
        from: `"ReInvent Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'ReInvent Registration OTP (Resent)',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #6366F1;">ReInvent Registration</h2>
                <p>Use the resent code below to complete your registration. This code is valid for 10 minutes.</p>
                <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; color: #1E293B;">
                    ${newOtp}
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #94A3B8;">If you did not request this, please ignore this email.</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('CRITICAL - Mail Resend Error:', error.message);
            console.log(`[DEV FALLBACK] Resent OTP for ${email}: ${newOtp}`);
            return res.status(500).json({ 
                error: 'Failed to send email. Please check your email configuration.',
                fallback: `OTP: ${newOtp}` // Only for development
            });
        }
        console.log('Resent OTP Email Sent Successfully to:', email);
        res.json({ message: 'OTP resent successfully' });
    });
});

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        
        const match = await bcrypt.compare(password, results[0].password);
        if (match) {
            // Establish server-side session
            req.session.userId = results[0].id;
            req.session.userEmail = results[0].email;

            res.json({ 
                message: 'Login successful', 
                user: { 
                    email: results[0].email, 
                    firstName: results[0].first_name,
                    lastName: results[0].last_name,
                    name: `${results[0].first_name} ${results[0].last_name}`.trim(),
                    company: results[0].company || '',
                    createdAt: results[0].created_at
                } 
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Check Auth Endpoint (used by auth_check.js on every protected page)
app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.userId) {
        const sql = 'SELECT email, first_name, last_name, company, created_at FROM users WHERE id = ?';
        db.query(sql, [req.session.userId], (err, results) => {
            if (err || results.length === 0) {
                req.session.destroy(() => {});
                return res.json({ authenticated: false });
            }
            const u = results[0];
            return res.json({
                authenticated: true,
                user: {
                    email: u.email,
                    firstName: u.first_name,
                    lastName: u.last_name,
                    name: `${u.first_name} ${u.last_name}`.trim(),
                    company: u.company || '',
                    createdAt: u.created_at
                }
            });
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Logout Endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

// ── Auth Guard Middleware (protects all /api routes below this line) ──
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

// Forgot Password - Generate OTP & Send Email
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    const sql = 'UPDATE users SET otp_code = ?, otp_expiry = ? WHERE email = ?';
    db.query(sql, [otp, expiry, email], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'DB Error' });
        }
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
                console.error('CRITICAL - Mail Error:', error.message);
                console.log(`[DEV FALLBACK] Password reset OTP for ${email}: ${otp}`);
                return res.status(500).json({ 
                    error: 'Failed to send email. Please check your email configuration.',
                    fallback: `OTP: ${otp}` // Only for development
                });
            }
            console.log('Password Reset OTP Email Sent Successfully to:', email);
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
app.post('/api/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [req.session.userId], async (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const match = await bcrypt.compare(currentPassword, results[0].password);
        if (match) {
            try {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
                db.query(updateSql, [hashedPassword, req.session.userId], (err2) => {
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
app.get('/api/analytics', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const uid = db.escape(userId);

    const queries = {
        // Top metrics: revenue, gross profit, units sold from completed sales
        metrics: `SELECT 
            COALESCE(SUM(total), 0) as revenue, 
            COALESCE(SUM(total * 0.3), 0) as gross_profit, 
            COALESCE(COUNT(*), 0) as units_sold 
            FROM sales_orders WHERE status = 'COMPLETED' AND user_id = ${uid}`,

        // Stock health counts
        stockHealth: `SELECT 
            COALESCE(SUM(CASE WHEN stock > min THEN 1 ELSE 0 END), 0) as healthy,
            COALESCE(SUM(CASE WHEN stock <= min AND stock > 0 THEN 1 ELSE 0 END), 0) as low,
            COALESCE(SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END), 0) as out_of_stock,
            COALESCE(COUNT(*), 0) as total_products
            FROM products WHERE user_id = ${uid}`,

        // Category value breakdown
        categoryBreakdown: `SELECT 
            COALESCE(category, 'Uncategorized') as category, 
            COALESCE(SUM(stock * sell), 0) as value 
            FROM products WHERE user_id = ${uid} GROUP BY category ORDER BY value DESC`,

        // Top products by stock level
        topProducts: `SELECT name, stock as sold 
            FROM products WHERE user_id = ${uid} ORDER BY stock DESC LIMIT 5`,

        // Aging stock items > 30 days
        agingStock: `SELECT name, sku, stock as qty, (stock * cost) as value, 
            DATEDIFF(NOW(), created_at) as days 
            FROM products 
            WHERE user_id = ${uid} AND DATEDIFF(NOW(), created_at) > 30 
            ORDER BY days DESC LIMIT 10`,

        // Aging bucket counts (all products)
        agingBuckets: `SELECT
            COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), created_at) < 30 THEN 1 ELSE 0 END), 0) as under30,
            COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 30 AND 60 THEN 1 ELSE 0 END), 0) as d30_60,
            COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 61 AND 90 THEN 1 ELSE 0 END), 0) as d60_90,
            COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), created_at) > 90 THEN 1 ELSE 0 END), 0) as over90
            FROM products WHERE user_id = ${uid}`,

        // Dead stock: products with stock > 0 but no sales in last 90 days
        deadStock: `SELECT 
            COALESCE(SUM(p.stock * p.cost), 0) as dead_value,
            COALESCE(COUNT(*), 0) as dead_count
            FROM products p
            WHERE p.user_id = ${uid}
              AND p.stock > 0
              AND p.id NOT IN (
                SELECT DISTINCT oi.product_id 
                FROM order_items oi
                JOIN sales_orders so ON oi.order_db_id = so.id AND oi.order_type = 'SALES'
                WHERE so.user_id = ${uid} AND so.date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
              )`,

        // Monthly revenue + profit for last 6 months (from completed sales)
        monthlyRevenue: `SELECT 
            DATE_FORMAT(date, '%b') as month,
            YEAR(date) as yr,
            MONTH(date) as mo,
            COALESCE(SUM(total), 0) as revenue,
            COALESCE(SUM(total * 0.3), 0) as profit
            FROM sales_orders 
            WHERE user_id = ${uid}
              AND status = 'COMPLETED'
              AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY YEAR(date), MONTH(date), DATE_FORMAT(date, '%b')
            ORDER BY yr ASC, mo ASC`,

        // Monthly stock-in (purchase orders) for last 6 months
        monthlyStockIn: `SELECT 
            DATE_FORMAT(date, '%b') as month,
            YEAR(date) as yr,
            MONTH(date) as mo,
            COALESCE(SUM(items_count), 0) as qty_in
            FROM purchase_orders 
            WHERE user_id = ${uid}
              AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY YEAR(date), MONTH(date), DATE_FORMAT(date, '%b')
            ORDER BY yr ASC, mo ASC`,

        // Monthly stock-out (completed sales orders) for last 6 months
        monthlyStockOut: `SELECT 
            DATE_FORMAT(date, '%b') as month,
            YEAR(date) as yr,
            MONTH(date) as mo,
            COALESCE(SUM(items_count), 0) as qty_out
            FROM sales_orders 
            WHERE user_id = ${uid}
              AND status = 'COMPLETED'
              AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY YEAR(date), MONTH(date), DATE_FORMAT(date, '%b')
            ORDER BY yr ASC, mo ASC`,

        // Inventory turnover: COGS / avg inventory value
        // COGS approximated as sum of (qty_sold * cost) from completed sales items
        turnover: `SELECT
            COALESCE(
                (SELECT SUM(oi.quantity * oi.unit_price * 0.6)
                 FROM order_items oi
                 JOIN sales_orders so ON oi.order_db_id = so.id AND oi.order_type = 'SALES'
                 WHERE so.user_id = ${uid} AND so.status = 'COMPLETED'),
                0
            ) as cogs,
            COALESCE(
                (SELECT SUM(stock * cost) FROM products WHERE user_id = ${uid}),
                1
            ) as current_inventory_value`
    };

    const results = {};
    const keys = Object.keys(queries);
    let completed = 0;

    keys.forEach(key => {
        db.query(queries[key], (err, rows) => {
            if (err) {
                console.error(`Analytics query error [${key}]:`, err.message);
                results[key] = [];
            } else {
                results[key] = rows;
            }
            completed++;
            if (completed === keys.length) {
                res.json(results);
            }
        });
    });
});

// --- INVENTORY API ---
app.get('/api/products', requireAuth, (req, res) => {
    const sql = 'SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC';
    db.query(sql, [req.session.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/products', requireAuth, (req, res) => {
    let { name, sku, desc, category, cost, sell, stock, min, image_url, brand, unit } = req.body;
    
    cost = cost !== '' && cost !== undefined ? parseFloat(cost) : 0;
    sell = sell !== '' && sell !== undefined ? parseFloat(sell) : 0;
    stock = stock !== '' && stock !== undefined ? parseInt(stock, 10) : 0;
    min = min !== '' && min !== undefined ? parseInt(min, 10) : 0;

    const sql = 'INSERT INTO products (user_id, name, sku, `desc`, category, cost, sell, stock, min, image_url, brand, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [req.session.userId, name, sku, desc, category, cost, sell, stock, min, image_url || null, brand || null, unit || null], (err, result) => {
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

app.put('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    let { name, sku, desc, category, cost, sell, stock, min, image_url, brand, unit } = req.body;

    if (image_url !== undefined && image_url !== null) {
        const sql = 'UPDATE products SET name=?, sku=?, `desc`=?, category=?, cost=?, sell=?, stock=?, min=?, image_url=?, brand=?, unit=? WHERE id=? AND user_id=?';
        db.query(sql, [name, sku, desc, category, cost, sell, stock, min, image_url, brand, unit, id, req.session.userId], (err) => {
            if (err) {
                console.error('Update Error:', err);
                return res.status(500).json({ error: 'DB Error while updating' });
            }
            db.query('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)', 
                [id, 'EDITED', `Product ${name} updated (with new image)`]);
            res.json({ message: 'Product updated' });
        });
    } else {
        const sql = 'UPDATE products SET name=?, sku=?, `desc`=?, category=?, cost=?, sell=?, stock=?, min=?, brand=?, unit=? WHERE id=? AND user_id=?';
        db.query(sql, [name, sku, desc, category, cost, sell, stock, min, brand, unit, id, req.session.userId], (err) => {
            if (err) {
                console.error('Update Error:', err);
                return res.status(500).json({ error: 'DB Error while updating' });
            }
            db.query('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)', 
                [id, 'EDITED', `Product ${name} updated`]);
            res.json({ message: 'Product updated' });
        });
    }
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // Verify ownership before deleting
    db.query('SELECT id FROM products WHERE id = ? AND user_id = ?', [id, req.session.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (rows.length === 0) return res.status(403).json({ error: 'Product not found or access denied.' });

        const cleanupQueries = [
            'DELETE FROM product_logs WHERE product_id = ?',
            'DELETE FROM order_items WHERE product_id = ?',
            'DELETE FROM stock_adjustments WHERE product_id = ?'
        ];

        let queryCount = 0;

        const performCleanup = () => {
            if (queryCount < cleanupQueries.length) {
                db.query(cleanupQueries[queryCount], [id], () => {
                    queryCount++;
                    performCleanup();
                });
            } else {
                db.query('DELETE FROM products WHERE id = ? AND user_id = ?', [id, req.session.userId], (err) => {
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
});

// --- SALES ORDERS API ---
app.get('/api/sales_orders', requireAuth, (req, res) => {
    db.query('SELECT * FROM sales_orders WHERE user_id = ? ORDER BY date DESC', [req.session.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/sales_orders', requireAuth, (req, res) => {
    const { order_id, date, customer, items, total, status } = req.body;
    const userId = req.session.userId;

    db.getConnection((err, conn) => {
        if (err) return res.status(500).json({ error: 'Failed to get DB connection' });

        conn.beginTransaction(err => {
            if (err) {
                conn.release();
                return res.status(500).json({ error: 'Transaction failed' });
            }

            const sqlOrder = 'INSERT INTO sales_orders (user_id, order_id, date, customer, items_count, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
            conn.query(sqlOrder, [userId, order_id, date, customer, items.length, total, status || 'PENDING'], (err, result) => {
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
                    // Check stock — only allow products owned by this user
                    conn.query('SELECT stock, min, name FROM products WHERE id = ? AND user_id = ?', [item.product_id, userId], (err, prod) => {
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
                                        conn.query('INSERT INTO alerts (user_id, type, message) VALUES (?, ?, ?)', [userId, 'LOW_STOCK', alertMsg]);
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
                        
                        conn.release();
                        res.status(201).json({ message: 'Sales Order created successfully', id: orderDbId });
                    });
                }
            });
        });
    });
});

// Sync/Simulate Stock Update from Sales Orders
app.post('/api/sales_orders/sync', requireAuth, (req, res) => {
    const sqlSelect = "SELECT * FROM sales_orders WHERE status = 'PENDING' AND user_id = ?";
    db.query(sqlSelect, [req.session.userId], (err, orders) => {
        if (err) return res.status(500).json({ error: 'Sync failed' });
        if (orders.length === 0) return res.json({ message: 'No pending orders to sync' });

        let processed = 0;
        orders.forEach(order => {
            // In a real app, you'd match items. Here we just simulate reducing total stock 
            // of a random product for demo purposes, or better, just mark as completed.
            db.query("UPDATE sales_orders SET status = 'COMPLETED' WHERE id = ?", [order.id], () => {
                processed++;
                if (processed === orders.length) {
                    res.json({ message: `Synced ${processed} orders. Stock updated.` });
                }
            });
        });
    });
});

// --- PURCHASE ORDERS API ---
app.get('/api/purchase_orders', requireAuth, (req, res) => {
    db.query('SELECT * FROM purchase_orders WHERE user_id = ? ORDER BY date DESC', [req.session.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/purchase_orders', requireAuth, (req, res) => {
    const { order_id, date, supplier, items, total, status } = req.body;
    const userId = req.session.userId;

    db.getConnection((err, conn) => {
        if (err) return res.status(500).json({ error: 'Failed to get DB connection' });

        conn.beginTransaction(err => {
            if (err) {
                conn.release();
                return res.status(500).json({ error: 'Transaction failed' });
            }

            const sqlOrder = 'INSERT INTO purchase_orders (user_id, order_id, date, supplier, items_count, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
            conn.query(sqlOrder, [userId, order_id, date, supplier, items.length, total, status || 'PENDING'], (err, result) => {
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
                    // Add stock — only for products owned by this user
                    conn.query('UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?', [item.quantity, item.product_id, userId], (err) => {
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
app.post('/api/stock_adjustments', requireAuth, (req, res) => {
    const { product_id, adjustment_type, quantity, reason } = req.body;
    const userId = req.session.userId;
    
    db.getConnection((err, conn) => {
        if (err) return res.status(500).json({ error: 'Failed to get DB connection' });

        conn.beginTransaction(err => {
            if (err) {
                conn.release();
                return res.status(500).json({ error: 'Transaction failed' });
            }

            // Sufficient Stock Check? Also verify ownership
            conn.query('SELECT stock, name FROM products WHERE id = ? AND user_id = ?', [product_id, userId], (err, prod) => {
                if (err || prod.length === 0) {
                    return conn.rollback(() => {
                        conn.release();
                        res.status(404).json({ error: 'Product not found or access denied' });
                    });
                }
                
                if (adjustment_type === 'SUBTRACT' && prod[0].stock < quantity) {
                    return conn.rollback(() => {
                        conn.release();
                        res.status(400).json({ error: `Insufficient stock! Current: ${prod[0].stock}` });
                    });
                }

                let sqlUpdate = '';
                if (adjustment_type === 'ADD') sqlUpdate = 'UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?';
                else if (adjustment_type === 'SUBTRACT') sqlUpdate = 'UPDATE products SET stock = stock - ? WHERE id = ? AND user_id = ?';
                else if (adjustment_type === 'SET') sqlUpdate = 'UPDATE products SET stock = ? WHERE id = ? AND user_id = ?';

                conn.query(sqlUpdate, [quantity, product_id, userId], (err) => {
                    if (err) {
                        return conn.rollback(() => {
                            conn.release();
                            res.status(500).json({ error: 'Update failed' });
                        });
                    }

                    conn.query('INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, reason) VALUES (?, ?, ?, ?)',
                        [product_id, adjustment_type, quantity, reason], (err) => {
                            if (err) {
                                return conn.rollback(() => {
                                    conn.release();
                                    res.status(500).json({ error: 'Log failed' });
                                });
                            }

                            // Log Adjustments to Audit
                            conn.query('INSERT INTO audit_logs (action_type, entity_id, details) VALUES (?, ?, ?)',
                                ['ADJUSTMENT', product_id, `${adjustment_type} ${quantity} units. Reason: ${reason}`]);

                            // Trigger Alert if needed
                            conn.query('SELECT stock, min, name FROM products WHERE id = ? AND user_id = ?', [product_id, userId], (err, prodNext) => {
                                if (!err && prodNext.length > 0 && prodNext[0].stock <= prodNext[0].min) {
                                    const alertMsg = `Low stock alert (Manual Adjustment): ${prodNext[0].name} is down to ${prodNext[0].stock} units.`;
                                    conn.query('INSERT INTO alerts (user_id, type, message) VALUES (?, ?, ?)', [userId, 'LOW_STOCK', alertMsg]);
                                }
                                
                                conn.commit(err => {
                                    if (err) {
                                        return conn.rollback(() => {
                                            conn.release();
                                            res.status(500).json({ error: 'Commit failed' });
                                        });
                                    }
                                    conn.release();
                                    res.json({ message: 'Stock adjusted successfully' });
                                });
                            });
                        });
                });
            });
        });
    });
});

// --- ALERTS API ---
app.get('/api/alerts', requireAuth, (req, res) => {
    db.query('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.session.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/alerts/read', requireAuth, (req, res) => {
    db.query('UPDATE alerts SET is_read = TRUE WHERE user_id = ?', [req.session.userId], (err) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        
        db.query('INSERT INTO audit_logs (action_type, details) VALUES (?, ?)',
            ['ALERT_ACKNOWLEDGED', 'All alerts marked as read']);
            
        res.json({ message: 'Alerts marked as read' });
    });
});

app.post('/api/alerts/acknowledge', requireAuth, (req, res) => {
    const { alert_id } = req.body;
    if (!alert_id) return res.status(400).json({ error: 'Alert ID required' });
    
    db.query('UPDATE alerts SET is_read = TRUE WHERE id = ? AND user_id = ?', [alert_id, req.session.userId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to acknowledge alert' });
        
        db.query('INSERT INTO audit_logs (action_type, entity_id, details) VALUES (?, ?, ?)',
            ['ALERT_ACKNOWLEDGED', alert_id, `Alert ${alert_id} acknowledged`]);
            
        res.json({ message: 'Alert acknowledged' });
    });
});

// --- REPORTS API ---
app.get('/api/reports', requireAuth, (req, res) => {
    const { type, start_date, end_date } = req.query;
    const userId = req.session.userId;
    
    if (!type || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    if (new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({ error: 'Invalid Date Range: Start Date must be before End Date.' });
    }

    let sql = '';
    let params = [];

    switch(type) {
        case 'SALES':
            sql = "SELECT order_id as ID, date as Date, customer as Customer, items_count as Items, total as Revenue FROM sales_orders WHERE date >= ? AND date <= ? AND status='COMPLETED' AND user_id = ? ORDER BY date DESC";
            params = [start_date, end_date, userId];
            break;
        case 'PURCHASE':
            sql = "SELECT order_id as ID, date as Date, supplier as Supplier, items_count as Items, total as Cost FROM purchase_orders WHERE date >= ? AND date <= ? AND user_id = ? ORDER BY date DESC";
            params = [start_date, end_date, userId];
            break;
        case 'INVENTORY':
            sql = "SELECT sku as SKU, name as Product, category as Category, stock as Stock, cost as UnitCost, (stock * cost) as TotalValue FROM products WHERE user_id = ? ORDER BY stock ASC";
            params = [userId];
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
app.get('/api/profile', requireAuth, (req, res) => {
    const sql = 'SELECT first_name, last_name, email, company, phone, created_at FROM users WHERE id = ?';
    db.query(sql, [req.session.userId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(results[0]);
    });
});

app.post('/api/profile', requireAuth, (req, res) => {
    const { firstName, lastName, company, phone } = req.body;

    const sql = 'UPDATE users SET first_name = ?, last_name = ?, company = ?, phone = ? WHERE id = ?';
    db.query(sql, [firstName, lastName, company, phone || null, req.session.userId], (err, result) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json({ message: 'Profile updated' });
    });
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`ReInvent v2 running on port ${PORT}`));

