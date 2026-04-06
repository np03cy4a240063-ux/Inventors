const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/signup
router.post('/signup', authController.signUp);

// POST /api/auth/signin
router.post('/signin', authController.signIn);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

module.exports = router;
