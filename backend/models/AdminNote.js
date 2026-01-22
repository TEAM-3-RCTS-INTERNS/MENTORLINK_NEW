const mongoose = require('mongoose');

const adminNoteSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    required: true,
    enum: ['user', 'mentor', 'student', 'session', 'request', 'event'],
    index: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isPrivate: {
    type: Boolean,
    default: false, // If true, only the author can see it
  },
  tags: [{
    type: String,
  }],
  editedAt: {
    type: Date,
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound indexes
adminNoteSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
adminNoteSchema.index({ authorId: 1, createdAt: -1 });

// Static method to add note
adminNoteSchema.statics.addNote = async function(data) {
  const note = await this.create(data);
  return await this.findById(note._id).populate('authorId', 'name email profileImage');
};

// Static method to get notes for a target
adminNoteSchema.statics.getNotesForTarget = async function(targetType, targetId, requesterId) {
  return await this.find({
    targetType,
    targetId,
    $or: [
      { isPrivate: false },
      { isPrivate: true, authorId: requesterId },
    ],
  })
    .populate('authorId', 'name email profileImage')
    .populate('editedBy', 'name email')
    .sort({ isPinned: -1, createdAt: -1 });
};

// Static method to update note
adminNoteSchema.statics.updateNote = async function(noteId, editorId, updates) {
  const note = await this.findByIdAndUpdate(
    noteId,
    {
      ...updates,
      editedAt: new Date(),
      editedBy: editorId,
    },
    { new: true }
  ).populate('authorId', 'name email profileImage');
  
  return note;
};

// Static method to delete note
adminNoteSchema.statics.deleteNote = async function(noteId, requesterId) {
  const note = await this.findById(noteId);
  
  if (!note) {
    throw new Error('Note not found');
  }
  
  // Only author can delete their note
  if (note.authorId.toString() !== requesterId.toString()) {
    throw new Error('Not authorized to delete this note');
  }
  
  await this.findByIdAndDelete(noteId);
  return { success: true };
};

module.exports = mongoose.models.AdminNote || mongoose.model('AdminNote', adminNoteSchema);
