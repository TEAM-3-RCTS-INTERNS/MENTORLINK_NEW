/* eslint-env node */
/* eslint-disable no-undef */
const express = require('express');
const {
  createOrUpdateStudent,
  getStudentProfile,
  updateProfileImage,
  updateProfile,
  updateBannerImage,
  getAllStudents,
  getStudentById
} = require('../controllers/studentController');
const { protect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

// @route   GET /api/students
// @access  Public
router.get('/', getAllStudents);

// @route   GET /api/students/profile
// @access  Private
// IMPORTANT: This must come BEFORE /:id route
router.get('/profile', protect, getStudentProfile);

// @route   GET /api/students/:id
// @access  Public
router.get('/:id', getStudentById);

// @route   POST /api/students
// @access  Public (temporarily for initial profile creation)
router.post('/', createOrUpdateStudent);

// @route   PUT /api/students/profile
// @access  Private
router.put('/profile', protect, updateProfile);

// @route   PUT /api/students/profile-image
// @access  Private
router.put('/profile-image', protect, updateProfileImage);

// @route   POST /api/students/upload-image
// @access  Private
router.post('/upload-image', protect, (req, res, next) => {
  // wrap upload.single to handle multer errors explicitly
  const singleUpload = upload.single('profileImage');
  singleUpload(req, res, function (err) {
    if (err) {
      // Multer error (file too large or invalid file type)
      console.error('Multer error on upload-image:', err);
      const message = err.message || 'File upload error';
      return res.status(400).json({ message });
    }
    next();
  });
}, uploadToCloudinary, async (req, res) => {
  try {
    if (!req.cloudinaryResult) {
      return res.status(500).json({ message: 'Image upload failed - no result from Cloudinary' });
    }

    // Use cloudinaryResult URL which will always be secure
    const profileImage = req.cloudinaryResult.secure_url;

    // Update student profile with image URL by reusing controller
    const { updateProfileImage } = require('../controllers/studentController');
    req.body = { profileImage };
    return updateProfileImage(req, res);
  } catch (error) {
    console.error('Error in upload-image handler:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/students/upload-banner
// @access  Private
router.post('/upload-banner', protect, (req, res, next) => {
  const singleUpload = upload.single('bannerImage');
  singleUpload(req, res, function (err) {
    if (err) {
      console.error('Multer error on upload-banner:', err);
      const message = err.message || 'File upload error';
      return res.status(400).json({ message });
    }
    next();
  });
}, uploadToCloudinary, async (req, res) => {
  try {
    if (!req.cloudinaryResult) {
      return res.status(500).json({ message: 'Banner upload failed - no result from Cloudinary' });
    }

    const bannerImage = req.cloudinaryResult.secure_url;

    // Update student banner with image URL
    const { updateBannerImage } = require('../controllers/studentController');
    req.body = { bannerImage };
    return updateBannerImage(req, res);
  } catch (error) {
    console.error('Error in upload-banner handler:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
