const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

connection.connect();

const queries = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255) DEFAULT NULL;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT NULL;",
    "ALTER TABLE products MODIFY COLUMN image_url MEDIUMTEXT;"
];

queries.forEach(query => {
    connection.query(query, (err, results) => {
        if (err) console.error('Error executing query:', query, err.message);
        else console.log('Successfully executed:', query);
    });
});

setTimeout(() => connection.end(), 2000);
