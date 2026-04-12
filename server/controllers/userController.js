const User = require('../models/userModel');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      companyName: user.company_name,
      isAdmin: user.is_admin,
      createdAt: user.created_at
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email, companyName } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: 'First name, last name, and email are required.' });
    }

    const success = await User.updateProfile(req.user.id, {
      firstName,
      lastName,
      email,
      companyName: companyName || ''
    });

    if (!success) {
      return res.status(400).json({ message: 'Failed to update profile.' });
    }

    res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (err) {
    next(err);
  }
};
