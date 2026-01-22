const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const MentorshipRequest = require('../models/MentorshipRequest');

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId, content, messageType = 'text', attachments = [] } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    if (messageType === 'text' && !content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Check if there's an accepted mentorship request between users
    const acceptedRequest = await MentorshipRequest.findOne({
      $or: [
        { mentor: senderId, student: recipientId, status: 'accepted' },
        { mentor: recipientId, student: senderId, status: 'accepted' }
      ]
    });

    if (!acceptedRequest) {
      return res.status(403).json({
        message: 'Messages can only be sent between accepted mentorship connections',
        error: 'NO_MENTORSHIP_CONNECTION'
      });
    }

    // Generate conversation ID
    const conversationId = Conversation.generateConversationId(senderId, recipientId);

    // Find or create conversation
    const conversation = await Conversation.findOrCreateConversation(senderId, recipientId);

    // Create message
    const message = await Message.create({
      conversationId,
      sender: senderId,
      recipient: recipientId,
      content,
      messageType,
      attachments,
    });

    // Populate sender info
    await message.populate('sender', 'name email profileImage');
    await message.populate('recipient', 'name email profileImage');

    // Update conversation
    conversation.lastMessage = {
      content: messageType === 'text' ? content : `Sent a ${messageType}`,
      sender: senderId,
      createdAt: message.createdAt,
      messageType,
    };
    conversation.lastMessageAt = message.createdAt;

    // Increment unread count for recipient
    const recipientUnread = conversation.unreadCount.get(recipientId.toString()) || 0;
    conversation.unreadCount.set(recipientId.toString(), recipientUnread + 1);

    await conversation.save();

    // Create notification for recipient
    await Notification.createNotification(recipientId, {
      type: 'message',
      title: 'New Message',
      message: `${req.user.name} sent you a message`,
      link: `/messages/${senderId}`,
      icon: 'message',
      data: {
        messageId: message._id,
        senderId: senderId,
      },
    });

    res.status(201).json({
      success: true,
      message: message,
      conversationId,
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all conversations for logged-in user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
      'isArchived': { $ne: { [userId.toString()]: true } },
    })
      .populate('participants', 'name email profileImage role')
      .populate('lastMessage.sender', 'name')
      .sort({ lastMessageAt: -1 })
      .limit(50);

    // Filter conversations to only include those with accepted mentorship connections
    const filteredConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipant = conv.participants.find(
          p => p._id.toString() !== userId.toString()
        );

        // Check if there's an accepted mentorship request
        const acceptedRequest = await MentorshipRequest.findOne({
          $or: [
            { mentor: userId, student: otherParticipant._id, status: 'accepted' },
            { mentor: otherParticipant._id, student: userId, status: 'accepted' }
          ]
        });

        if (acceptedRequest) {
          return {
            _id: conv._id,
            conversationId: Conversation.generateConversationId(userId, otherParticipant._id),
            participant: otherParticipant,
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt,
            unreadCount: conv.unreadCount.get(userId.toString()) || 0,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
          };
        }
        return null;
      })
    );

    // Remove null values (conversations without accepted mentorship)
    const formattedConversations = filteredConversations.filter(conv => conv !== null);

    res.json({
      conversations: formattedConversations,
      count: formattedConversations.length,
    });
  } catch (error) {
    console.error('Error in getConversations:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get messages in a conversation
// @route   GET /api/messages/:recipientId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { recipientId } = req.params;
    const { limit = 50, before } = req.query;

    // Check if there's an accepted mentorship request between users
    const acceptedRequest = await MentorshipRequest.findOne({
      $or: [
        { mentor: userId, student: recipientId, status: 'accepted' },
        { mentor: recipientId, student: userId, status: 'accepted' }
      ]
    });

    if (!acceptedRequest) {
      return res.status(403).json({
        message: 'You can only view messages with accepted mentorship connections',
        error: 'NO_MENTORSHIP_CONNECTION'
      });
    }

    // Generate conversation ID
    const conversationId = Conversation.generateConversationId(userId, recipientId);

    // Build query
    const query = {
      conversationId,
      isDeleted: false,
    };

    // Add pagination
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'name email profileImage')
      .populate('recipient', 'name email profileImage')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Reverse to show oldest first
    messages.reverse();

    res.json({
      messages,
      count: messages.length,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/mark-read/:recipientId
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { recipientId } = req.params;

    // Generate conversation ID
    const conversationId = Conversation.generateConversationId(userId, recipientId);

    // Update all unread messages from this sender
    await Message.updateMany(
      {
        conversationId,
        recipient: userId,
        sender: recipientId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    // Reset unread count in conversation
    const conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] },
    });

    if (conversation) {
      conversation.unreadCount.set(userId.toString(), 0);
      await conversation.save();
    }

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    // Soft delete: add user to deletedBy array
    if (!message.deletedBy) {
      message.deletedBy = [];
    }
    message.deletedBy.push(userId);

    // If both users deleted it, mark as fully deleted
    if (message.deletedBy.length === 2) {
      message.isDeleted = true;
    }

    await message.save();

    res.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    console.error('Error in deleteMessage:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread message count
// @route   GET /api/messages/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    });

    let totalUnread = 0;
    conversations.forEach(conv => {
      totalUnread += conv.unreadCount.get(userId.toString()) || 0;
    });

    res.json({
      unreadCount: totalUnread,
    });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search messages
// @route   GET /api/messages/search?q=query
// @access  Private
const searchMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ messages: [], count: 0 });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId },
      ],
      content: { $regex: q, $options: 'i' },
      isDeleted: false,
    })
      .populate('sender', 'name email profileImage')
      .populate('recipient', 'name email profileImage')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error('Error in searchMessages:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload attachment for chat
// @route   POST /api/messages/upload
// @access  Private
const uploadAttachment = async (req, res) => {
  try {
    if (!req.cloudinaryResult) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { secure_url, public_id, format, bytes, resource_type } = req.cloudinaryResult;

    res.status(200).json({
      success: true,
      url: secure_url,
      publicId: public_id,
      format,
      size: bytes,
      type: resource_type,
    });
  } catch (error) {
    console.error('Error in uploadAttachment:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessages,
  markAsRead,
  deleteMessage,
  getUnreadCount,
  searchMessages,
  uploadAttachment,
};
