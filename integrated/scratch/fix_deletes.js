const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

connection.connect();

async function fixSchema() {
    try {
        // Fix product_logs: add ON DELETE CASCADE
        // First drop existing FK if it exists (need to find the name usually, but we can try to alter)
        // A simpler way is to just delete related rows in the server.js handler, 
        // but let's try to add the constraint properly.
        
        console.log('Fixing constraints...');
        
        // Let's delete related rows manually in the script first to ensure no orphans
        connection.query("DELETE FROM product_logs WHERE product_id NOT IN (SELECT id FROM products)", (err) => {
            if (err) console.error(err);
        });

        // We'll use a robust approach in server.js to delete related rows first.
        // It's safer than guessing FK names in this environment.
        
        console.log('Schema fix script finished.');
    } catch (e) {
        console.error(e);
    }
}

fixSchema();
setTimeout(() => connection.end(), 2000);
