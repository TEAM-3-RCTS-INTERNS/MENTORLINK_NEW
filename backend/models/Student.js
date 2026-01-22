const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  roleStatus: {
    type: String,
    required: true,
    enum: ['student', 'working', 'careerSwitch'],
  },
  mentorshipField: [{
    type: String,
    required: true,
  }],
  experienceLevel: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
  },
  mentorshipTypes: [{
    type: String,
    enum: [
      'Career guidance',
      'Project help / portfolio review',
      'Resume & LinkedIn feedback',
      'Mock interviews',
      'Learning roadmap',
      'Doubt-solving / weekly check-ins',
    ],
  }],
  frequency: {
    type: String,
    required: true,
    enum: ['Once a week', 'Twice a month', 'On-demand (as needed)'],
  },
  style: {
    type: String,
    required: true,
    enum: ['Text', 'Call', 'Asynchronous'],
  },
  goal: {
    type: String,
    required: true,
  },
  portfolio: {
    type: String,
  },
  profileImage: {
    type: String,
  },
  bannerImage: {
    type: String,
  },
  connectionsCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
