const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// GET /api/user/profile — get logged-in user's profile
router.get('/profile', auth, userController.getProfile);

// PUT /api/user/profile — update logged-in user's profile
router.put('/profile', auth, userController.updateProfile);

module.exports = router;
