const Product = require('../models/productModel');
const db = require('../config/db');

exports.getDashboardData = async (req, res, next) => {
  try {
    const products = await Product.getAll();
    const lowStock = await Product.getLowStock();
    const outOfStock = await Product.getOutOfStock();
    const stats = await Product.getDashboardStats();

    // Get pending sales orders
    const [pendingSales] = await db.execute(
      `SELECT id, customer_name, status, total_amount, created_at
       FROM sales_orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
    );

    // Get pending purchase orders
    const [pendingPurchases] = await db.execute(
      `SELECT id, supplier_name, status, total_amount, created_at
       FROM purchase_orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
    );

    res.status(200).json({
      products,
      lowStock,
      outOfStock,
      stats,
      pendingSales,
      pendingPurchases
    });
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.getAll();
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
};
