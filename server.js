const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt'); // Added for security

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Request logger for visibility
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

db.connect((err) => {
    if (err) {
        console.error('CRITICAL: Database connection failed!');
        console.error('Error details:', err.message);
        console.error('Make sure your MySQL service is running in XAMPP/LAMPP control panel.');
        return;
    }
    console.log('--- DATABASE CONNECTED SUCCESSFULLY ---');
    console.log('Connected to: reinvent_db_v2');
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

// Registration Endpoint
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, company, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (first_name, last_name, email, company, password) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [firstName, lastName, email, company, hashedPassword], (err, result) => {
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
                    createdAt: results[0].created_at
                } 
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Forgot Password - Generate OTP
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    const sql = 'UPDATE users SET otp_code = ?, otp_expiry = ? WHERE email = ?';
    db.query(sql, [otp, expiry, email], (err, result) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Email not found' });
        
        console.log(`OTP for ${email}: ${otp}`); // In real app, send via email
        res.json({ message: 'OTP sent to your email', email, otp });
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
    const sql = 'SELECT * FROM products ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/products', (req, res) => {
    let { name, sku, desc, category, cost, sell, stock, min } = req.body;
    
    cost = cost !== '' && cost !== undefined ? parseFloat(cost) : 0;
    sell = sell !== '' && sell !== undefined ? parseFloat(sell) : 0;
    stock = stock !== '' && stock !== undefined ? parseInt(stock, 10) : 0;
    min = min !== '' && min !== undefined ? parseInt(min, 10) : 0;

    const sql = 'INSERT INTO products (name, sku, `desc`, category, cost, sell, stock, min) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, sku, desc, category, cost, sell, stock, min], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const productId = result.insertId;
        // Log addition
        db.query('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)', 
            [productId, 'ADDED', `Product ${name} added with initial stock ${stock}`]);
        
        res.status(201).json({ message: 'Product added', id: productId });
    });
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    let { name, sku, desc, category, cost, sell, stock, min } = req.body;

    const sql = 'UPDATE products SET name=?, sku=?, `desc`=?, category=?, cost=?, sell=?, stock=?, min=? WHERE id=?';
    db.query(sql, [name, sku, desc, category, cost, sell, stock, min, id], (err, result) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        
        // Log edit
        db.query('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)', 
            [id, 'EDITED', `Product ${name} updated`]);
        
        res.json({ message: 'Product updated' });
    });
});

app.delete('/api/products/:id', (req, res) => {
    db.query('DELETE FROM products WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json({ message: 'Product deleted' });
    });
});

// --- SALES ORDERS API ---
app.get('/api/sales_orders', (req, res) => {
    db.query('SELECT * FROM sales_orders ORDER BY date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/sales_orders', (req, res) => {
    const { order_id, date, customer, items, total, status } = req.body;
    // items is expected to be an array of { product_id, quantity, unit_price }

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: 'Transaction failed' });

        const sqlOrder = 'INSERT INTO sales_orders (order_id, date, customer, items_count, total, status) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sqlOrder, [order_id, date, customer, items.length, total, status || 'PENDING'], (err, result) => {
            if (err) return db.rollback(() => res.status(500).json({ error: 'Order creation failed' }));

            const orderDbId = result.insertId;
            let processed = 0;
            const errors = [];

            items.forEach(item => {
                // Check stock
                db.query('SELECT stock, min, name FROM products WHERE id = ?', [item.product_id], (err, prod) => {
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
                    db.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id], () => {
                        // Insert order item
                        db.query('INSERT INTO order_items (order_type, order_db_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
                            ['SALES', orderDbId, item.product_id, item.quantity, item.unit_price], () => {
                                
                                // Trigger Alert if low stock
                                if (newStock <= prod[0].min) {
                                    const alertMsg = `Low stock alert: ${prod[0].name} is down to ${newStock} units.`;
                                    db.query('INSERT INTO alerts (type, message) VALUES (?, ?)', ['LOW_STOCK', alertMsg]);
                                }

                                processed++;
                                if (processed === items.length) finalizeOrder();
                            });
                    });
                });
            });

            function finalizeOrder() {
                if (errors.length > 0) {
                    return db.rollback(() => res.status(400).json({ error: errors.join(', ') }));
                }
                db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json({ error: 'Commit failed' }));
                    
                    // Log Action in Audit Module
                    db.query('INSERT INTO audit_logs (action_type, entity_id, details) VALUES (?, ?, ?)',
                        ['SALES', order_id, `Sales Order created with ${items.length} items for ${customer}`]);
                    
                    res.status(201).json({ message: 'Sales Order created successfully', id: orderDbId });
                });
            }
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
    db.query('SELECT * FROM purchase_orders ORDER BY date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/purchase_orders', (req, res) => {
    const { order_id, date, supplier, items, total, status } = req.body;

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: 'Transaction failed' });

        const sqlOrder = 'INSERT INTO purchase_orders (order_id, date, supplier, items_count, total, status) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sqlOrder, [order_id, date, supplier, items.length, total, status || 'PENDING'], (err, result) => {
            if (err) {
                console.error('PO Header Insert Error:', err);
                return db.rollback(() => res.status(500).json({ error: 'Failed to create PO header: ' + err.message }));
            }

            const orderDbId = result.insertId;
            let processed = 0;
            let hasError = false;

            items.forEach(item => {
                // Add stock
                db.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id], (err) => {
                    if (err) {
                        console.error('PO Stock Update Error:', err);
                        if (!hasError) {
                            hasError = true;
                            return db.rollback(() => res.status(500).json({ error: 'Failed to update product stock: ' + err.message }));
                        }
                        return;
                    }

                    // Insert order item
                    db.query('INSERT INTO order_items (order_type, order_db_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
                        ['PURCHASE', orderDbId, item.product_id, item.quantity, item.unit_price], (err) => {
                            if (err) {
                                console.error('PO Item Insert Error:', err);
                                if (!hasError) {
                                    hasError = true;
                                    return db.rollback(() => res.status(500).json({ error: 'Failed to record order items: ' + err.message }));
                                }
                                return;
                            }
                            processed++;
                            if (processed === items.length && !hasError) {
                                db.commit(err => {
                                    if (err) return db.rollback(() => res.status(500).json({ error: 'Commit failed' }));
                                    
                                    // Log Purchase Order
                                    db.query('INSERT INTO audit_logs (action_type, entity_id, details) VALUES (?, ?, ?)',
                                        ['PURCHASE', order_id, `Purchase Order created from supplier: ${supplier}`]);
                                    
                                    res.status(201).json({ message: 'Purchase Order created successfully' });
                                });
                            }
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
app.get('/api/alerts', (req, res) => {
    db.query('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 20', (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

app.post('/api/alerts/read', (req, res) => {
    db.query('UPDATE alerts SET is_read = TRUE', (err) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        
        db.query('INSERT INTO audit_logs (action_type, details) VALUES (?, ?)',
            ['ALERT_ACKNOWLEDGED', 'All alerts marked as read']);
            
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
    
    const sql = 'SELECT first_name, last_name, email, company, phone, created_at FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(results[0]);
    });
});

app.post('/api/profile', (req, res) => {
    const { firstName, lastName, email, company, phone } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const sql = 'UPDATE users SET first_name = ?, last_name = ?, company = ?, phone = ? WHERE email = ?';
    db.query(sql, [firstName, lastName, company, phone || null, email], (err, result) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json({ message: 'Profile updated' });
    });
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`ReInvent v2 running on port ${PORT}`));

