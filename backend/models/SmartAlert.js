const mongoose = require('mongoose');

const smartAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'high_cancellation_rate',
      'repeated_reports',
      'frequent_reschedules',
      'suspicious_activity',
      'pending_approvals',
      'system_warning',
      'compliance_issue',
      'mentor_inactive',
      'session_overdue',
    ],
    index: true,
  },
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'critical'],
    default: 'warning',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  targetType: {
    type: String,
    enum: ['user', 'mentor', 'student', 'session', 'system', 'multiple'],
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
  metrics: {
    type: mongoose.Schema.Types.Mixed,
  },
  threshold: {
    type: Number,
  },
  currentValue: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active',
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  acknowledgedAt: {
    type: Date,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
  },
  resolutionNote: {
    type: String,
  },
  autoResolved: {
    type: Boolean,
    default: false,
  },
  link: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
smartAlertSchema.index({ status: 1, severity: 1, createdAt: -1 });
smartAlertSchema.index({ type: 1, status: 1 });
smartAlertSchema.index({ targetType: 1, targetId: 1 });

// Static method to create alert
smartAlertSchema.statics.createAlert = async function(data) {
  // Check if similar active alert exists to avoid duplicates
  const existingAlert = await this.findOne({
    type: data.type,
    targetId: data.targetId,
    status: 'active',
  });
  
  if (existingAlert) {
    // Update existing alert instead of creating duplicate
    existingAlert.currentValue = data.currentValue;
    existingAlert.metrics = data.metrics;
    existingAlert.updatedAt = new Date();
    await existingAlert.save();
    return existingAlert;
  }
  
  return await this.create(data);
};

// Static method to get active alerts
smartAlertSchema.statics.getActiveAlerts = async function() {
  return await this.find({ status: { $in: ['active', 'acknowledged'] } })
    .populate('acknowledgedBy', 'name')
    .sort({ severity: -1, createdAt: -1 });
};

// Static method to get alerts summary
smartAlertSchema.statics.getAlertsSummary = async function() {
  const summary = await this.aggregate([
    { $match: { status: { $in: ['active', 'acknowledged'] } } },
    {
      $group: {
        _id: { type: '$type', severity: '$severity' },
        count: { $sum: 1 },
      },
    },
  ]);
  
  const criticalCount = await this.countDocuments({ status: 'active', severity: 'critical' });
  const warningCount = await this.countDocuments({ status: 'active', severity: 'warning' });
  const infoCount = await this.countDocuments({ status: 'active', severity: 'info' });
  
  return {
    total: criticalCount + warningCount + infoCount,
    critical: criticalCount,
    warning: warningCount,
    info: infoCount,
    byType: summary,
  };
};

// Static method to acknowledge alert
smartAlertSchema.statics.acknowledgeAlert = async function(alertId, adminId) {
  return await this.findByIdAndUpdate(
    alertId,
    {
      status: 'acknowledged',
      acknowledgedBy: adminId,
      acknowledgedAt: new Date(),
    },
    { new: true }
  );
};

// Static method to resolve alert
smartAlertSchema.statics.resolveAlert = async function(alertId, adminId, note) {
  return await this.findByIdAndUpdate(
    alertId,
    {
      status: 'resolved',
      resolvedBy: adminId,
      resolvedAt: new Date(),
      resolutionNote: note,
    },
    { new: true }
  );
};

// Static method to dismiss alert
smartAlertSchema.statics.dismissAlert = async function(alertId, adminId) {
  return await this.findByIdAndUpdate(
    alertId,
    {
      status: 'dismissed',
      resolvedBy: adminId,
      resolvedAt: new Date(),
    },
    { new: true }
  );
};

module.exports = mongoose.models.SmartAlert || mongoose.model('SmartAlert', smartAlertSchema);
