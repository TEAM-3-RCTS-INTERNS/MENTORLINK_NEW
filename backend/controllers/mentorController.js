const Mentor = require('../models/Mentor');

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

  const user = req.user._id;

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

module.exports = {
  createOrUpdateMentor,
};
