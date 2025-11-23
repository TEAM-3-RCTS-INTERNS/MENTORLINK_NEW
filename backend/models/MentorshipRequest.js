const mongoose = require('mongoose');

const mentorshipRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  message: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    required: true,
  },
  reasonForMentorship: {
    type: String,
    required: true,
  },
  currentPriorities: {
    type: String,
    required: true,
  },
  supportAreas: [{
    type: String,
    required: true,
  }],
  attachedFiles: [{
    fileName: String,
    fileUrl: String,
  }],
  contactInfo: {
    email: String,
    linkedIn: String,
  },
  studentProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  },
  startDate: {
    type: Date,
  },
  role: {
    type: String,
    enum: ['current', 'past'],
    default: 'current',
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
  },
  meta: {
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acceptedAt: Date,
  },
}, {
  timestamps: true,
});

// Index for faster queries
mentorshipRequestSchema.index({ mentor: 1, status: 1 });
mentorshipRequestSchema.index({ student: 1 });

module.exports = mongoose.models.MentorshipRequest || mongoose.model('MentorshipRequest', mentorshipRequestSchema);
