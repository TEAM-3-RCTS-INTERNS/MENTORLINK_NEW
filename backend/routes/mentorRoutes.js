const express = require('express');
const { createOrUpdateMentor } = require('../controllers/mentorController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/mentors
// @access  Private
router.post('/', protect, createOrUpdateMentor);

module.exports = router;
