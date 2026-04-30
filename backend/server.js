const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt'); // Added for security

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

db.connect((err) => {
    if (err) return console.error('DB Error:', err);
    console.log('Connected to MySQL (v2)');
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

// Get Profile
app.get('/api/profile/:email', (req, res) => {
    const { email } = req.params;
    const sql = 'SELECT firstName, lastName, email, company, phone, profile_photo as profilePhoto, notif_low_stock, notif_order_updates, notif_aging_stock FROM user_profiles WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = results[0];
        // Format notifications array for the frontend
        user.notifications = [!!user.notif_low_stock, !!user.notif_order_updates, !!user.notif_aging_stock];
        res.json(user);
    });
});

// Update Profile
app.post('/api/profile', (req, res) => {
    const { firstName, lastName, email, phone, company, profilePhoto, notifications } = req.body;
    
    if (!email) return res.status(400).json({ error: 'Email required' });

    db.query('SELECT id FROM user_profiles WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        
        let notifQuery = '';
        let queryParams = [firstName || '', lastName || '', phone || '', company || '', profilePhoto || null];
        
        if (notifications && Array.isArray(notifications)) {
             notifQuery = ', notif_low_stock = ?, notif_order_updates = ?, notif_aging_stock = ?';
             queryParams.push(notifications[0] ? 1 : 0, notifications[1] ? 1 : 0, notifications[2] ? 1 : 0);
        }
        
        queryParams.push(email);
        
        if (results.length === 0) {
            // User profile doesn't exist, insert new row
            let insertSql = `INSERT INTO user_profiles (firstName, lastName, email, phone, company, profile_photo`;
            let insertVals = `VALUES (?, ?, ?, ?, ?, ?`;
            let insertParams = [firstName || '', lastName || '', email, phone || '', company || '', profilePhoto || null];
            
            if (notifications && Array.isArray(notifications)) {
                 insertSql += `, notif_low_stock, notif_order_updates, notif_aging_stock`;
                 insertVals += `, ?, ?, ?`;
                 insertParams.push(notifications[0] ? 1 : 0, notifications[1] ? 1 : 0, notifications[2] ? 1 : 0);
            }
            insertSql += `) ` + insertVals + `)`;
            
            db.query(insertSql, insertParams, (err) => {
                if (err) return res.status(500).json({ error: 'DB Error inserting profile' });
                res.json({ message: 'Profile created successfully' });
            });
        } else {
            // Update existing row
            const sql = `UPDATE user_profiles SET firstName = ?, lastName = ?, phone = ?, company = ?, profile_photo = ? ${notifQuery} WHERE email = ?`;
            db.query(sql, queryParams, (err) => {
                if (err) return res.status(500).json({ error: 'DB Error updating profile' });
                res.json({ message: 'Profile updated successfully' });
            });
        }
    });
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`ReInvent v2 running on port ${PORT}`));
