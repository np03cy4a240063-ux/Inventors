const db = require('../config/db');

class Product {
  static async getAll() {
    const [rows] = await db.execute(
      `SELECT p.*, c.name AS category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       ORDER BY p.name`
    );
    return rows;
  }

  static async getLowStock() {
    const [rows] = await db.execute(
      `SELECT p.*, c.name AS category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.quantity > 0 AND p.quantity <= p.reorder_level`
    );
    return rows;
  }

  static async getOutOfStock() {
    const [rows] = await db.execute(
      `SELECT p.*, c.name AS category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.quantity = 0`
    );
    return rows;
  }

  static async getDashboardStats() {
    const [rows] = await db.execute(
      `SELECT 
         COUNT(*) AS totalProducts,
         COALESCE(SUM(quantity * unit_price), 0) AS stockValue,
         COALESCE(SUM(quantity), 0) AS totalUnits
       FROM products`
    );
    return rows[0];
  }
}

module.exports = Product;
