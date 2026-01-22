const mongoose = require('mongoose');

const savedFilterSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  category: {
    type: String,
    required: true,
    enum: ['users', 'mentors', 'students', 'sessions', 'requests', 'audit-logs', 'alerts'],
    index: true,
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isShared: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    default: '🔍',
  },
  color: {
    type: String,
    default: '#667eea',
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
savedFilterSchema.index({ adminId: 1, category: 1 });
savedFilterSchema.index({ isShared: 1, category: 1 });

// Static method to get filters for admin
savedFilterSchema.statics.getFiltersForAdmin = async function(adminId, category) {
  const query = {
    $or: [
      { adminId },
      { isShared: true },
    ],
  };
  
  if (category) {
    query.category = category;
  }
  
  return await this.find(query)
    .populate('adminId', 'name')
    .sort({ isDefault: -1, usageCount: -1, createdAt: -1 });
};

// Static method to create filter
savedFilterSchema.statics.createFilter = async function(data) {
  const filter = await this.create(data);
  return filter;
};

// Static method to increment usage
savedFilterSchema.statics.incrementUsage = async function(filterId) {
  return await this.findByIdAndUpdate(
    filterId,
    {
      $inc: { usageCount: 1 },
      lastUsed: new Date(),
    },
    { new: true }
  );
};

// Static method to delete filter
savedFilterSchema.statics.deleteFilter = async function(filterId, adminId) {
  const filter = await this.findById(filterId);
  
  if (!filter) {
    throw new Error('Filter not found');
  }
  
  if (filter.adminId.toString() !== adminId.toString()) {
    throw new Error('Not authorized to delete this filter');
  }
  
  await this.findByIdAndDelete(filterId);
  return { success: true };
};

module.exports = mongoose.models.SavedFilter || mongoose.model('SavedFilter', savedFilterSchema);
