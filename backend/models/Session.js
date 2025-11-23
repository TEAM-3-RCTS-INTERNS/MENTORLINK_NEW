const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  time: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    default: 30,
  },
  timezone: {
    type: String,
    default: 'GMT-05:00 (Eastern Time - US and Canada)',
  },
  zoomLink: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'pending'],
    default: 'scheduled',
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
sessionSchema.index({ mentor: 1, student: 1, date: -1 });
sessionSchema.index({ status: 1, date: 1 });

// Static method to create session with notification
sessionSchema.statics.createSessionWithNotification = async function (sessionData, mentorId, studentId, studentName) {
  const Notification = mongoose.model('Notification');

  // Create session
  const session = await this.create(sessionData);

  await Notification.createNotification(studentId, {
    type: 'session',
    title: 'New Session Scheduled',
    message: `Your mentor has scheduled a session for ${new Date(session.date).toLocaleDateString()} at ${session.time}`,
    link: `/sessions/${session._id}`,
    icon: 'calendar',
    data: {
      sessionId: session._id,
      mentorId: mentorId,
    },
  });

  // Create notification for mentor (Confirmation)
  await Notification.createNotification(mentorId, {
    type: 'session',
    title: 'Session Scheduled',
    message: `You have scheduled a session with ${studentName || 'your mentee'} for ${new Date(session.date).toLocaleDateString()} at ${session.time}`,
    link: `/sessions/${session._id}`,
    icon: 'calendar',
    data: {
      sessionId: session._id,
      studentId: studentId,
    },
  });

  return session;
};

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);
