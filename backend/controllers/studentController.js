const Student = require('../models/Student');

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

  const user = req.user._id;

  try {
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

module.exports = {
  createOrUpdateStudent,
};
