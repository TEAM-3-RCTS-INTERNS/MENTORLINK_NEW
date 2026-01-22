const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
  },
  device: {
    type: String,
    default: 'Unknown Device',
  },
  browser: {
    type: String,
    default: 'Unknown Browser',
  },
  location: {
    type: String,
    default: 'Unknown Location',
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  loginAt: {
    type: Date,
    default: Date.now,
  },
  logoutAt: {
    type: Date,
  },
  forcedLogout: {
    type: Boolean,
    default: false,
  },
  forcedLogoutBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
adminSessionSchema.index({ adminId: 1, isActive: 1 });
adminSessionSchema.index({ token: 1 });

// Static method to create session
adminSessionSchema.statics.createSession = async function(adminId, token, req) {
  const userAgent = req?.headers?.['user-agent'] || 'Unknown';
  
  // Parse device and browser from user agent
  let device = 'Desktop';
  let browser = 'Unknown Browser';
  
  if (userAgent.includes('Mobile')) device = 'Mobile';
  if (userAgent.includes('Tablet')) device = 'Tablet';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  const session = await this.create({
    adminId,
    token,
    ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent,
    device,
    browser,
  });
  
  return session;
};

// Static method to get active sessions
adminSessionSchema.statics.getActiveSessions = async function() {
  return await this.find({ isActive: true })
    .populate('adminId', 'name email profileImage')
    .sort({ lastActivity: -1 });
};

// Static method to update last activity
adminSessionSchema.statics.updateActivity = async function(token) {
  return await this.findOneAndUpdate(
    { token, isActive: true },
    { lastActivity: new Date() },
    { new: true }
  );
};

// Static method to force logout
adminSessionSchema.statics.forceLogout = async function(sessionId, forcedBy) {
  return await this.findByIdAndUpdate(
    sessionId,
    {
      isActive: false,
      logoutAt: new Date(),
      forcedLogout: true,
      forcedLogoutBy: forcedBy,
    },
    { new: true }
  );
};

// Static method to logout by token
adminSessionSchema.statics.logoutByToken = async function(token) {
  return await this.findOneAndUpdate(
    { token },
    {
      isActive: false,
      logoutAt: new Date(),
    },
    { new: true }
  );
};

module.exports = mongoose.models.AdminSession || mongoose.model('AdminSession', adminSessionSchema);
