const mongoose = require('mongoose');
const crypto = require('crypto');

// Human-readable action labels
const ACTION_LABELS = {
  'user.activate': 'activated user account',
  'user.deactivate': 'deactivated user account',
  'user.delete': 'deleted user account',
  'user.soft_delete': 'user requested account deletion',
  'user.recover': 'recovered deleted user account',
  'user.permanent_delete': 'permanently deleted user account',
  'user.ban': 'banned user',
  'user.permanent_ban': 'permanently banned user',
  'user.view': 'viewed user details',
  'mentor.approve': 'approved mentor application',
  'mentor.deny': 'denied mentor application',
  'mentor.view': 'viewed mentor details',
  'session.cancel': 'cancelled session',
  'session.reschedule': 'rescheduled session',
  'session.view': 'viewed session details',
  'bulk.approve': 'bulk approved items',
  'bulk.deactivate': 'bulk deactivated items',
  'bulk.delete': 'bulk deleted items',
  'note.add': 'added admin note',
  'note.edit': 'edited admin note',
  'note.delete': 'deleted admin note',
  'filter.save': 'saved filter preset',
  'filter.delete': 'deleted filter preset',
  'alert.acknowledge': 'acknowledged alert',
  'alert.resolve': 'resolved alert',
  'alert.dismiss': 'dismissed alert',
  'pending.approve': 'approved pending action',
  'pending.reject': 'rejected pending action',
  'session.force_logout': 'forced admin session logout',
  'data.export': 'exported data',
  'search.perform': 'performed global search',
  'reauth.success': 're-authenticated for sensitive action',
};

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  adminName: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  actionLabel: {
    type: String,
    required: true,
  },
  targetType: {
    type: String,
    required: true,
    enum: ['user', 'mentor', 'student', 'session', 'connection', 'notification', 'system', 'bulk', 'alert', 'pending', 'filter', 'note'],
    index: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  targetIds: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
  targetName: {
    type: String,
  },
  humanReadable: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
    },
    diff: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    }],
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
  // Tamper resistance
  previousHash: {
    type: String,
  },
  hash: {
    type: String,
    required: true,
  },
  sequenceNumber: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Make the collection append-only (no updates/deletes at model level)
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs cannot be deleted');
});

auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs cannot be deleted');
});

auditLogSchema.pre('deleteMany', function() {
  throw new Error('Audit logs cannot be deleted');
});

// Compound index for efficient queries
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ sequenceNumber: 1 });
auditLogSchema.index({ hash: 1 });

// Generate hash for tamper detection
const generateHash = (data, previousHash) => {
  const hashData = JSON.stringify({
    ...data,
    previousHash,
  });
  return crypto.createHash('sha256').update(hashData).digest('hex');
};

// Generate diff between before and after
const generateDiff = (before, after) => {
  const diff = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  
  for (const key of allKeys) {
    const oldValue = before?.[key];
    const newValue = after?.[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diff.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }
  
  return diff;
};

// Static method to create audit log entry with enhanced features
auditLogSchema.statics.createLog = async function(adminId, action, targetType, targetId, changes, req, options = {}) {
  // Get admin name
  const User = mongoose.model('User');
  const admin = await User.findById(adminId).select('name');
  const adminName = admin?.name || 'Unknown Admin';
  
  // Get target name if available
  let targetName = options.targetName || '';
  if (!targetName && targetId) {
    try {
      const targetModel = mongoose.model(targetType.charAt(0).toUpperCase() + targetType.slice(1));
      const target = await targetModel.findById(targetId).select('name email');
      targetName = target?.name || target?.email || '';
    } catch (e) {
      // Model might not exist or have name field
    }
  }
  
  // Generate action label
  const actionLabel = ACTION_LABELS[action] || action.replace('.', ' ');
  
  // Generate human-readable string
  const humanReadable = `Admin ${adminName} ${actionLabel}${targetName ? ` for ${targetName}` : ''}${options.reason ? ` - Reason: ${options.reason}` : ''}`;
  
  // Generate diff if before/after provided
  const diff = generateDiff(changes?.before, changes?.after);
  
  // Get previous log for hash chain
  const previousLog = await this.findOne().sort({ sequenceNumber: -1 });
  const previousHash = previousLog?.hash || 'GENESIS';
  const sequenceNumber = (previousLog?.sequenceNumber || 0) + 1;
  
  // Prepare log data
  const logData = {
    adminId,
    adminName,
    action,
    actionLabel,
    targetType,
    targetId,
    targetIds: options.targetIds,
    targetName,
    humanReadable,
    reason: options.reason,
    riskLevel: options.riskLevel || 'medium',
    changes: {
      ...changes,
      diff,
    },
    ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown',
    metadata: options.metadata,
    previousHash,
    sequenceNumber,
  };
  
  // Generate hash
  logData.hash = generateHash(logData, previousHash);
  
  const log = await this.create(logData);
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
    riskLevel,
    search,
    page = 1,
    limit = 50,
  } = { ...filters, ...options };

  const query = {};

  if (adminId) query.adminId = adminId;
  if (targetType) query.targetType = targetType;
  if (action) query.action = action;
  if (riskLevel) query.riskLevel = riskLevel;
  
  if (search) {
    query.$or = [
      { humanReadable: { $regex: search, $options: 'i' } },
      { targetName: { $regex: search, $options: 'i' } },
      { adminName: { $regex: search, $options: 'i' } },
      { reason: { $regex: search, $options: 'i' } },
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const logs = await this.find(query)
    .populate('adminId', 'name email profileImage')
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

// Static method to verify log chain integrity
auditLogSchema.statics.verifyIntegrity = async function(startSeq, endSeq) {
  const logs = await this.find({
    sequenceNumber: { $gte: startSeq, $lte: endSeq },
  }).sort({ sequenceNumber: 1 });
  
  let isValid = true;
  const issues = [];
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    // Verify hash chain
    if (i > 0) {
      const previousLog = logs[i - 1];
      if (log.previousHash !== previousLog.hash) {
        isValid = false;
        issues.push({
          sequenceNumber: log.sequenceNumber,
          issue: 'Hash chain broken',
        });
      }
    }
    
    // Verify sequence
    if (i > 0 && log.sequenceNumber !== logs[i - 1].sequenceNumber + 1) {
      isValid = false;
      issues.push({
        sequenceNumber: log.sequenceNumber,
        issue: 'Sequence number gap detected',
      });
    }
  }
  
  return { isValid, issues, checkedCount: logs.length };
};

// Export with action labels
module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
module.exports.ACTION_LABELS = ACTION_LABELS;
