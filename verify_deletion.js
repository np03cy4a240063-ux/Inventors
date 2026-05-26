const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

db.connect((err) => {
    if (err) { console.error(err); process.exit(1); }
    
    // 1. Insert a dummy product
    const insertSql = 'INSERT INTO products (name, sku, category, cost, sell, stock, min) VALUES ("DELETE_ME", "TEST-001", "Test", 10, 20, 100, 10)';
    db.query(insertSql, (err, result) => {
        if (err) { console.error('Insert failed:', err); process.exit(1); }
        const id = result.insertId;
        console.log('Inserted dummy product with ID:', id);
        
        // 2. Delete it
        db.query('DELETE FROM products WHERE id = ?', [id], (err, result) => {
            if (err) { console.error('Delete failed:', err); process.exit(1); }
            console.log('Deleted product, affectedRows:', result.affectedRows);
            
            // 3. Verify it's gone
            db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
                if (err) { console.error('Select failed:', err); process.exit(1); }
                if (results.length === 0) {
                    console.log('SUCCESS: Product is GONE from database');
                } else {
                    console.log('FAILURE: Product still exists!');
                }
                db.end();
            });
        });
    });
});
