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

// Registration Endpoint
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, company, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (first_name, last_name, email, company, password) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [firstName, lastName, email, company, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
                return res.status(500).json({ error: 'DB Error' });
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
            res.json({ message: 'Login successful', user: { email: results[0].email, name: results[0].first_name } });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Queries Endpoint
app.post('/api/queries', (req, res) => {
    const { query } = req.body;
    const sql = 'INSERT INTO queries (query_text) VALUES (?)';
    db.query(sql, [query], (err) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json({ message: 'Query saved' });
    });
});

// --- PROFILE API (FRONTEND-BACKEND MERGE) ---
let memProfile = { firstName: 'John', lastName: 'Doe', email: 'johndoe@reinvent.io', phone: '+977-9834567701', company: 'Acme Trading Co.' };

app.get('/api/profile', (req, res) => {
    const sql = 'SELECT * FROM user_profiles LIMIT 1';
    db.query(sql, (err, results) => {
        // Fallback to memory if table doesn't exist
        if (err || results.length === 0) return res.json(memProfile);
        res.json(results[0]);
    });
});

app.post('/api/profile', (req, res) => {
    const { firstName, lastName, email, phone, company } = req.body;
    memProfile = { firstName, lastName, email, phone, company }; // Update memory fallback
    
    // Attempt DB update/insert
    const sql = 'REPLACE INTO user_profiles (id, firstName, lastName, email, phone, company) VALUES (1, ?, ?, ?, ?, ?)';
    db.query(sql, [firstName, lastName, email, phone, company], (err) => {
        if (err) {
            console.error('Profile DB error:', err.message);
            return res.status(500).json({ error: 'DB Error' });
        }
        res.json({ message: 'Profile updated' });
    });
});
// --------------------------------------------

// --- INVENTORY API (FRONTEND-BACKEND MERGE) ---
let memProducts = [];

app.get('/api/products', (req, res) => {
    const sql = 'SELECT * FROM products';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Products DB fetch error:', err.message);
            return res.json(memProducts); // Fallback if table doesn't exist
        }
        res.json(results);
    });
});

app.post('/api/products/batch', (req, res) => {
    const products = req.body;
    memProducts = products; // Update memory fallback
    
    if (!Array.isArray(products) || products.length === 0) {
        return res.json({ message: 'No products to sync' });
    }

    // Prepare values for bulk insert/replace
    const values = products.map(p => [
        p.id, p.name, p.sku, p.desc || '', p.category || '', 
        parseFloat(p.cost) || 0, parseFloat(p.sell) || 0, 
        parseInt(p.stock) || 0, parseInt(p.min) || 0
    ]);

    const sql = 'REPLACE INTO products (id, name, sku, `desc`, category, cost, sell, stock, min) VALUES ?';
    db.query(sql, [values], (err) => {
        if (err) {
            console.error('Batch product sync DB error:', err.message);
            return res.status(500).json({ error: 'DB Sync Error' });
        }
        console.log(`Successfully synced ${products.length} products to DB`);
        res.json({ message: 'Products synced to database' });
    });
});
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    console.log(`DELETING Product ID: ${id}`);
    
    const sql = 'DELETE FROM products WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('CRITICAL: Product deletion DB error:', err.message);
            return res.status(500).json({ error: 'DB Delete Error', details: err.message });
        }
        
        if (result.affectedRows === 0) {
            console.warn(`DELETE Warning: Product with ID ${id} not found in DB`);
            return res.status(404).json({ error: 'Product not found in database' });
        }

        // Successfully deleted from DB, now update memory cache
        const beforeCount = memProducts.length;
        memProducts = memProducts.filter(p => String(p.id) !== String(id));
        const afterCount = memProducts.length;
        
        console.log(`DELETED successfully. DB affectedRows: ${result.affectedRows}. Memory cache updated: ${beforeCount} -> ${afterCount}`);
        res.json({ message: 'Product deleted successfully', id: id });
    });
});
// ----------------------------------------------

// --- SALES ORDERS API ---
app.get('/api/sales_orders', (req, res) => {
    const sql = 'SELECT * FROM sales_orders ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Sales Orders fetch error:', err.message);
            return res.status(500).json({ error: 'DB Fetch Error' });
        }
        res.json(results);
    });
});

app.post('/api/sales_orders', (req, res) => {
    const { order_id, date, customer, items_count, total, status } = req.body;
    
    if (!order_id || !date || !customer || !items_count || !total) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = 'INSERT INTO sales_orders (order_id, date, customer, items_count, total, status) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [order_id, date, customer, items_count, total, status || 'PENDING'], (err, result) => {
        if (err) {
            console.error('Sales order creation error:', err.message);
            return res.status(500).json({ error: 'DB Insert Error' });
        }
        res.status(201).json({ message: 'Order created', id: result.insertId });
    });
});
// ------------------------

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`ReInvent v2 running on port ${PORT}`));
