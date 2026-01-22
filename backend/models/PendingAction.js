const mongoose = require('mongoose');

// Action Risk Level Classifications
const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Action to Risk Level Mapping
const ACTION_RISK_MAP = {
  // Low Risk Actions
  'audit.view': RISK_LEVELS.LOW,
  'user.view': RISK_LEVELS.LOW,
  'mentor.view': RISK_LEVELS.LOW,
  'session.view': RISK_LEVELS.LOW,
  'stats.view': RISK_LEVELS.LOW,
  'search.perform': RISK_LEVELS.LOW,
  'note.add': RISK_LEVELS.LOW,
  'note.view': RISK_LEVELS.LOW,
  'filter.save': RISK_LEVELS.LOW,
  
  // Medium Risk Actions
  'mentor.approve': RISK_LEVELS.MEDIUM,
  'mentor.deny': RISK_LEVELS.MEDIUM,
  'session.cancel': RISK_LEVELS.MEDIUM,
  'session.reschedule': RISK_LEVELS.MEDIUM,
  'user.activate': RISK_LEVELS.MEDIUM,
  'notification.send': RISK_LEVELS.MEDIUM,
  'bulk.approve': RISK_LEVELS.MEDIUM,
  
  // High Risk Actions
  'user.deactivate': RISK_LEVELS.HIGH,
  'user.ban': RISK_LEVELS.HIGH,
  'bulk.deactivate': RISK_LEVELS.HIGH,
  'data.export': RISK_LEVELS.HIGH,
  'session.force_logout': RISK_LEVELS.HIGH,
  
  // Critical Risk Actions
  'user.delete': RISK_LEVELS.CRITICAL,
  'user.permanent_ban': RISK_LEVELS.CRITICAL,
  'bulk.delete': RISK_LEVELS.CRITICAL,
  'data.purge': RISK_LEVELS.CRITICAL,
};

const pendingActionSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
  },
  actionLabel: {
    type: String,
    required: true,
  },
  riskLevel: {
    type: String,
    enum: Object.values(RISK_LEVELS),
    required: true,
  },
  targetType: {
    type: String,
    required: true,
    enum: ['user', 'mentor', 'student', 'session', 'connection', 'notification', 'system', 'bulk'],
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  targetIds: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
  targetName: {
    type: String,
  },
  reason: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'executed', 'cancelled', 'expired'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
  executedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
  },
  reauthenticatedAt: {
    type: Date,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
pendingActionSchema.index({ status: 1, createdAt: -1 });
pendingActionSchema.index({ requestedBy: 1, status: 1 });
pendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Static method to get risk level for an action
pendingActionSchema.statics.getRiskLevel = function(action) {
  return ACTION_RISK_MAP[action] || RISK_LEVELS.MEDIUM;
};

// Static method to check if action requires approval
pendingActionSchema.statics.requiresApproval = function(action) {
  const riskLevel = this.getRiskLevel(action);
  return riskLevel === RISK_LEVELS.CRITICAL;
};

// Static method to check if action requires re-authentication
pendingActionSchema.statics.requiresReauth = function(action) {
  const riskLevel = this.getRiskLevel(action);
  return riskLevel === RISK_LEVELS.HIGH || riskLevel === RISK_LEVELS.CRITICAL;
};

// Static method to create pending action
pendingActionSchema.statics.createPendingAction = async function(data, req) {
  const riskLevel = this.getRiskLevel(data.action);
  
  const action = await this.create({
    ...data,
    riskLevel,
    ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown',
  });
  
  return action;
};

// Static method to get pending actions for approval
pendingActionSchema.statics.getPendingForApproval = async function(excludeAdminId) {
  return await this.find({
    status: 'pending',
    requestedBy: { $ne: excludeAdminId },
    expiresAt: { $gt: new Date() },
  })
    .populate('requestedBy', 'name email profileImage')
    .sort({ createdAt: -1 });
};

// Static method to approve action
pendingActionSchema.statics.approveAction = async function(actionId, approvedBy) {
  const action = await this.findById(actionId);
  
  if (!action) {
    throw new Error('Pending action not found');
  }
  
  if (action.status !== 'pending') {
    throw new Error('Action is no longer pending');
  }
  
  if (action.requestedBy.toString() === approvedBy.toString()) {
    throw new Error('Cannot approve your own action');
  }
  
  action.status = 'approved';
  action.approvedBy = approvedBy;
  action.approvedAt = new Date();
  
  await action.save();
  return action;
};

// Static method to reject action
pendingActionSchema.statics.rejectAction = async function(actionId, rejectedBy, reason) {
  const action = await this.findById(actionId);
  
  if (!action) {
    throw new Error('Pending action not found');
  }
  
  if (action.status !== 'pending') {
    throw new Error('Action is no longer pending');
  }
  
  action.status = 'rejected';
  action.rejectedBy = rejectedBy;
  action.rejectedAt = new Date();
  action.rejectionReason = reason;
  
  await action.save();
  return action;
};

// Export constants
module.exports = mongoose.models.PendingAction || mongoose.model('PendingAction', pendingActionSchema);
module.exports.RISK_LEVELS = RISK_LEVELS;
module.exports.ACTION_RISK_MAP = ACTION_RISK_MAP;
