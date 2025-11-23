const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    // Examples: 'user.deactivate', 'user.activate', 'mentor.approve', 'mentor.deny',
    // 'session.cancel', 'session.reschedule', etc.
    index: true,
  },
  targetType: {
    type: String,
    required: true,
    enum: ['user', 'mentor', 'student', 'session', 'connection', 'notification'],
    index: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

// Static method to create audit log entry
auditLogSchema.statics.createLog = async function(adminId, action, targetType, targetId, changes, req) {
  const log = await this.create({
    adminId,
    action,
    targetType,
    targetId,
    changes,
    ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown',
  });
  return log;
};

// Static method to get logs with filters
auditLogSchema.statics.getLogs = async function(filters = {}, options = {}) {
  const {
    adminId,
    targetType,
    action,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = { ...filters, ...options };

  const query = {};

  if (adminId) query.adminId = adminId;
  if (targetType) query.targetType = targetType;
  if (action) query.action = action;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const logs = await this.find(query)
    .populate('adminId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return {
    logs,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
