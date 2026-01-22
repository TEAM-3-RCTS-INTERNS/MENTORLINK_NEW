const User = require('../models/User');
const AdminSession = require('../models/AdminSession');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fileDb = require('../utils/fileDb');

const USE_FILE_DB = String(process.env.USE_FILE_DB || 'false').toLowerCase() === 'true';

// Helpers for file DB mode
const fileDbGetUserByEmail = (email) => fileDb.findUserByEmail(email);
const fileDbGetUserByUsername = (username) => fileDb.findUserByUsername(username);
const fileDbSaveUser = async (user) => fileDb.upsertUser(user);

// Generate a cryptographically strong 6-digit numeric OTP
const generateOTP = () => {
  let otp = '';
  for (let i = 0; i < 6; i += 1) {
    otp += String(crypto.randomInt(0, 10));
  }
  return otp;
};

// Create and cache a single transporter using Gmail SMTP
//
// Gmail SMTP Setup Requirements:
// 1. Enable 2-Factor Authentication on your Google Account
// 2. Generate an App Password from Google Account Settings > Security > App Passwords
// 3. Use the App Password (16 characters without spaces) as EMAIL_PASS in .env
//
// Common Gmail SMTP Issues & Solutions:
// - Invalid credentials: Verify EMAIL_USER is correct and EMAIL_PASS is App Password (not account password)
// - Spaces in App Password: Remove all spaces from the 16-character App Password
// - 2FA not enabled: Must enable Two-Factor Authentication before generating App Passwords
// - "Less secure app access": This setting is deprecated; use App Passwords instead
// - Connection timeout: Check firewall settings and ensure port 587/465 is not blocked
//
let cachedTransporter;
const getTransporter = async () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App Password from Google Account
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.verify();
  } catch (verifyError) {
    // Log only error message, never credentials
    // eslint-disable-next-line no-console
    console.warn('Gmail transporter verification failed:', verifyError?.message || 'Unknown error');
  }

  cachedTransporter = transporter;
  return cachedTransporter;
};

// Send OTP email (both text and HTML)
const sendOTP = async (email, otp) => {
  const appName = process.env.APP_NAME || 'MentorLink';
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER;
  const subject = `OTP for ${appName} Verification`;
  const text = `Your OTP is: ${otp}. It will expire in 10 minutes.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:16px;color:#111">
      <h2 style="margin:0 0 12px 0;font-weight:700;color:#111">${appName} Verification</h2>
      <p style="margin:0 0 12px 0;color:#444">Use the following One-Time Password (OTP) to continue:</p>
      <div style="font-size:28px;letter-spacing:6px;font-weight:700;background:#f4f6f8;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;text-align:center;color:#111">${otp}</div>
      <p style="margin:12px 0 0 0;color:#666">This code expires in 10 minutes.</p>
      <p style="margin:8px 0 0 0;color:#888;font-size:12px">If you did not request this code, you can safely ignore this email.</p>
    </div>
  `;

  const mailOptions = {
    from: fromAddress ? `${appName} <${fromAddress}>` : undefined,
    to: email,
    subject,
    text,
    html,
  };

  try {
    if (String(process.env.DEV_DISABLE_EMAIL || 'false').toLowerCase() === 'true') {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Email disabled. OTP for ${email}: ${otp}`);
      return;
    }
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
  } catch (err) {
    // Log only error message without exposing credentials or sensitive data
    // eslint-disable-next-line no-console
    console.error('Failed to send OTP email:', err?.message || 'Unknown error');
    throw new Error('Failed to send verification email. Please try again later.');
  }
};

// @desc    Register user
// @route   POST /api/users/signup
// @access  Public
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, username, email, bio, gender, role, password } = req.body;

  try {
    if (USE_FILE_DB) {
      // File DB flow
      const emailExists = fileDbGetUserByEmail(email);
      const usernameExists = fileDbGetUserByUsername(username);
      if (emailExists || usernameExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = {
        id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString('hex'),
        name,
        username,
        email,
        bio,
        gender,
        role,
        password: hashedPassword,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await fileDbSaveUser(user);

      await sendOTP(email, otp);

      return res.status(201).json({
        message: 'User registered successfully. Please verify your email with OTP.',
        userId: user.id,
      });
    }

    // MongoDB flow - Check both email and username
    const emailExists = await User.findOne({ email });
    const usernameExists = await User.findOne({ username });

    if (emailExists) {
      return res.status(400).json({ message: 'Email already registered. Please login or use a different email.' });
    }

    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken. Please choose a different username.' });
    }

    const user = await User.create({
      name,
      username,
      email,
      bio,
      gender,
      role,
      password,
    });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendOTP(email, otp);

    return res.status(201).json({
      message: 'User registered successfully. Please verify your email with OTP.',
      userId: user._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (USE_FILE_DB) {
      const user = fileDbGetUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      if (user.otp !== otp || user.otpExpires < Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
      user.isVerified = true;
      delete user.otp;
      delete user.otpExpires;
      user.updatedAt = new Date().toISOString();
      await fileDbSaveUser(user);

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        message: 'OTP verified successfully',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    return res.json({
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (USE_FILE_DB) {
      const user = fileDbGetUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      // If user is an admin, create session tracking
      if (user.role === 'admin') {
        try {
          await AdminSession.createSession(user._id, token, req);
        } catch (sessionError) {
          console.error('Error creating admin session:', sessionError);
          // Continue even if session creation fails
        }
      }

      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }
    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Send OTP for login
// @route   POST /api/users/send-login-otp
// @access  Public
const sendLoginOTP = async (req, res) => {
  const { email } = req.body;

  try {
    if (USE_FILE_DB) {
      const user = fileDbGetUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      user.updatedAt = new Date().toISOString();
      await fileDbSaveUser(user);
      await sendOTP(email, otp);
      return res.json({ message: 'OTP sent to your email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOTP(email, otp);

    return res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Login with OTP
// @route   POST /api/users/login-otp
// @access  Public
const loginWithOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (USE_FILE_DB) {
      const user = fileDbGetUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      if (user.otp !== otp || user.otpExpires < Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
      delete user.otp;
      delete user.otpExpires;
      user.updatedAt = new Date().toISOString();
      await fileDbSaveUser(user);

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/upload-profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.cloudinaryResult) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const userId = req.user._id;
    const imageUrl = req.cloudinaryResult.secure_url;

    if (USE_FILE_DB) {
      const user = fileDb.findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      user.profileImage = imageUrl;
      user.updatedAt = new Date().toISOString();
      await fileDbSaveUser(user);

      return res.json({
        message: 'Profile picture uploaded successfully',
        profileImage: imageUrl,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profileImage = imageUrl;
    await user.save();

    return res.json({
      message: 'Profile picture uploaded successfully',
      profileImage: imageUrl,
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Soft delete user account (recoverable for 30 days)
// @route   DELETE /api/users/account
// @access  Private
const softDeleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted this way' });
    }

    // Set soft delete fields
    const deletedAt = new Date();
    const scheduledPermanentDeletion = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    user.isDeleted = true;
    user.deletedAt = deletedAt;
    user.deletionReason = reason || 'User requested account deletion';
    user.scheduledPermanentDeletion = scheduledPermanentDeletion;
    user.isVerified = false; // Prevent login

    await user.save();

    res.json({
      message: 'Account marked for deletion. It will be permanently deleted after 30 days. Contact admin to recover.',
      deletedAt,
      scheduledPermanentDeletion,
    });
  } catch (error) {
    console.error('Error in softDeleteAccount:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  authUser,
  sendLoginOTP,
  loginWithOTP,
  uploadProfilePicture,
  softDeleteAccount,
};
