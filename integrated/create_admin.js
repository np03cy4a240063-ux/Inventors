const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

db.connect(async (err) => {
    if (err) {
        console.error('Connection failed', err);
        process.exit(1);
    }
    
    try {
        const email = 'Admin123@gmail.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) throw err;
            
            if (results.length > 0) {
                console.log('Admin user already exists.');
                process.exit(0);
            } else {
                const sql = 'INSERT INTO users (first_name, last_name, email, company, password) VALUES (?, ?, ?, ?, ?)';
                db.query(sql, ['Admin', 'User', email, 'ReInvent Admin', hashedPassword], (err, result) => {
                    if (err) throw err;
                    console.log('Admin user created successfully.');
                    process.exit(0);
                });
            }
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
});
