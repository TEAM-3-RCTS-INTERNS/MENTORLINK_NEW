const User = require('../models/User');
const Mentor = require('../models/Mentor');
const Student = require('../models/Student');
const Session = require('../models/Session');
const MentorshipRequest = require('../models/MentorshipRequest');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// ==================== USER MANAGEMENT ====================

// @desc    Get all users with search, filter, and pagination
// @route   GET /api/admin/users?search=&status=&page=&limit=
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const { search, status, role, page = 1, limit = 20 } = req.query;

    const query = {};

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by role
    if (role && role !== 'all') {
      query.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-password -otp -otpExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get additional profile data based on role
    let profileData = null;
    if (user.role === 'mentor') {
      profileData = await Mentor.findOne({ user: id });
    } else if (user.role === 'student') {
      profileData = await Student.findOne({ user: id });
    }

    res.json({
      user,
      profileData,
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user status (activate/deactivate)
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const before = {
      isVerified: user.isVerified,
    };

    // Update fields
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    const after = {
      isVerified: user.isVerified,
    };

    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      `user.${isVerified ? 'activate' : 'deactivate'}`,
      'user',
      user._id,
      { before, after },
      req
    );

    res.json({
      message: 'User status updated successfully',
      user,
    });
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== MENTOR MANAGEMENT ====================

// @desc    Get all mentors with filters
// @route   GET /api/admin/mentors?status=&page=&limit=
// @access  Private (Admin)
const getAllMentors = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const mentors = await Mentor.find(query)
      .populate('user', 'name email profileImage bio location isVerified createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Mentor.countDocuments(query);

    res.json({
      mentors,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllMentors:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve mentor
// @route   PATCH /api/admin/mentors/:id/approve
// @access  Private (Admin)
const approveMentor = async (req, res) => {
  try {
    const { id } = req.params;

    const mentor = await Mentor.findById(id).populate('user', 'name email');

    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Mark user as verified
    const user = await User.findById(mentor.user._id);
    user.isVerified = true;
    await user.save();

    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'mentor.approve',
      'mentor',
      mentor._id,
      {
        before: { verified: false },
        after: { verified: true },
      },
      req
    );

    // Send notification to mentor
    await Notification.createNotification(mentor.user._id, {
      type: 'request',
      title: 'Mentor Application Approved!',
      message: 'Congratulations! Your mentor application has been approved. You can now start mentoring students.',
      link: '/mentor-profile',
      icon: 'check-circle',
    });

    res.json({
      message: 'Mentor approved successfully',
      mentor,
    });
  } catch (error) {
    console.error('Error in approveMentor:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deny mentor
// @route   PATCH /api/admin/mentors/:id/deny
// @access  Private (Admin)
const denyMentor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const mentor = await Mentor.findById(id).populate('user', 'name email');

    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'mentor.deny',
      'mentor',
      mentor._id,
      {
        reason: reason || 'No reason provided',
      },
      req
    );

    // Send notification to mentor
    await Notification.createNotification(mentor.user._id, {
      type: 'request',
      title: 'Mentor Application Update',
      message: reason || 'Your mentor application needs review. Please contact support for more information.',
      link: '/mentor-profile',
      icon: 'info',
    });

    res.json({
      message: 'Mentor application denied',
      mentor,
    });
  } catch (error) {
    console.error('Error in denyMentor:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== SESSION MANAGEMENT ====================

// @desc    Get all sessions
// @route   GET /api/admin/sessions?status=&page=&limit=
// @access  Private (Admin)
const getAllSessions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sessions = await Session.find(query)
      .populate('mentor student', 'name email profileImage')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Session.countDocuments(query);

    res.json({
      sessions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllSessions:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel session (admin)
// @route   POST /api/admin/sessions/:id/cancel
// @access  Private (Admin)
const cancelSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const session = await Session.findById(id).populate('mentor student', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const before = { status: session.status };
    session.status = 'cancelled';
    await session.save();

    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'session.cancel',
      'session',
      session._id,
      {
        before,
        after: { status: 'cancelled' },
        reason: reason || 'Cancelled by admin',
      },
      req
    );

    // Notify both participants
    const message = `Your session scheduled for ${new Date(session.date).toLocaleDateString()} has been cancelled by an administrator. Reason: ${reason || 'Administrative action'}`;

    await Notification.createNotification(session.mentor._id, {
      type: 'session',
      title: 'Session Cancelled by Admin',
      message,
      link: `/sessions`,
      icon: 'cancel',
    });

    await Notification.createNotification(session.student._id, {
      type: 'session',
      title: 'Session Cancelled by Admin',
      message,
      link: `/sessions`,
      icon: 'cancel',
    });

    res.json({
      message: 'Session cancelled successfully',
      session,
    });
  } catch (error) {
    console.error('Error in cancelSession:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reschedule session (admin)
// @route   PATCH /api/admin/sessions/:id/reschedule
// @access  Private (Admin)
const rescheduleSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, reason } = req.body;

    const session = await Session.findById(id).populate('mentor student', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const before = {
      date: session.date,
      time: session.time,
    };

    session.date = date || session.date;
    session.time = time || session.time;
    session.status = 'scheduled';
    await session.save();

    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'session.reschedule',
      'session',
      session._id,
      {
        before,
        after: { date: session.date, time: session.time },
        reason: reason || 'Rescheduled by admin',
      },
      req
    );

    // Notify both participants
    const message = `Your session has been rescheduled to ${new Date(session.date).toLocaleDateString()} at ${session.time}. Reason: ${reason || 'Administrative action'}`;

    await Notification.createNotification(session.mentor._id, {
      type: 'session',
      title: 'Session Rescheduled by Admin',
      message,
      link: `/sessions/${session._id}`,
      icon: 'calendar',
    });

    await Notification.createNotification(session.student._id, {
      type: 'session',
      title: 'Session Rescheduled by Admin',
      message,
      link: `/sessions/${session._id}`,
      icon: 'calendar',
    });

    res.json({
      message: 'Session rescheduled successfully',
      session,
    });
  } catch (error) {
    console.error('Error in rescheduleSession:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== CONNECTION REQUESTS AUDIT ====================

// @desc    Get all connection requests (audit log)
// @route   GET /api/admin/connections?status=&from=&to=&page=&limit=
// @access  Private (Admin)
const getAllConnectionRequests = async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await MentorshipRequest.find(query)
      .populate('student mentor', 'name email profileImage')
      .populate('studentProfile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MentorshipRequest.countDocuments(query);

    res.json({
      requests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllConnectionRequests:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== NOTIFICATIONS OVERVIEW ====================

// @desc    Get notification statistics
// @route   GET /api/admin/notifications/stats
// @access  Private (Admin)
const getNotificationStats = async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments({});
    const readNotifications = await Notification.countDocuments({ read: true });
    const unreadNotifications = await Notification.countDocuments({ read: false });

    // Get notifications by type
    const notificationsByType = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent notifications (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNotifications = await Notification.countDocuments({
      createdAt: { $gte: oneDayAgo },
    });

    // Get read rate
    const readRate = totalNotifications > 0 ? ((readNotifications / totalNotifications) * 100).toFixed(2) : 0;

    res.json({
      stats: {
        total: totalNotifications,
        read: readNotifications,
        unread: unreadNotifications,
        readRate: `${readRate}%`,
        recent24h: recentNotifications,
        byType: notificationsByType,
      },
    });
  } catch (error) {
    console.error('Error in getNotificationStats:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== AUDIT LOGS ====================

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs?adminId=&targetType=&action=&startDate=&endDate=&page=&limit=
// @access  Private (Admin)
const getAuditLogs = async (req, res) => {
  try {
    const { adminId, targetType, action, startDate, endDate, page, limit } = req.query;

    const result = await AuditLog.getLogs({
      adminId,
      targetType,
      action,
      startDate,
      endDate,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== DASHBOARD STATS ====================

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments({});
    const totalMentors = await User.countDocuments({ role: 'mentor' });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalOrganizers = await User.countDocuments({ role: 'organizer' });

    // Session statistics
    const totalSessions = await Session.countDocuments({});
    const scheduledSessions = await Session.countDocuments({ status: 'scheduled' });
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const cancelledSessions = await Session.countDocuments({ status: 'cancelled' });

    // Request statistics
    const totalRequests = await MentorshipRequest.countDocuments({});
    const pendingRequests = await MentorshipRequest.countDocuments({ status: 'pending' });
    const acceptedRequests = await MentorshipRequest.countDocuments({ status: 'accepted' });
    const rejectedRequests = await MentorshipRequest.countDocuments({ status: 'rejected' });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newSessionsThisWeek = await Session.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      users: {
        total: totalUsers,
        mentors: totalMentors,
        students: totalStudents,
        organizers: totalOrganizers,
        newThisWeek: newUsersThisWeek,
      },
      sessions: {
        total: totalSessions,
        scheduled: scheduledSessions,
        completed: completedSessions,
        cancelled: cancelledSessions,
        newThisWeek: newSessionsThisWeek,
      },
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        accepted: acceptedRequests,
        rejected: rejectedRequests,
      },
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== DELETED ACCOUNTS MANAGEMENT ====================

// @desc    Get all soft-deleted accounts
// @route   GET /api/admin/deleted-accounts
// @access  Private (Admin)
const getDeletedAccounts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const deletedUsers = await User.find({ isDeleted: true })
      .select('-password -otp -otpExpires')
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ isDeleted: true });

    // Calculate days remaining for each user
    const usersWithDaysRemaining = deletedUsers.map(user => {
      const now = new Date();
      const scheduledDeletion = new Date(user.scheduledPermanentDeletion);
      const daysRemaining = Math.max(0, Math.ceil((scheduledDeletion - now) / (1000 * 60 * 60 * 24)));
      return {
        ...user.toObject(),
        daysRemaining,
      };
    });

    res.json({
      deletedAccounts: usersWithDaysRemaining,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error in getDeletedAccounts:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Recover a soft-deleted account
// @route   POST /api/admin/deleted-accounts/:id/recover
// @access  Private (Admin)
const recoverDeletedAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isDeleted) {
      return res.status(400).json({ message: 'This account is not deleted' });
    }

    // Recover the account
    user.isDeleted = false;
    user.isVerified = true;
    user.recoveredAt = new Date();
    user.recoveredBy = req.user._id;
    // Keep deletion history for audit purposes but clear scheduled deletion
    user.scheduledPermanentDeletion = null;

    await user.save();

    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'user.recover',
      'user',
      user._id,
      { 
        recoveredAt: user.recoveredAt,
        originalDeletionDate: user.deletedAt,
        deletionReason: user.deletionReason 
      },
      req
    );

    res.json({
      message: 'Account recovered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        recoveredAt: user.recoveredAt,
      },
    });
  } catch (error) {
    console.error('Error in recoverDeletedAccount:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Permanently delete an account (admin action)
// @route   DELETE /api/admin/deleted-accounts/:id/permanent
// @access  Private (Admin)
const permanentlyDeleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Store user info for audit before deletion
    const userInfo = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      deletedAt: user.deletedAt,
      deletionReason: user.deletionReason,
    };

    // Delete associated data based on role
    const Mentor = require('../models/Mentor');
    const Student = require('../models/Student');
    
    if (user.role === 'mentor') {
      await Mentor.deleteOne({ user: id });
    } else if (user.role === 'student') {
      await Student.deleteOne({ user: id });
    }

    // Delete user
    await User.deleteOne({ _id: id });

    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'user.permanent_delete',
      'user',
      id,
      userInfo,
      req
    );

    res.json({
      message: 'Account permanently deleted',
      deletedUser: userInfo,
    });
  } catch (error) {
    console.error('Error in permanentlyDeleteAccount:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllMentors,
  approveMentor,
  denyMentor,
  getAllSessions,
  cancelSession,
  rescheduleSession,
  getAllConnectionRequests,
  getNotificationStats,
  getAuditLogs,
  getDashboardStats,
  getDeletedAccounts,
  recoverDeletedAccount,
  permanentlyDeleteAccount,
};
