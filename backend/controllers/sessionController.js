const Session = require('../models/Session');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private
const createSession = async (req, res) => {
  try {
    const { studentId, date, time, duration, timezone, zoomLink, password, notes, chatId } = req.body;
    const mentorId = req.user._id;

    // Validate required fields
    if (!studentId || !date || !time || !zoomLink) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Create session with notification
    const session = await Session.createSessionWithNotification(
      {
        mentor: mentorId,
        student: studentId,
        chatId,
        date,
        time,
        duration: duration || 30,
        timezone: timezone || 'GMT-05:00 (Eastern Time - US and Canada)',
        zoomLink,
        password,
        notes,
        createdBy: mentorId,
      },
      mentorId,
      studentId,
      student.name
    );

    // Populate student and mentor details
    await session.populate('student mentor', 'name email profileImage');

    res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all sessions for logged-in user
// @route   GET /api/sessions
// @access  Private
const getSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = {
      $or: [{ mentor: userId }, { student: userId }],
    };

    if (status) {
      query.status = status;
    }

    const sessions = await Session.find(query)
      .populate('mentor student', 'name email profileImage')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get sessions with a specific user
// @route   GET /api/sessions/with-user/:userId
// @access  Private
const getSessionsWithUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.params;

    const sessions = await Session.find({
      $or: [
        { mentor: currentUserId, student: userId },
        { mentor: userId, student: currentUserId },
      ],
    })
      .populate('mentor student', 'name email profileImage')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions with user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get session by ID
// @route   GET /api/sessions/:sessionId
// @access  Private
const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(sessionId)
      .populate('mentor student', 'name email profileImage');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is part of the session
    if (
      session.mentor._id.toString() !== userId.toString() &&
      session.student._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to view this session' });
    }

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update session status
// @route   PUT /api/sessions/:sessionId/status
// @access  Private
const updateSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const session = await Session.findById(sessionId)
      .populate('mentor student', 'name email profileImage');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is part of the session
    if (
      session.mentor._id.toString() !== userId.toString() &&
      session.student._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to update this session' });
    }

    const oldStatus = session.status;
    session.status = status;
    await session.save();

    // Get the other participant (who will receive the notification)
    const otherParticipantId =
      session.mentor._id.toString() === userId.toString()
        ? session.student._id
        : session.mentor._id;

    const otherParticipantName =
      session.mentor._id.toString() === userId.toString()
        ? session.student.name
        : session.mentor.name;

    // Send notification on status change
    if (oldStatus !== status) {
      let notificationMessage = '';

      if (status === 'cancelled') {
        notificationMessage = `Your session scheduled for ${new Date(session.date).toLocaleDateString()} at ${session.time} has been cancelled`;
      } else if (status === 'completed') {
        notificationMessage = `Session on ${new Date(session.date).toLocaleDateString()} has been marked as completed`;
      } else if (status === 'scheduled') {
        notificationMessage = `Session on ${new Date(session.date).toLocaleDateString()} has been rescheduled`;
      }

      if (notificationMessage) {
        await Notification.createNotification(otherParticipantId, {
          type: 'session',
          title: `Session ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: notificationMessage,
          link: `/sessions/${session._id}`,
          icon: status === 'cancelled' ? 'cancel' : 'calendar',
          data: {
            sessionId: session._id,
            status: status,
            updatedBy: userId,
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:sessionId
// @access  Private
const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(sessionId)
      .populate('mentor student', 'name email profileImage');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only creator can delete
    if (session.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this session' });
    }

    // Get the other participant to notify them
    const otherParticipantId =
      session.mentor._id.toString() === userId.toString()
        ? session.student._id
        : session.mentor._id;

    const currentUserName =
      session.mentor._id.toString() === userId.toString()
        ? session.mentor.name
        : session.student.name;

    // Send cancellation notification to the other participant
    await Notification.createNotification(otherParticipantId, {
      type: 'session',
      title: 'Session Cancelled',
      message: `${currentUserName} has cancelled the session scheduled for ${new Date(session.date).toLocaleDateString()} at ${session.time}`,
      link: `/sessions`,
      icon: 'cancel',
      data: {
        sessionId: session._id,
        cancelledBy: userId,
      },
    });

    await session.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionsWithUser,
  getSessionById,
  updateSessionStatus,
  deleteSession,
};
