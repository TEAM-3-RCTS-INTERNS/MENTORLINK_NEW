const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded._id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error in authentication' });
  }
};

module.exports = { isAdmin };
