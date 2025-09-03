const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  verifyOTP,
  authUser,
  sendLoginOTP,
  loginWithOTP,
} = require('../controllers/userController');

const router = express.Router();

// @route   POST /api/users/signup
router.post(
  '/signup',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('username', 'Username is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('mobile', 'Mobile number is required').not().isEmpty(),
    body('bio', 'Bio is required').not().isEmpty(),
    body('gender', 'Gender is required').isIn(['male', 'female', 'other']),
    body('role', 'Role is required').isIn(['student', 'mentor', 'organizer']),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  registerUser
);

// @route   POST /api/users/verify-otp
router.post('/verify-otp', verifyOTP);

// @route   POST /api/users/login
router.post('/login', authUser);

// @route   POST /api/users/send-login-otp
router.post('/send-login-otp', sendLoginOTP);

// @route   POST /api/users/login-otp
router.post('/login-otp', loginWithOTP);

module.exports = router;
