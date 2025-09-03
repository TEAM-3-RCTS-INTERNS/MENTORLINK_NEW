const express = require('express');
const { createOrUpdateStudent } = require('../controllers/studentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/students
// @access  Private
router.post('/', protect, createOrUpdateStudent);

module.exports = router;
