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
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin role
router.use(protect);
router.use(authorize(['admin']));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/notifications/stats', getNotificationStats);

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

module.exports = router;
