const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  primaryDomain: {
    type: String,
    required: true,
  },
  secondaryDomain: {
    type: String,
  },
  linkedin: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  requirements: {
    type: Boolean,
    default: false,
  },
  primaryExperience: {
    type: String,
    required: true,
  },
  mentorshipExperience: {
    type: String,
    required: true,
  },
  mentoringStyle: [{
    type: String,
    enum: ['Text', 'Call', 'Asynchronous'],
  }],
  weeklyAvailability: [{
    type: String,
    enum: ['1-2 hrs', '3-5 hrs', 'On-demand'],
  }],
  skills: [{
    type: String,
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Mentor', mentorSchema);
