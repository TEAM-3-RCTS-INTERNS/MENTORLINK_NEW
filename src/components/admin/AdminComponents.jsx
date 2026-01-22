import React from 'react';

export const RenderAlerts = ({ alerts, onAcknowledge, onResolve, onGenerate, getSeverityColor }) => {
    return (
        <div className="alerts-section">
            <div className="section-header">
                <h2>🚨 Smart Alerts & Flags</h2>
                <button onClick={onGenerate} className="generate-btn">
                    Generate Alerts
                </button>
            </div>

            {alerts.length === 0 ? (
                <div className="no-data-card">
                    <p>✅ No active alerts</p>
                </div>
            ) : (
                <div className="alerts-list">
                    {alerts.map(alert => (
                        <div key={alert._id} className="alert-card" style={{ borderLeft: `4px solid ${getSeverityColor(alert.severity)}` }}>
                            <div className="alert-header">
                                <div className="alert-title">
                                    <span className="alert-icon">{alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                                    <h4>{alert.title}</h4>
                                </div>
                                <span className="alert-severity" style={{ backgroundColor: getSeverityColor(alert.severity) }}>
                                    {alert.severity}
                                </span>
                            </div>
                            <p className="alert-message">{alert.message}</p>
                            {alert.metrics && (
                                <div className="alert-metrics">
                                    <span>Current: {alert.currentValue}</span>
                                    {alert.threshold && <span>Threshold: {alert.threshold}</span>}
                                </div>
                            )}
                            <div className="alert-actions">
                                <span className="alert-time">{new Date(alert.createdAt).toLocaleString()}</span>
                                <div className="alert-buttons">
                                    {alert.status === 'active' && (
                                        <>
                                            <button onClick={() => onAcknowledge(alert._id)} className="ack-btn">
                                                Acknowledge
                                            </button>
                                            <button onClick={() => onResolve(alert._id)} className="resolve-btn">
                                                Resolve
                                            </button>
                                        </>
                                    )}
                                    {alert.status === 'acknowledged' && (
                                        <button onClick={() => onResolve(alert._id)} className="resolve-btn">
                                            Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const RenderPendingActions = ({ pendingActions, onApprove, onReject, getRiskLevelColor }) => {
    return (
        <div className="pending-actions-section">
            <div className="section-header">
                <h2>⏳ Pending Actions (Two-Person Rule)</h2>
                <p className="section-subtitle">Critical actions require approval from another admin</p>
            </div>

            {pendingActions.length === 0 ? (
                <div className="no-data-card">
                    <p>No pending actions</p>
                </div>
            ) : (
                <div className="pending-list">
                    {pendingActions.map(action => (
                        <div key={action._id} className="pending-card">
                            <div className="pending-header">
                                <div>
                                    <h4>{action.actionLabel}</h4>
                                    <span className="risk-badge" style={{ backgroundColor: getRiskLevelColor(action.riskLevel) }}>
                                        {action.riskLevel} risk
                                    </span>
                                </div>
                                <span className="status-badge status-pending">{action.status}</span>
                            </div>
                            
                            <div className="pending-details">
                                <div className="detail-row">
                                    <span className="detail-label">Requested by:</span>
                                    <span className="detail-value">{action.requestedBy?.name}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Target:</span>
                                    <span className="detail-value">{action.targetName || action.targetType}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Reason:</span>
                                    <span className="detail-value">{action.reason}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Expires:</span>
                                    <span className="detail-value">{new Date(action.expiresAt).toLocaleString()}</span>
                                </div>
                            </div>

                            {action.status === 'pending' && action.requestedBy._id !== action._id && (
                                <div className="pending-actions">
                                    <button onClick={() => onApprove(action._id)} className="approve-action-btn">
                                        ✓ Approve
                                    </button>
                                    <button onClick={() => onReject(action._id)} className="reject-action-btn">
                                        ✗ Reject
                                    </button>
                                </div>
                            )}
                            
                            {action.status === 'approved' && (
                                <div className="approved-message">
                                    ✓ Approved by {action.approvedBy?.name} on {new Date(action.approvedAt).toLocaleString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const RenderAdminSessions = ({ sessions, onForceLogout }) => {
    return (
        <div className="admin-sessions-section">
            <div className="section-header">
                <h2>👤 Active Admin Sessions</h2>
                <p className="section-subtitle">Monitor and manage active administrator sessions</p>
            </div>

            {sessions.length === 0 ? (
                <div className="no-data-card">
                    <p>No active admin sessions</p>
                </div>
            ) : (
                <div className="sessions-table-container">
                    <table className="sessions-table">
                        <thead>
                            <tr>
                                <th>Admin</th>
                                <th>IP Address</th>
                                <th>Device</th>
                                <th>Browser</th>
                                <th>Last Activity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(session => (
                                <tr key={session._id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-small">
                                                {session.adminId?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="user-name">{session.adminId?.name}</div>
                                                <div className="user-email">{session.adminId?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{session.ipAddress}</td>
                                    <td>
                                        <span className="device-badge">{session.device}</span>
                                    </td>
                                    <td>{session.browser}</td>
                                    <td>{new Date(session.lastActivity).toLocaleString()}</td>
                                    <td>
                                        <button 
                                            onClick={() => onForceLogout(session._id)}
                                            className="force-logout-btn"
                                        >
                                            Force Logout
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export const RenderAuditLogs = ({ logs, pagination }) => {
    return (
        <div className="audit-logs-section">
            <div className="section-header">
                <h2>📋 Audit Logs</h2>
                <p className="section-subtitle">Complete tamper-resistant activity log</p>
            </div>

            {logs.length === 0 ? (
                <div className="no-data-card">
                    <p>No audit logs</p>
                </div>
            ) : (
                <>
                    <div className="audit-logs-list">
                        {logs.map(log => (
                            <div key={log._id} className="audit-log-card">
                                <div className="log-header">
                                    <div className="log-admin">
                                        <strong>{log.adminName}</strong>
                                    </div>
                                    <span className="log-time">{new Date(log.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="log-action">
                                    {log.humanReadable}
                                </div>
                                {log.reason && (
                                    <div className="log-reason">
                                        <span className="reason-label">Reason:</span> {log.reason}
                                    </div>
                                )}
                                {log.changes?.diff && log.changes.diff.length > 0 && (
                                    <div className="log-diff">
                                        <details>
                                            <summary>View Changes</summary>
                                            <div className="diff-viewer">
                                                {log.changes.diff.map((change, idx) => (
                                                    <div key={idx} className="diff-item">
                                                        <span className="diff-field">{change.field}:</span>
                                                        <span className="diff-old">{JSON.stringify(change.oldValue)}</span>
                                                        <span className="diff-arrow">→</span>
                                                        <span className="diff-new">{JSON.stringify(change.newValue)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                )}
                                <div className="log-meta">
                                    <span className="log-risk" style={{ 
                                        backgroundColor: log.riskLevel === 'critical' ? '#dc2626' : 
                                                        log.riskLevel === 'high' ? '#ea580c' :
                                                        log.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                                    }}>
                                        {log.riskLevel}
                                    </span>
                                    <span className="log-ip">IP: {log.ipAddress}</span>
                                    <span className="log-seq">Seq: #{log.sequenceNumber}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {pagination && pagination.pages > 1 && (
                        <div className="pagination">
                            <span>Page {pagination.page} of {pagination.pages}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export const RenderGlobalSearch = ({ searchQuery, setSearchQuery, onSearch, results }) => {
    return (
        <div className="global-search-section">
            <div className="search-box-container">
                <input
                    type="text"
                    placeholder="🔍 Global search: users, mentors, sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                    className="global-search-input"
                />
                <button onClick={onSearch} className="search-btn">Search</button>
            </div>

            {results && (
                <div className="search-results">
                    <h3>Search Results for "{results.query}"</h3>
                    <div className="results-summary">
                        <span>{results.totals.users} users</span>
                        <span>{results.totals.mentors} mentors</span>
                        <span>{results.totals.sessions} sessions</span>
                        <span>{results.totals.requests} requests</span>
                        <span className="total-badge">{results.totals.total} total</span>
                    </div>

                    {results.results.users.length > 0 && (
                        <div className="result-category">
                            <h4>Users</h4>
                            <div className="result-list">
                                {results.results.users.map(user => (
                                    <div key={user._id} className="result-item">
                                        <span className="result-name">{user.name}</span>
                                        <span className="result-email">{user.email}</span>
                                        <span className="result-role">{user.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.results.sessions.length > 0 && (
                        <div className="result-category">
                            <h4>Sessions</h4>
                            <div className="result-list">
                                {results.results.sessions.map(session => (
                                    <div key={session._id} className="result-item">
                                        <span className="result-name">{session.topic}</span>
                                        <span className="result-status">{session.status}</span>
                                        <span className="result-date">{new Date(session.date).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ReauthModal = ({ show, password, setPassword, onSubmit, onClose }) => {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>🔐 Re-Authentication Required</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>
                <div className="modal-body">
                    <p>For sensitive actions, please re-enter your password.</p>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="reauth-input"
                        onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="cancel-btn">Cancel</button>
                    <button onClick={onSubmit} className="submit-btn">Authenticate</button>
                </div>
            </div>
        </div>
    );
};

export const NoteModal = ({ show, content, setContent, onSave, onClose }) => {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Admin Note</h3>
                    <button onClick={onClose} className="close-btn" aria-label="Close">×</button>
                </div>
                <div className="modal-body">
                    <p className="modal-subtitle">Internal note (visible only to admins)</p>
                    <textarea
                        placeholder="Write an internal note..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="note-textarea"
                        rows="4"
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="cancel-btn" type="button">Cancel</button>
                    <button onClick={onSave} className="submit-btn" type="button">Save Note</button>
                </div>
            </div>
        </div>
    );
};
