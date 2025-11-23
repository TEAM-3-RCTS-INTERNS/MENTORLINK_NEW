const Mentor = require('../models/Mentor');
const MentorshipRequest = require('../models/MentorshipRequest');

// @desc    Create or update mentor profile
// @route   POST /api/mentors
// @access  Private
const createOrUpdateMentor = async (req, res) => {
  const {
    primaryDomain,
    secondaryDomain,
    linkedin,
    role,
    requirements,
    primaryExperience,
    mentorshipExperience,
    mentoringStyle,
    weeklyAvailability,
    skills,
  } = req.body;

  // const user = req.user._id; // Old way (requires authentication)
  const { user } = req.body; // New way (from request body)

  try {
    let mentor = await Mentor.findOne({ user });

    if (mentor) {
      // Update existing mentor
      mentor.primaryDomain = primaryDomain;
      mentor.secondaryDomain = secondaryDomain;
      mentor.linkedin = linkedin;
      mentor.role = role;
      mentor.requirements = requirements;
      mentor.primaryExperience = primaryExperience;
      mentor.mentorshipExperience = mentorshipExperience;
      mentor.mentoringStyle = mentoringStyle;
      mentor.weeklyAvailability = weeklyAvailability;
      mentor.skills = skills;

      await mentor.save();
      return res.json({ message: 'Mentor profile updated', mentor });
    }

    // Create new mentor
    mentor = new Mentor({
      user,
      primaryDomain,
      secondaryDomain,
      linkedin,
      role,
      requirements,
      primaryExperience,
      mentorshipExperience,
      mentoringStyle,
      weeklyAvailability,
      skills,
    });

    await mentor.save();
    res.status(201).json({ message: 'Mentor profile created', mentor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get mentor profile
// @route   GET /api/mentors/profile
// @access  Private
const getMentorProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const mentor = await Mentor.findOne({ user: userId }).populate('user', 'name email bio profileImage location about connectionsCount');
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor profile not found' });
    }
    res.json({ mentor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all mentors
// @route   GET /api/mentors
// @access  Public
const getAllMentors = async (req, res) => {
  try {
    const mentors = await Mentor.find()
      .populate('user', 'name email bio profileImage location about connectionsCount')
      .sort({ createdAt: -1 });

    res.json({ mentors });
  } catch (error) {
    console.error('Error in getAllMentors:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get mentor by ID
// @route   GET /api/mentors/:id
// @access  Public
const getMentorById = async (req, res) => {
  try {
    const { id } = req.params;

    const mentor = await Mentor.findById(id)
      .populate('user', 'name email bio profileImage location about connectionsCount');

    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    res.json({ mentor });
  } catch (error) {
    console.error('Error in getMentorById:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update mentor profile
// @route   PUT /api/mentors/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { linkedin, role, primaryExperience, mentorshipExperience, mentoringStyle, weeklyAvailability, skills } = req.body;

    const mentor = await Mentor.findOne({ user: userId });
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor profile not found' });
    }

    // Update fields
    if (linkedin !== undefined) mentor.linkedin = linkedin;
    if (role !== undefined) mentor.role = role;
    if (primaryExperience !== undefined) mentor.primaryExperience = primaryExperience;
    if (mentorshipExperience !== undefined) mentor.mentorshipExperience = mentorshipExperience;
    if (mentoringStyle !== undefined) mentor.mentoringStyle = mentoringStyle;
    if (weeklyAvailability !== undefined) mentor.weeklyAvailability = weeklyAvailability;
    if (skills !== undefined) mentor.skills = skills;

    await mentor.save();

    res.json({ message: 'Profile updated successfully', mentor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get mentor's active mentees
// @route   GET /api/mentors/my-mentees
// @access  Private (Mentor)
const getMyMentees = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find accepted mentorship requests
    const acceptedRequests = await MentorshipRequest.find({
      mentor: userId,
      status: 'accepted'
    }).populate('student', 'name email profileImage bio location');

    // Extract student profiles and attach relationship info
    const mentees = acceptedRequests.map(req => {
      if (!req.student) return null;
      const student = req.student.toObject();
      // Attach relationship details that might be useful for frontend
      student.chatId = req.chatId;
      student.requestId = req._id;
      student.mentorshipStartDate = req.startDate;
      return student;
    }).filter(Boolean);

    res.json({
      mentees: mentees,
      count: mentees.length
    });
  } catch (error) {
    console.error('Error in getMyMentees:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrUpdateMentor,
  getMentorProfile,
  getAllMentors,
  getMentorById,
  updateProfile,
  getMyMentees,
};
