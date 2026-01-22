import React, { useState, useEffect } from 'react';
import HomeNavbar from '../components/common/HomeNavbar';
import Sidebar from '../components/home/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import {
    RenderAlerts,
    RenderPendingActions,
    RenderAdminSessions,
    RenderAuditLogs,
    ReauthModal,
    NoteModal,
} from '../components/admin/AdminComponents';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user: _user } = useAuth();
    const { sidebarCollapsed } = useLayout();
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    
    // New state for enhanced features
    const [alerts, setAlerts] = useState([]);
    const [alertsSummary, setAlertsSummary] = useState(null);
    const [pendingActions, setPendingActions] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [adminSessions, setAdminSessions] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [_savedFilters, _setSavedFilters] = useState([]);
    const [showReauthModal, setShowReauthModal] = useState(false);
    const [reauthPassword, setReauthPassword] = useState('');
    const [_reauthTimestamp, setReauthTimestamp] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [_notes, _setNotes] = useState([]);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [selectedTarget, setSelectedTarget] = useState(null);

    useEffect(() => {
        fetchStats();
        fetchAlerts();
        fetchPendingActions();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'sessions') {
            fetchAdminSessions();
        } else if (activeTab === 'audit-logs') {
            fetchAuditLogs();
        } else if (activeTab === 'pending-actions') {
            fetchPendingActions();
        } else if (activeTab === 'alerts') {
            fetchAlerts();
        }
    }, [activeTab, page, searchTerm, roleFilter]);

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const roleParam = roleFilter !== 'all' ? `&role=${roleFilter}` : '';
            const response = await fetch(`http://localhost:5000/api/admin/users?page=${page}&search=${searchTerm}${roleParam}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setUsers(data.users || []);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlerts = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/alerts', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setAlerts(data.alerts || []);
            setAlertsSummary(data.summary);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const fetchPendingActions = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/pending-actions', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setPendingActions(data.actions || []);
            setPendingCount(data.pendingForApproval || 0);
        } catch (error) {
            console.error('Error fetching pending actions:', error);
        }
    };

    const fetchAdminSessions = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/admin-sessions/active', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setAdminSessions(data.sessions || []);
        } catch (error) {
            console.error('Error fetching admin sessions:', error);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/audit-logs?page=${page}&limit=50`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setAuditLogs(data.logs || []);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }
    };

    const handleReauthenticate = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/reauth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ password: reauthPassword })
            });
            
            if (response.ok) {
                const data = await response.json();
                setReauthTimestamp(data.reauthTimestamp);
                setShowReauthModal(false);
                setReauthPassword('');
                alert('Re-authentication successful! You can now perform sensitive actions.');
            } else {
                alert('Invalid password. Please try again.');
            }
        } catch (error) {
            console.error('Error re-authenticating:', error);
            alert('Re-authentication failed');
        }
    };

    const handleBulkDeactivate = async () => {
        if (selectedUsers.length === 0) {
            alert('Please select users to deactivate');
            return;
        }
        
        const reason = prompt('Please provide a reason for bulk deactivation:');
        if (!reason) return;
        
        if (!window.confirm(`Are you sure you want to deactivate ${selectedUsers.length} user(s)?`)) return;
        
        try {
            const response = await fetch('http://localhost:5000/api/admin/bulk/deactivate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userIds: selectedUsers, reason })
            });
            
            if (response.ok) {
                alert('Users deactivated successfully');
                setSelectedUsers([]);
                fetchUsers();
                fetchStats();
            }
        } catch (error) {
            console.error('Error bulk deactivating:', error);
        }
    };

    const handleAcknowledgeAlert = async (alertId) => {
        try {
            await fetch(`http://localhost:5000/api/admin/alerts/${alertId}/acknowledge`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchAlerts();
        } catch (error) {
            console.error('Error acknowledging alert:', error);
        }
    };

    const handleResolveAlert = async (alertId) => {
        const note = prompt('Resolution note (optional):');
        try {
            await fetch(`http://localhost:5000/api/admin/alerts/${alertId}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ note })
            });
            fetchAlerts();
        } catch (error) {
            console.error('Error resolving alert:', error);
        }
    };

    const handleGenerateAlerts = async () => {
        try {
            await fetch('http://localhost:5000/api/admin/alerts/generate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchAlerts();
            alert('Smart alerts generated successfully');
        } catch (error) {
            console.error('Error generating alerts:', error);
        }
    };

    const handleApproveAction = async (actionId) => {
        if (!window.confirm('Are you sure you want to approve this action?')) return;
        
        try {
            await fetch(`http://localhost:5000/api/admin/pending-actions/${actionId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            alert('Action approved');
            fetchPendingActions();
        } catch (error) {
            console.error('Error approving action:', error);
            alert(error.message);
        }
    };

    const handleRejectAction = async (actionId) => {
        const reason = prompt('Reason for rejection:');
        if (!reason) return;
        
        try {
            await fetch(`http://localhost:5000/api/admin/pending-actions/${actionId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reason })
            });
            alert('Action rejected');
            fetchPendingActions();
        } catch (error) {
            console.error('Error rejecting action:', error);
        }
    };

    const handleForceLogout = async (sessionId) => {
        if (!window.confirm('Are you sure you want to force logout this session?')) return;
        
        const reason = prompt('Reason for forced logout:');
        
        try {
            await fetch(`http://localhost:5000/api/admin/admin-sessions/${sessionId}/force-logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reason })
            });
            alert('Session logged out');
            fetchAdminSessions();
        } catch (error) {
            console.error('Error forcing logout:', error);
        }
    };

    const handleAddNote = async (targetType, targetId) => {
        setSelectedTarget({ type: targetType, id: targetId });
        setShowNoteModal(true);
    };

    const handleSaveNote = async () => {
        if (!noteContent || !selectedTarget) return;
        
        try {
            await fetch('http://localhost:5000/api/admin/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    targetType: selectedTarget.type,
                    targetId: selectedTarget.id,
                    content: noteContent,
                    priority: 'normal'
                })
            });
            
            alert('Note added successfully');
            setShowNoteModal(false);
            setNoteContent('');
            setSelectedTarget(null);
        } catch (error) {
            console.error('Error adding note:', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetchUsers();
            fetchStats();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const getRiskLevelColor = (level) => {
        switch (level) {
            case 'critical': return '#dc2626';
            case 'high': return '#ea580c';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return '#dc2626';
            case 'warning': return '#f59e0b';
            case 'info': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    const renderOverview = () => {
        if (!stats) return <div className="loading-state">Loading statistics...</div>;

        return (
            <div className="overview-section">
                {/* Smart Alerts Banner */}
                {alertsSummary && alertsSummary.total > 0 && (
                    <div className="alerts-banner">
                        <div className="alerts-banner-content">
                            <div className="alerts-info">
                                <h4>Smart Alerts Active</h4>
                                <p>
                                    {alertsSummary.critical > 0 && <span className="alert-critical">{alertsSummary.critical} Critical</span>}
                                    {alertsSummary.warning > 0 && <span className="alert-warning">{alertsSummary.warning} Warning</span>}
                                    {alertsSummary.info > 0 && <span className="alert-info">{alertsSummary.info} Info</span>}
                                </p>
                            </div>
                            <button onClick={() => setActiveTab('alerts')} className="view-alerts-btn">
                                View Alerts
                            </button>
                        </div>
                    </div>
                )}

                {/* Pending Actions Banner */}
                {pendingCount > 0 && (
                    <div className="pending-banner">
                        <div className="pending-banner-content">
                            <div className="pending-info">
                                <h4>{pendingCount} Pending Action{pendingCount !== 1 ? 's' : ''} Awaiting Approval</h4>
                                <p>Critical actions require your approval</p>
                            </div>
                            <button onClick={() => setActiveTab('pending-actions')} className="view-pending-btn">
                                Review Now
                            </button>
                        </div>
                    </div>
                )}

                {/* Quick Stats */}
                <div className="stats-grid">
                    <div className="stat-card stat-total">
                        <div className="stat-content">
                            <h3>Total Users</h3>
                            <p className="stat-value">{stats.users?.total || 0}</p>
                            <span className="stat-change positive">+{stats.users?.newThisWeek || 0} this week</span>
                        </div>
                    </div>
                    <div className="stat-card stat-mentors">
                        <div className="stat-content">
                            <h3>Mentors</h3>
                            <p className="stat-value">{stats.users?.mentors || 0}</p>
                        </div>
                    </div>
                    <div className="stat-card stat-students">
                        <div className="stat-content">
                            <h3>Students</h3>
                            <p className="stat-value">{stats.users?.students || 0}</p>
                        </div>
                    </div>
                    <div className="stat-card stat-organizers">
                        <div className="stat-content">
                            <h3>Event Organizers</h3>
                            <p className="stat-value">{stats.users?.organizers || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Analytics Section */}
                <div className="analytics-section">
                    <h2 className="section-title">Analytics Overview</h2>

                    <div className="analytics-grid">
                        {/* User Distribution */}
                        <div className="analytics-card">
                            <h3>User Distribution</h3>
                            <div className="distribution-chart">
                                <div className="bar-chart">
                                    <div className="bar-item">
                                        <span className="bar-label">Mentors</span>
                                        <div className="bar-container">
                                            <div
                                                className="bar bar-mentor"
                                                style={{
                                                    width: `${stats.users?.total > 0 ? (stats.users?.mentors / stats.users?.total * 100) : 0}%`
                                                }}
                                            ></div>
                                        </div>
                                        <span className="bar-value">{stats.users?.mentors || 0}</span>
                                    </div>
                                    <div className="bar-item">
                                        <span className="bar-label">Students</span>
                                        <div className="bar-container">
                                            <div
                                                className="bar bar-student"
                                                style={{
                                                    width: `${stats.users?.total > 0 ? (stats.users?.students / stats.users?.total * 100) : 0}%`
                                                }}
                                            ></div>
                                        </div>
                                        <span className="bar-value">{stats.users?.students || 0}</span>
                                    </div>
                                    <div className="bar-item">
                                        <span className="bar-label">Organizers</span>
                                        <div className="bar-container">
                                            <div
                                                className="bar bar-organizer"
                                                style={{
                                                    width: `${stats.users?.total > 0 ? (stats.users?.organizers / stats.users?.total * 100) : 0}%`
                                                }}
                                            ></div>
                                        </div>
                                        <span className="bar-value">{stats.users?.organizers || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Session Stats */}
                        <div className="analytics-card">
                            <h3>Session Statistics</h3>
                            <div className="session-stats">
                                <div className="session-stat-item">
                                    <div className="session-stat-number">{stats.sessions?.total || 0}</div>
                                    <div className="session-stat-label">Total Sessions</div>
                                </div>
                                <div className="session-stat-item">
                                    <div className="session-stat-number success">{stats.sessions?.completed || 0}</div>
                                    <div className="session-stat-label">Completed</div>
                                </div>
                                <div className="session-stat-item">
                                    <div className="session-stat-number warning">{stats.sessions?.scheduled || 0}</div>
                                    <div className="session-stat-label">Scheduled</div>
                                </div>
                                <div className="session-stat-item">
                                    <div className="session-stat-number danger">{stats.sessions?.cancelled || 0}</div>
                                    <div className="session-stat-label">Cancelled</div>
                                </div>
                            </div>
                        </div>

                        {/* Mentorship Requests */}
                        <div className="analytics-card">
                            <h3>Mentorship Requests</h3>
                            <div className="requests-stats">
                                <div className="request-stat">
                                    <span className="request-label">Total Requests</span>
                                    <span className="request-value">{stats.requests?.total || 0}</span>
                                </div>
                                <div className="request-stat">
                                    <span className="request-label pending">Pending</span>
                                    <span className="request-value">{stats.requests?.pending || 0}</span>
                                </div>
                                <div className="request-stat">
                                    <span className="request-label accepted">Accepted</span>
                                    <span className="request-value">{stats.requests?.accepted || 0}</span>
                                </div>
                                <div className="request-stat">
                                    <span className="request-label rejected">Rejected</span>
                                    <span className="request-value">{stats.requests?.rejected || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Activity */}
                        <div className="analytics-card">
                            <h3>This Week's Activity</h3>
                            <div className="weekly-stats">
                                <div className="weekly-item">
                                    <div className="weekly-content">
                                        <span className="weekly-value">{stats.users?.newThisWeek || 0}</span>
                                        <span className="weekly-label">New Users</span>
                                    </div>
                                </div>
                                <div className="weekly-item">
                                    <div className="weekly-content">
                                        <span className="weekly-value">{stats.sessions?.newThisWeek || 0}</span>
                                        <span className="weekly-label">New Sessions</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUserManagement = () => {
        return (
            <div className="users-section">
                <div className="users-controls">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="role-filter"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="mentor">Mentor</option>
                        <option value="student">Student</option>
                        <option value="organizer">Event Organizer</option>
                    </select>
                    {selectedUsers.length > 0 && (
                        <button onClick={handleBulkDeactivate} className="bulk-action-btn">
                            Bulk Deactivate ({selectedUsers.length})
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="loading-state">Loading users...</div>
                ) : (
                    <>
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUsers(users.filter(u => u.role !== 'admin').map(u => u._id));
                                                } else {
                                                    setSelectedUsers([]);
                                                }
                                            }}
                                        />
                                    </th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? users.map(u => (
                                    <tr key={u._id}>
                                        <td>
                                            {u.role !== 'admin' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(u._id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedUsers([...selectedUsers, u._id]);
                                                        } else {
                                                            setSelectedUsers(selectedUsers.filter(id => id !== u._id));
                                                        }
                                                    }}
                                                />
                                            )}
                                        </td>
                                        <td>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className="role-badge">{u.role}</span>
                                        </td>
                                        <td>
                                            {u.isVerified ? (
                                                <span className="status-pill status-active">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="status-pill status-inactive">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="note-btn"
                                                    type="button"
                                                    onClick={() => handleAddNote('user', u._id)}
                                                    title="Add Note"
                                                >
                                                    Note
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    type="button"
                                                    onClick={() => handleDeleteUser(u._id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="no-data">No users found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {pagination && pagination.pages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="pagination-btn"
                                >
                                    Previous
                                </button>
                                <span className="pagination-info">
                                    Page {page} of {pagination.pages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                    disabled={page === pagination.pages}
                                    className="pagination-btn"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="admin-dashboard-page">
            <HomeNavbar />
            <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
                <Sidebar />
                <div className="admin-content">
                    <div className="admin-header">
                        <h1>Admin Dashboard - Enhanced Security & Management</h1>
                        <div className="admin-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                Overview
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
                                onClick={() => setActiveTab('alerts')}
                            >
                                Alerts {alertsSummary?.total > 0 && <span className="badge">{alertsSummary.total}</span>}
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'pending-actions' ? 'active' : ''}`}
                                onClick={() => setActiveTab('pending-actions')}
                            >
                                Pending {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                                onClick={() => setActiveTab('users')}
                            >
                                Users
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
                                onClick={() => setActiveTab('sessions')}
                            >
                                Sessions
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'audit-logs' ? 'active' : ''}`}
                                onClick={() => setActiveTab('audit-logs')}
                            >
                                Audit Logs
                            </button>
                        </div>
                    </div>

                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'users' && renderUserManagement()}
                    {activeTab === 'alerts' && (
                        <RenderAlerts
                            alerts={alerts}
                            onAcknowledge={handleAcknowledgeAlert}
                            onResolve={handleResolveAlert}
                            onGenerate={handleGenerateAlerts}
                            getSeverityColor={getSeverityColor}
                        />
                    )}
                    {activeTab === 'pending-actions' && (
                        <RenderPendingActions
                            pendingActions={pendingActions}
                            onApprove={handleApproveAction}
                            onReject={handleRejectAction}
                            getRiskLevelColor={getRiskLevelColor}
                        />
                    )}
                    {activeTab === 'sessions' && (
                        <RenderAdminSessions
                            sessions={adminSessions}
                            onForceLogout={handleForceLogout}
                        />
                    )}
                    {activeTab === 'audit-logs' && (
                        <RenderAuditLogs
                            logs={auditLogs}
                            pagination={pagination}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <ReauthModal
                show={showReauthModal}
                password={reauthPassword}
                setPassword={setReauthPassword}
                onSubmit={handleReauthenticate}
                onClose={() => setShowReauthModal(false)}
            />
            
            <NoteModal
                show={showNoteModal}
                content={noteContent}
                setContent={setNoteContent}
                onSave={handleSaveNote}
                onClose={() => {
                    setShowNoteModal(false);
                    setNoteContent('');
                    setSelectedTarget(null);
                }}
            />
        </div>
    );
};

export default AdminDashboard;
