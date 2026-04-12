const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');

// GET /api/dashboard — get all dashboard data
router.get('/dashboard', auth, inventoryController.getDashboardData);

// GET /api/products — get all products
router.get('/products', auth, inventoryController.getProducts);

module.exports = router;
