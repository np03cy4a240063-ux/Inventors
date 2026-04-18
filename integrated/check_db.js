const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

db.connect((err) => {
    if (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
    console.log('CONNECTED');
    db.query('SHOW TABLES', (err, results) => {
        if (err) {
            console.error('Query failed:', err.message);
            process.exit(1);
        }
        console.log('TABLES:', results.map(r => Object.values(r)[0]));
        db.end();
    });
});
