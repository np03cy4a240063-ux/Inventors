const mysql = require('mysql2');
const fs = require('fs');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'reinvent_db_v2'
});

const results = {};
let pending = 4;

function done() {
    pending--;
    if (pending === 0) {
        fs.writeFileSync('/opt/lampp/htdocs/Reinvent/v2/integrated/scratch/schema_verify.json', JSON.stringify(results, null, 2));
        console.log('Written to /tmp/schema_verify.json');
        db.end();
        process.exit(0);
    }
}

['products', 'sales_orders', 'purchase_orders', 'users'].forEach(table => {
    db.query(`DESCRIBE ${table}`, (err, rows) => {
        if (err) {
            results[table] = { error: err.message };
        } else {
            results[table] = rows.map(r => r.Field);
        }
        done();
    });
});
