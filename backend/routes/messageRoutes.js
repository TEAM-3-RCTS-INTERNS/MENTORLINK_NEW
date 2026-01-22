const express = require('express');
const {
  sendMessage,
  getConversations,
  getMessages,
  markAsRead,
  deleteMessage,
  getUnreadCount,
  searchMessages,
  uploadAttachment,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   POST /api/messages
// @desc    Send a new message
router.post('/', sendMessage);

// @route   POST /api/messages/upload
// @desc    Upload file/image for chat
router.post('/upload', upload.single('file'), uploadToCloudinary, uploadAttachment);

// @route   GET /api/messages/conversations
// @desc    Get all conversations
router.get('/conversations', getConversations);

// @route   GET /api/messages/unread-count
// @desc    Get unread message count
router.get('/unread-count', getUnreadCount);

// @route   GET /api/messages/search
// @desc    Search messages
router.get('/search', searchMessages);

// @route   GET /api/messages/:recipientId
// @desc    Get messages with a specific user
router.get('/:recipientId', getMessages);

// @route   PUT /api/messages/mark-read/:recipientId
// @desc    Mark all messages from a user as read
router.put('/mark-read/:recipientId', markAsRead);

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
router.delete('/:messageId', deleteMessage);

module.exports = router;
