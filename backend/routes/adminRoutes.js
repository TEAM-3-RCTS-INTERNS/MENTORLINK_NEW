const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');

const {
    getActiveAdminSessions,
    forceLogoutSession,
    reauthenticate,
    createPendingAction,
    getPendingActions,
    approvePendingAction,
    rejectPendingAction,
    executePendingAction,
    addAdminNote,
    getNotesForTarget,
    updateAdminNote,
    deleteAdminNote,
    saveFilter,
    getSavedFilters,
    useFilter,
    deleteFilter,
    getSmartAlerts,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    generateSmartAlerts,
    globalSearch,
    bulkDeactivateUsers,
    bulkApproveMentors,
    verifyAuditLogIntegrity,
} = require('../controllers/adminEnhancedController');

const { protect, authorize } = require('../middleware/auth');

// All routes require admin role
router.use(protect);
router.use(authorize(['admin']));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/stats', getDashboardStats); // Alias for frontend compatibility
router.get('/notifications/stats', getNotificationStats);

// Global Search
router.get('/search', globalSearch);

// Re-authentication
router.post('/reauth', reauthenticate);

// Admin Sessions
router.get('/admin-sessions/active', getActiveAdminSessions);
router.post('/admin-sessions/:sessionId/force-logout', forceLogoutSession);

// Pending Actions (Two-Person Rule)
router.get('/pending-actions', getPendingActions);
router.post('/pending-actions', createPendingAction);
router.post('/pending-actions/:id/approve', approvePendingAction);
router.post('/pending-actions/:id/reject', rejectPendingAction);
router.post('/pending-actions/:id/execute', executePendingAction);

// Admin Notes
router.get('/notes/:targetType/:targetId', getNotesForTarget);
router.post('/notes', addAdminNote);
router.patch('/notes/:id', updateAdminNote);
router.delete('/notes/:id', deleteAdminNote);

// Saved Filters
router.get('/filters', getSavedFilters);
router.post('/filters', saveFilter);
router.post('/filters/:id/use', useFilter);
router.delete('/filters/:id', deleteFilter);

// Smart Alerts
router.get('/alerts', getSmartAlerts);
router.post('/alerts/generate', generateSmartAlerts);
router.post('/alerts/:id/acknowledge', acknowledgeAlert);
router.post('/alerts/:id/resolve', resolveAlert);
router.post('/alerts/:id/dismiss', dismissAlert);

// Bulk Actions
router.post('/bulk/deactivate', bulkDeactivateUsers);
router.post('/bulk/approve-mentors', bulkApproveMentors);

// Users
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUserStatus);

// Mentors
router.get('/mentors', getAllMentors);
router.patch('/mentors/:id/approve', approveMentor);
router.patch('/mentors/:id/deny', denyMentor);

// Sessions
router.get('/sessions', getAllSessions);
router.post('/sessions/:id/cancel', cancelSession);
router.patch('/sessions/:id/reschedule', rescheduleSession);

// Connections
router.get('/connections', getAllConnectionRequests);

// Audit Logs
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/verify', verifyAuditLogIntegrity);

// Deleted Accounts Management
router.get('/deleted-accounts', getDeletedAccounts);
router.post('/deleted-accounts/:id/recover', recoverDeletedAccount);
router.delete('/deleted-accounts/:id/permanent', permanentlyDeleteAccount);

module.exports = router;
