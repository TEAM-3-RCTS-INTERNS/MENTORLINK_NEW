
const Student = require('../models/Student');
const fileDb = require('../utils/fileDb');
const isFileDbEnabled = () => String(process.env.USE_FILE_DB || 'false').toLowerCase() === 'true';

// @desc    Create or update student profile
// @route   POST /api/students
// @access  Private
const createOrUpdateStudent = async (req, res) => {
  const {
    roleStatus,
    mentorshipField,
    experienceLevel,
    mentorshipTypes,
    frequency,
    style,
    goal,
    portfolio,
  } = req.body;

  // const user = req.user._id; // Old way (requires authentication)
  const { user } = req.body; // New way (from request body)

  try {
    const isUuidLike = typeof user === 'string' && user.includes('-') && user.length >= 16;
    const useFilePath = isFileDbEnabled() || isUuidLike;
    // eslint-disable-next-line no-console
    console.log('[students] useFilePath=', useFilePath, 'USE_FILE_DB=', isFileDbEnabled(), 'isUuidLike=', isUuidLike, 'user=', user);
    if (useFilePath) {
      // File DB flow
      let student = fileDb.findStudentByUser(user);
      if (student) {
        student = {
          ...student,
          roleStatus,
          mentorshipField,
          experienceLevel,
          mentorshipTypes,
          frequency,
          style,
          goal,
          portfolio,
          updatedAt: new Date().toISOString(),
        };
        fileDb.upsertStudent(student);
        return res.json({ message: 'Student profile updated', student });
      }
      student = {
        id: `${user}-student`,
        user,
        roleStatus,
        mentorshipField,
        experienceLevel,
        mentorshipTypes,
        frequency,
        style,
        goal,
        portfolio,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fileDb.upsertStudent(student);
      return res.status(201).json({ message: 'Student profile created', student });
    }

    let student = await Student.findOne({ user });

    if (student) {
      // Update existing student
      student.roleStatus = roleStatus;
      student.mentorshipField = mentorshipField;
      student.experienceLevel = experienceLevel;
      student.mentorshipTypes = mentorshipTypes;
      student.frequency = frequency;
      student.style = style;
      student.goal = goal;
      student.portfolio = portfolio;

      await student.save();
      return res.json({ message: 'Student profile updated', student });
    }

    // Create new student
    student = new Student({
      user,
      roleStatus,
      mentorshipField,
      experienceLevel,
      mentorshipTypes,
      frequency,
      style,
      goal,
      portfolio,
    });

    await student.save();
    res.status(201).json({ message: 'Student profile created', student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student profile
// @route   GET /api/students/profile
// @access  Private
const getStudentProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    if (isFileDbEnabled()) {
      const student = fileDb.findStudentByUser(userId);
      if (!student) {
        return res.status(404).json({ message: 'Student profile not found' });
      }
      return res.json({ student });
    }

    const student = await Student.findOne({ user: userId }).populate('user', 'name email bio profileImage location about connectionsCount');
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    console.log(student)
    res.json({ student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student profile image
// @route   PUT /api/students/profile-image
// @access  Private
const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileImage } = req.body;

    if (isFileDbEnabled()) {
      const student = fileDb.findStudentByUser(userId);
      if (!student) {
        return res.status(404).json({ message: 'Student profile not found' });
      }
      student.profileImage = profileImage;
      student.updatedAt = new Date().toISOString();
      fileDb.upsertStudent(student);
      return res.json({ message: 'Profile image updated', student });
    }

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    student.profileImage = profileImage;
    await student.save();

    res.json({ message: 'Profile image updated', student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student profile
// @route   PUT /api/students/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goal, mentorshipField, experienceLevel, frequency, style, mentorshipTypes, portfolio } = req.body;

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Update fields
    if (goal !== undefined) student.goal = goal;
    if (mentorshipField !== undefined) student.mentorshipField = mentorshipField;
    if (experienceLevel !== undefined) student.experienceLevel = experienceLevel;
    if (frequency !== undefined) student.frequency = frequency;
    if (style !== undefined) student.style = style;
    if (mentorshipTypes !== undefined) student.mentorshipTypes = mentorshipTypes;
    if (portfolio !== undefined) student.portfolio = portfolio;

    await student.save();

    res.json({ message: 'Profile updated successfully', student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student banner image
// @route   PUT /api/students/banner-image
// @access  Private
const updateBannerImage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bannerImage } = req.body;

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    student.bannerImage = bannerImage;
    await student.save();

    res.json({ message: 'Banner image updated', student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all students
// @route   GET /api/students
// @access  Public
const getAllStudents = async (req, res) => {
  try {
    if (isFileDbEnabled()) {
      const students = fileDb.getAllStudents();
      return res.json({ students });
    }

    const students = await Student.find()
      .populate('user', 'name email bio profileImage location about connectionsCount')
      .sort({ createdAt: -1 });

    res.json({ students });
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Public
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (isFileDbEnabled()) {
      const student = fileDb.findStudentById(id);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      return res.json({ student });
    }

    const student = await Student.findById(id)
      .populate('user', 'name email bio profileImage location about connectionsCount');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ student });
  } catch (error) {
    console.error('Error in getStudentById:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrUpdateStudent,
  getStudentProfile,
  updateProfileImage,
  updateProfile,
  updateBannerImage,
  getAllStudents,
  getStudentById,
};
