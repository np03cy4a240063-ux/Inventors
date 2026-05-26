const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

db.query('DESCRIBE users', (err, results) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(results);
    process.exit(0);
});
