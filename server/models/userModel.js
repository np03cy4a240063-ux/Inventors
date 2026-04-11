const db = require('../config/db');

class User {
  static async createUser(firstName, lastName, email, passwordHash, companyName) {
    const [result] = await db.execute(
      'INSERT INTO users (first_name, last_name, email, password_hash, company_name) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, companyName]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  static async updatePassword(email, passwordHash) {
    const [result] = await db.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [passwordHash, email]
    );
    return result.affectedRows > 0;
  }
}

module.exports = User;
