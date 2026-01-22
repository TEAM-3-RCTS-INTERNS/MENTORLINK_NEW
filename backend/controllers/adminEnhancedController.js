const User = require('../models/User');
const Mentor = require('../models/Mentor');
const Student = require('../models/Student');
const Session = require('../models/Session');
const MentorshipRequest = require('../models/MentorshipRequest');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const AdminSession = require('../models/AdminSession');
const PendingAction = require('../models/PendingAction');
const AdminNote = require('../models/AdminNote');
const SavedFilter = require('../models/SavedFilter');
const SmartAlert = require('../models/SmartAlert');

// ==================== ADMIN SESSIONS ====================

// @desc    Get active admin sessions
// @route   GET /api/admin/sessions/active
// @access  Private (Admin)
const getActiveAdminSessions = async (req, res) => {
  try {
    const sessions = await AdminSession.getActiveSessions();
    
    res.json({ sessions });
  } catch (error) {
    console.error('Error in getActiveAdminSessions:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Force logout admin session
// @route   POST /api/admin/sessions/:sessionId/force-logout
// @access  Private (Admin)
const forceLogoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;
    
    const session = await AdminSession.findById(sessionId).populate('adminId', 'name email');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (!session.isActive) {
      return res.status(400).json({ message: 'Session is already inactive' });
    }
    
    await AdminSession.forceLogout(sessionId, req.user._id);
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'session.force_logout',
      'system',
      session.adminId._id,
      {
        before: { isActive: true },
        after: { isActive: false, forcedLogout: true },
      },
      req,
      {
        reason: reason || 'Administrative action',
        targetName: session.adminId.name,
        riskLevel: 'high',
      }
    );
    
    res.json({ message: 'Session logged out successfully' });
  } catch (error) {
    console.error('Error in forceLogoutSession:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== RE-AUTHENTICATION ====================

// @desc    Re-authenticate admin for sensitive actions
// @route   POST /api/admin/reauth
// @access  Private (Admin)
const reauthenticate = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    
    // Store re-auth timestamp in session
    const reauthTimestamp = Date.now();
    
    // Create audit log for reauth
    await AuditLog.createLog(
      req.user._id,
      'reauth.success',
      'system',
      req.user._id,
      {},
      req,
      {
        riskLevel: 'low',
      }
    );
    
    res.json({
      message: 'Re-authentication successful',
      reauthTimestamp,
      expiresIn: 15 * 60 * 1000, // 15 minutes
    });
  } catch (error) {
    console.error('Error in reauthenticate:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== PENDING ACTIONS (TWO-PERSON RULE) ====================

// @desc    Create pending action for critical operations
// @route   POST /api/admin/pending-actions
// @access  Private (Admin)
const createPendingAction = async (req, res) => {
  try {
    const { action, actionLabel, targetType, targetId, targetIds, targetName, reason, details } = req.body;
    
    if (!action || !reason) {
      return res.status(400).json({ message: 'Action and reason are required' });
    }
    
    const pendingAction = await PendingAction.createPendingAction({
      requestedBy: req.user._id,
      action,
      actionLabel: actionLabel || action,
      targetType,
      targetId,
      targetIds,
      targetName,
      reason,
      details,
    }, req);
    
    await pendingAction.populate('requestedBy', 'name email profileImage');
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'pending.create',
      'pending',
      pendingAction._id,
      { after: { action, targetType, targetName, reason } },
      req,
      {
        reason,
        targetName: `${action} - ${targetName}`,
        riskLevel: pendingAction.riskLevel,
      }
    );
    
    res.status(201).json({
      message: 'Pending action created. Awaiting approval.',
      pendingAction,
    });
  } catch (error) {
    console.error('Error in createPendingAction:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending actions for approval
// @route   GET /api/admin/pending-actions
// @access  Private (Admin)
const getPendingActions = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const actions = await PendingAction.find(query)
      .populate('requestedBy', 'name email profileImage')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PendingAction.countDocuments(query);
    
    // Get pending count for current admin (excluding own requests)
    const pendingForApproval = await PendingAction.countDocuments({
      status: 'pending',
      requestedBy: { $ne: req.user._id },
      expiresAt: { $gt: new Date() },
    });
    
    res.json({
      actions,
      pendingForApproval,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error in getPendingActions:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve pending action
// @route   POST /api/admin/pending-actions/:id/approve
// @access  Private (Admin)
const approvePendingAction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const action = await PendingAction.approveAction(id, req.user._id);
    await action.populate('requestedBy', 'name email');
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'pending.approve',
      'pending',
      action._id,
      {
        before: { status: 'pending' },
        after: { status: 'approved' },
      },
      req,
      {
        targetName: `${action.action} - ${action.targetName}`,
        riskLevel: action.riskLevel,
        metadata: {
          originalRequestedBy: action.requestedBy.name,
        },
      }
    );
    
    // Notify the requester
    await Notification.createNotification(action.requestedBy._id, {
      type: 'system',
      title: 'Action Approved',
      message: `Your request to ${action.actionLabel} has been approved. You may now execute the action.`,
      link: '/admin/pending-actions',
      icon: 'check-circle',
    });
    
    res.json({
      message: 'Action approved successfully',
      action,
    });
  } catch (error) {
    console.error('Error in approvePendingAction:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject pending action
// @route   POST /api/admin/pending-actions/:id/reject
// @access  Private (Admin)
const rejectPendingAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const action = await PendingAction.rejectAction(id, req.user._id, reason);
    await action.populate('requestedBy', 'name email');
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'pending.reject',
      'pending',
      action._id,
      {
        before: { status: 'pending' },
        after: { status: 'rejected', rejectionReason: reason },
      },
      req,
      {
        reason,
        targetName: `${action.action} - ${action.targetName}`,
        riskLevel: action.riskLevel,
      }
    );
    
    // Notify the requester
    await Notification.createNotification(action.requestedBy._id, {
      type: 'system',
      title: 'Action Rejected',
      message: `Your request to ${action.actionLabel} has been rejected. Reason: ${reason}`,
      link: '/admin/pending-actions',
      icon: 'x-circle',
    });
    
    res.json({
      message: 'Action rejected',
      action,
    });
  } catch (error) {
    console.error('Error in rejectPendingAction:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Execute approved action
// @route   POST /api/admin/pending-actions/:id/execute
// @access  Private (Admin)
const executePendingAction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const action = await PendingAction.findById(id);
    
    if (!action) {
      return res.status(404).json({ message: 'Pending action not found' });
    }
    
    if (action.status !== 'approved') {
      return res.status(400).json({ message: 'Action must be approved before execution' });
    }
    
    if (action.requestedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the requester can execute the action' });
    }
    
    // Execute the action based on type
    let result;
    switch (action.action) {
      case 'user.delete': {
        const userToDelete = await User.findById(action.targetId);
        if (userToDelete) {
          await User.findByIdAndDelete(action.targetId);
          // Also delete associated profiles
          await Mentor.deleteOne({ user: action.targetId });
          await Student.deleteOne({ user: action.targetId });
          result = { deleted: true, userId: action.targetId };
        }
        break;
      }
        
      case 'user.permanent_ban':
        await User.findByIdAndUpdate(action.targetId, {
          isVerified: false,
          isBanned: true,
          bannedAt: new Date(),
          banReason: action.reason,
        });
        result = { banned: true };
        break;
        
      case 'bulk.delete':
        if (action.targetIds && action.targetIds.length > 0) {
          await User.deleteMany({ _id: { $in: action.targetIds } });
          result = { deleted: action.targetIds.length };
        }
        break;
        
      default:
        return res.status(400).json({ message: 'Unknown action type' });
    }
    
    action.status = 'executed';
    action.executedAt = new Date();
    await action.save();
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      action.action,
      action.targetType,
      action.targetId,
      {
        after: result,
      },
      req,
      {
        reason: action.reason,
        targetName: action.targetName,
        riskLevel: action.riskLevel,
        metadata: {
          pendingActionId: action._id,
          approvedBy: action.approvedBy,
        },
      }
    );
    
    res.json({
      message: 'Action executed successfully',
      result,
    });
  } catch (error) {
    console.error('Error in executePendingAction:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== ADMIN NOTES ====================

// @desc    Add admin note
// @route   POST /api/admin/notes
// @access  Private (Admin)
const addAdminNote = async (req, res) => {
  try {
    const { targetType, targetId, content, priority, isPinned, isPrivate, tags } = req.body;
    
    if (!targetType || !targetId || !content) {
      return res.status(400).json({ message: 'Target type, target ID, and content are required' });
    }
    
    const note = await AdminNote.addNote({
      authorId: req.user._id,
      targetType,
      targetId,
      content,
      priority: priority || 'normal',
      isPinned: isPinned || false,
      isPrivate: isPrivate || false,
      tags: tags || [],
    });
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'note.add',
      'note',
      note._id,
      { after: { targetType, targetId, content: content.substring(0, 100) } },
      req,
      { riskLevel: 'low' }
    );
    
    res.status(201).json({
      message: 'Note added successfully',
      note,
    });
  } catch (error) {
    console.error('Error in addAdminNote:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notes for target
// @route   GET /api/admin/notes/:targetType/:targetId
// @access  Private (Admin)
const getNotesForTarget = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    
    const notes = await AdminNote.getNotesForTarget(targetType, targetId, req.user._id);
    
    res.json({ notes });
  } catch (error) {
    console.error('Error in getNotesForTarget:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update admin note
// @route   PATCH /api/admin/notes/:id
// @access  Private (Admin)
const updateAdminNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, priority, isPinned, isPrivate, tags } = req.body;
    
    const note = await AdminNote.findById(id);
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    const updatedNote = await AdminNote.updateNote(id, req.user._id, {
      content,
      priority,
      isPinned,
      isPrivate,
      tags,
    });
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'note.edit',
      'note',
      note._id,
      {
        before: { content: note.content.substring(0, 100) },
        after: { content: content?.substring(0, 100) },
      },
      req,
      { riskLevel: 'low' }
    );
    
    res.json({
      message: 'Note updated successfully',
      note: updatedNote,
    });
  } catch (error) {
    console.error('Error in updateAdminNote:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete admin note
// @route   DELETE /api/admin/notes/:id
// @access  Private (Admin)
const deleteAdminNote = async (req, res) => {
  try {
    const { id } = req.params;
    
    await AdminNote.deleteNote(id, req.user._id);
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'note.delete',
      'note',
      id,
      {},
      req,
      { riskLevel: 'low' }
    );
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAdminNote:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== SAVED FILTERS ====================

// @desc    Save filter
// @route   POST /api/admin/filters
// @access  Private (Admin)
const saveFilter = async (req, res) => {
  try {
    const { name, description, category, filters, isDefault, isShared, icon, color } = req.body;
    
    if (!name || !category || !filters) {
      return res.status(400).json({ message: 'Name, category, and filters are required' });
    }
    
    const savedFilter = await SavedFilter.createFilter({
      adminId: req.user._id,
      name,
      description,
      category,
      filters,
      isDefault: isDefault || false,
      isShared: isShared || false,
      icon: icon || '🔍',
      color: color || '#667eea',
    });
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'filter.save',
      'filter',
      savedFilter._id,
      { after: { name, category } },
      req,
      { riskLevel: 'low' }
    );
    
    res.status(201).json({
      message: 'Filter saved successfully',
      filter: savedFilter,
    });
  } catch (error) {
    console.error('Error in saveFilter:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get saved filters
// @route   GET /api/admin/filters?category=
// @access  Private (Admin)
const getSavedFilters = async (req, res) => {
  try {
    const { category } = req.query;
    
    const filters = await SavedFilter.getFiltersForAdmin(req.user._id, category);
    
    res.json({ filters });
  } catch (error) {
    console.error('Error in getSavedFilters:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Use filter (increment usage count)
// @route   POST /api/admin/filters/:id/use
// @access  Private (Admin)
const useFilter = async (req, res) => {
  try {
    const { id } = req.params;
    
    const filter = await SavedFilter.incrementUsage(id);
    
    if (!filter) {
      return res.status(404).json({ message: 'Filter not found' });
    }
    
    res.json({ filter });
  } catch (error) {
    console.error('Error in useFilter:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete filter
// @route   DELETE /api/admin/filters/:id
// @access  Private (Admin)
const deleteFilter = async (req, res) => {
  try {
    const { id } = req.params;
    
    await SavedFilter.deleteFilter(id, req.user._id);
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'filter.delete',
      'filter',
      id,
      {},
      req,
      { riskLevel: 'low' }
    );
    
    res.json({ message: 'Filter deleted successfully' });
  } catch (error) {
    console.error('Error in deleteFilter:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== SMART ALERTS ====================

// @desc    Get smart alerts
// @route   GET /api/admin/alerts
// @access  Private (Admin)
const getSmartAlerts = async (req, res) => {
  try {
    const { status } = req.query;
    
    let alerts;
    if (status === 'all') {
      alerts = await SmartAlert.find()
        .populate('acknowledgedBy', 'name')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(100);
    } else {
      alerts = await SmartAlert.getActiveAlerts();
    }
    
    const summary = await SmartAlert.getAlertsSummary();
    
    res.json({ alerts, summary });
  } catch (error) {
    console.error('Error in getSmartAlerts:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Acknowledge alert
// @route   POST /api/admin/alerts/:id/acknowledge
// @access  Private (Admin)
const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alert = await SmartAlert.acknowledgeAlert(id, req.user._id);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'alert.acknowledge',
      'alert',
      alert._id,
      {
        before: { status: 'active' },
        after: { status: 'acknowledged' },
      },
      req,
      {
        targetName: alert.title,
        riskLevel: 'low',
      }
    );
    
    res.json({
      message: 'Alert acknowledged',
      alert,
    });
  } catch (error) {
    console.error('Error in acknowledgeAlert:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resolve alert
// @route   POST /api/admin/alerts/:id/resolve
// @access  Private (Admin)
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    const alert = await SmartAlert.resolveAlert(id, req.user._id, note);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'alert.resolve',
      'alert',
      alert._id,
      {
        before: { status: alert.status },
        after: { status: 'resolved', resolutionNote: note },
      },
      req,
      {
        targetName: alert.title,
        riskLevel: 'low',
      }
    );
    
    res.json({
      message: 'Alert resolved',
      alert,
    });
  } catch (error) {
    console.error('Error in resolveAlert:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Dismiss alert
// @route   POST /api/admin/alerts/:id/dismiss
// @access  Private (Admin)
const dismissAlert = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alert = await SmartAlert.dismissAlert(id, req.user._id);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'alert.dismiss',
      'alert',
      alert._id,
      {
        before: { status: 'active' },
        after: { status: 'dismissed' },
      },
      req,
      {
        targetName: alert.title,
        riskLevel: 'low',
      }
    );
    
    res.json({
      message: 'Alert dismissed',
      alert,
    });
  } catch (error) {
    console.error('Error in dismissAlert:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate/check smart alerts
// @route   POST /api/admin/alerts/generate
// @access  Private (Admin)
const generateSmartAlerts = async (req, res) => {
  try {
    const alertsGenerated = [];
    
    // 1. Check for mentors with high cancellation rates
    const mentorsWithSessions = await Session.aggregate([
      {
        $group: {
          _id: '$mentor',
          totalSessions: { $sum: 1 },
          cancelledSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          mentorId: '$_id',
          totalSessions: 1,
          cancelledSessions: 1,
          cancellationRate: {
            $multiply: [
              { $divide: ['$cancelledSessions', { $max: ['$totalSessions', 1] }] },
              100,
            ],
          },
        },
      },
      {
        $match: {
          totalSessions: { $gte: 5 },
          cancellationRate: { $gte: 30 }, // 30% threshold
        },
      },
    ]);
    
    for (const mentor of mentorsWithSessions) {
      const mentorUser = await User.findById(mentor.mentorId).select('name email');
      if (mentorUser) {
        const alert = await SmartAlert.createAlert({
          type: 'high_cancellation_rate',
          severity: 'warning',
          title: 'High Cancellation Rate Detected',
          message: `Mentor ${mentorUser.name} has a ${mentor.cancellationRate.toFixed(1)}% cancellation rate (${mentor.cancelledSessions}/${mentor.totalSessions} sessions)`,
          targetType: 'mentor',
          targetId: mentor.mentorId,
          targetName: mentorUser.name,
          threshold: 30,
          currentValue: mentor.cancellationRate,
          metrics: {
            totalSessions: mentor.totalSessions,
            cancelledSessions: mentor.cancelledSessions,
          },
          link: `/admin/mentors/${mentor.mentorId}`,
        });
        alertsGenerated.push(alert);
      }
    }
    
    // 2. Check for sessions rescheduled frequently
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const frequentReschedules = await AuditLog.aggregate([
      {
        $match: {
          action: 'session.reschedule',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$targetId',
          rescheduleCount: { $sum: 1 },
        },
      },
      {
        $match: {
          rescheduleCount: { $gte: 3 }, // 3+ reschedules
        },
      },
    ]);
    
    for (const session of frequentReschedules) {
      const sessionDoc = await Session.findById(session._id)
        .populate('mentor', 'name')
        .populate('student', 'name');
      
      if (sessionDoc) {
        const alert = await SmartAlert.createAlert({
          type: 'frequent_reschedules',
          severity: 'info',
          title: 'Frequently Rescheduled Session',
          message: `Session between ${sessionDoc.mentor?.name || 'Unknown'} and ${sessionDoc.student?.name || 'Unknown'} has been rescheduled ${session.rescheduleCount} times`,
          targetType: 'session',
          targetId: session._id,
          threshold: 3,
          currentValue: session.rescheduleCount,
          link: `/admin/sessions/${session._id}`,
        });
        alertsGenerated.push(alert);
      }
    }
    
    // 3. Check for pending mentor approvals
    const unverifiedMentorUsers = await User.countDocuments({ role: 'mentor', isVerified: false });
    
    if (unverifiedMentorUsers > 0) {
      const alert = await SmartAlert.createAlert({
        type: 'pending_approvals',
        severity: 'info',
        title: 'Pending Mentor Approvals',
        message: `${unverifiedMentorUsers} mentor(s) are waiting for approval`,
        targetType: 'multiple',
        currentValue: unverifiedMentorUsers,
        link: '/admin/mentors?status=pending',
      });
      alertsGenerated.push(alert);
    }
    
    // 4. Check for critical pending actions
    const criticalPending = await PendingAction.countDocuments({
      status: 'pending',
      riskLevel: 'critical',
      expiresAt: { $gt: new Date() },
    });
    
    if (criticalPending > 0) {
      const alert = await SmartAlert.createAlert({
        type: 'pending_approvals',
        severity: 'critical',
        title: 'Critical Actions Pending Approval',
        message: `${criticalPending} critical action(s) require approval`,
        targetType: 'system',
        currentValue: criticalPending,
        link: '/admin/pending-actions',
      });
      alertsGenerated.push(alert);
    }
    
    const summary = await SmartAlert.getAlertsSummary();
    
    res.json({
      message: 'Smart alerts generated',
      alertsGenerated: alertsGenerated.length,
      summary,
    });
  } catch (error) {
    console.error('Error in generateSmartAlerts:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== GLOBAL SEARCH ====================

// @desc    Global admin search
// @route   GET /api/admin/search?q=
// @access  Private (Admin)
const globalSearch = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    const searchRegex = new RegExp(q, 'i');
    
    // Search users
    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
      ],
    })
      .select('name email role profileImage isVerified')
      .limit(parseInt(limit));
    
    // Search mentors
    const mentors = await Mentor.find({})
      .populate({
        path: 'user',
        match: {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
          ],
        },
        select: 'name email profileImage',
      })
      .limit(parseInt(limit));
    const filteredMentors = mentors.filter(m => m.user);
    
    // Search sessions
    const sessions = await Session.find({
      $or: [
        { topic: searchRegex },
        { notes: searchRegex },
      ],
    })
      .populate('mentor', 'name email')
      .populate('student', 'name email')
      .limit(parseInt(limit));
    
    // Search mentorship requests
    const requests = await MentorshipRequest.find({
      $or: [
        { message: searchRegex },
        { goals: searchRegex },
      ],
    })
      .populate('mentor', 'name email')
      .populate('student', 'name email')
      .limit(parseInt(limit));
    
    // Create audit log for search
    await AuditLog.createLog(
      req.user._id,
      'search.perform',
      'system',
      null,
      { after: { query: q } },
      req,
      { riskLevel: 'low' }
    );
    
    res.json({
      query: q,
      results: {
        users: users.map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          profileImage: u.profileImage,
          isVerified: u.isVerified,
          type: 'user',
          link: `/admin/users/${u._id}`,
        })),
        mentors: filteredMentors.map(m => ({
          _id: m._id,
          user: m.user,
          type: 'mentor',
          link: `/admin/mentors/${m._id}`,
        })),
        sessions: sessions.map(s => ({
          _id: s._id,
          topic: s.topic,
          mentor: s.mentor,
          student: s.student,
          status: s.status,
          date: s.date,
          type: 'session',
          link: `/admin/sessions/${s._id}`,
        })),
        requests: requests.map(r => ({
          _id: r._id,
          mentor: r.mentor,
          student: r.student,
          status: r.status,
          type: 'request',
          link: `/admin/requests/${r._id}`,
        })),
      },
      totals: {
        users: users.length,
        mentors: filteredMentors.length,
        sessions: sessions.length,
        requests: requests.length,
        total: users.length + filteredMentors.length + sessions.length + requests.length,
      },
    });
  } catch (error) {
    console.error('Error in globalSearch:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== BULK ACTIONS ====================

// @desc    Bulk deactivate users
// @route   POST /api/admin/bulk/deactivate
// @access  Private (Admin)
const bulkDeactivateUsers = async (req, res) => {
  try {
    const { userIds, reason } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs are required' });
    }
    
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required for bulk actions' });
    }
    
    // Max limit for bulk actions
    const MAX_BULK_LIMIT = 50;
    if (userIds.length > MAX_BULK_LIMIT) {
      return res.status(400).json({
        message: `Cannot process more than ${MAX_BULK_LIMIT} users at once`,
      });
    }
    
    // Don't allow deactivating admins
    const adminsInList = await User.countDocuments({
      _id: { $in: userIds },
      role: 'admin',
    });
    
    if (adminsInList > 0) {
      return res.status(400).json({ message: 'Cannot bulk deactivate admin users' });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { isVerified: false }
    );
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'bulk.deactivate',
      'bulk',
      null,
      {
        after: { userIds, count: result.modifiedCount },
      },
      req,
      {
        reason,
        targetIds: userIds,
        riskLevel: 'high',
        metadata: {
          affectedCount: result.modifiedCount,
        },
      }
    );
    
    res.json({
      message: `${result.modifiedCount} users deactivated`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error in bulkDeactivateUsers:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk approve mentors
// @route   POST /api/admin/bulk/approve-mentors
// @access  Private (Admin)
const bulkApproveMentors = async (req, res) => {
  try {
    const { mentorIds, reason } = req.body;
    
    if (!mentorIds || !Array.isArray(mentorIds) || mentorIds.length === 0) {
      return res.status(400).json({ message: 'Mentor IDs are required' });
    }
    
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required for bulk actions' });
    }
    
    const MAX_BULK_LIMIT = 50;
    if (mentorIds.length > MAX_BULK_LIMIT) {
      return res.status(400).json({
        message: `Cannot process more than ${MAX_BULK_LIMIT} mentors at once`,
      });
    }
    
    const mentors = await Mentor.find({ _id: { $in: mentorIds } }).select('user');
    const userIds = mentors.map(m => m.user);
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { isVerified: true }
    );
    
    // Send notifications to all approved mentors
    for (const mentor of mentors) {
      await Notification.createNotification(mentor.user, {
        type: 'request',
        title: 'Mentor Application Approved!',
        message: 'Congratulations! Your mentor application has been approved. You can now start mentoring students.',
        link: '/mentor-profile',
        icon: 'check-circle',
      });
    }
    
    // Create audit log
    await AuditLog.createLog(
      req.user._id,
      'bulk.approve',
      'bulk',
      null,
      {
        after: { mentorIds, count: result.modifiedCount },
      },
      req,
      {
        reason,
        targetIds: mentorIds,
        riskLevel: 'medium',
        metadata: {
          affectedCount: result.modifiedCount,
        },
      }
    );
    
    res.json({
      message: `${result.modifiedCount} mentors approved`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error in bulkApproveMentors:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== AUDIT LOG INTEGRITY ====================

// @desc    Verify audit log integrity
// @route   GET /api/admin/audit-logs/verify
// @access  Private (Admin)
const verifyAuditLogIntegrity = async (req, res) => {
  try {
    const { startSeq = 1, endSeq } = req.query;
    
    let end = parseInt(endSeq);
    if (!end) {
      const lastLog = await AuditLog.findOne().sort({ sequenceNumber: -1 });
      end = lastLog?.sequenceNumber || 1;
    }
    
    const result = await AuditLog.verifyIntegrity(parseInt(startSeq), end);
    
    res.json(result);
  } catch (error) {
    console.error('Error in verifyAuditLogIntegrity:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  // Admin Sessions
  getActiveAdminSessions,
  forceLogoutSession,
  
  // Re-authentication
  reauthenticate,
  
  // Pending Actions
  createPendingAction,
  getPendingActions,
  approvePendingAction,
  rejectPendingAction,
  executePendingAction,
  
  // Admin Notes
  addAdminNote,
  getNotesForTarget,
  updateAdminNote,
  deleteAdminNote,
  
  // Saved Filters
  saveFilter,
  getSavedFilters,
  useFilter,
  deleteFilter,
  
  // Smart Alerts
  getSmartAlerts,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  generateSmartAlerts,
  
  // Global Search
  globalSearch,
  
  // Bulk Actions
  bulkDeactivateUsers,
  bulkApproveMentors,
  
  // Audit Log Integrity
  verifyAuditLogIntegrity,
};
