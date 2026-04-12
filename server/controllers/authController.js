const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signUp = async (req, res, next) => {
  try {
    const { firstName, lastName, email, company, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = await User.createUser(firstName, lastName, email, passwordHash, company);

    // Generate JWT so user is immediately logged in
    const token = jwt.sign(
      { id: userId, email: email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    res.status(201).json({ message: 'User created successfully.', userId, token });
  } catch (err) {
    next(err);
  }
};

exports.signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        companyName: user.company_name
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address.' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

    // In a real app, send an email here. For basic, just return success.
    res.status(200).json({ message: 'Email verified. You can now reset your password.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Please provide email and new password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const success = await User.updatePassword(email, passwordHash);
    if (!success) {
      return res.status(400).json({ message: 'Failed to update password.' });
    }

    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
};
