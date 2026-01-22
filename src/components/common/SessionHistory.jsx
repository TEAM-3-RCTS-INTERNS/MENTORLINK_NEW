import React, { useState, useEffect } from 'react';
import './SessionHistory.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';

const SessionHistory = ({ isOpen, onClose, mentee }) => {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && mentee) {
      fetchSessions();
    }
  }, [isOpen, mentee]);

  // Filter sessions when filter or search changes
  useEffect(() => {
    let filtered = sessions;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(session => session.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(session =>
        session.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.topic?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  }, [sessions, filterStatus, searchTerm]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Handle both direct user objects and nested user objects (e.g., mentor.user)
      const userId = mentee?.user?._id || mentee?._id;

      if (!userId) {
        console.error('No user ID found for fetching sessions');
        setLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:5000/api/sessions/with-user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: {
        label: 'Scheduled',
        className: 'status-scheduled',
        icon: <EventIcon sx={{ fontSize: 14 }} />
      },
      completed: {
        label: 'Completed',
        className: 'status-completed',
        icon: <CheckCircleIcon sx={{ fontSize: 14 }} />
      },
      cancelled: {
        label: 'Cancelled',
        className: 'status-cancelled',
        icon: <CancelIcon sx={{ fontSize: 14 }} />
      },
      pending: {
        label: 'Pending',
        className: 'status-pending',
        icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} />
      }
    };

    const config = statusConfig[status] || { label: status, className: 'status-default', icon: null };

    return (
      <span className={`status-badge-new ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getSessionStats = () => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const upcomingSessions = sessions.filter(s => s.status === 'scheduled').length;
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;

    return { totalSessions, completedSessions, upcomingSessions, cancelledSessions };
  };

  const stats = getSessionStats();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="session-history-modal-enhanced" onClick={(e) => e.stopPropagation()}>
        <div className="session-history-header">
          <div className="header-left">
            <BarChartIcon className="header-icon" />
            <div>
              <h2>Session History</h2>
              <p>with {mentee.user?.name || mentee.name}</p>
            </div>
          </div>

          <button
            className="session-history-back-btn"
            onClick={onClose}
          >
            ← Back
          </button>
        </div>

        <div className="session-history-content-enhanced">
          {/* Mentee Info Card */}
          {mentee && (
            <div className="mentee-info-card">
              <img
                src={mentee.user?.profileImage || mentee.profileImage || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
                alt={mentee.user?.name || mentee.name}
                className="mentee-avatar-large"
              />
              <div className="mentee-info-details">
                <h3>{mentee.user?.name || mentee.name}</h3>
                <p>{mentee.user?.email || mentee.email}</p>
              </div>
            </div>
          )}

          {/* Session Stats */}
          {!loading && sessions.length > 0 && (
            <div className="session-stats-grid">
              <div className="stat-card">
                <div className="stat-icon total">
                  <EventIcon />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.totalSessions}</div>
                  <div className="stat-label">Total Sessions</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon completed">
                  <CheckCircleIcon />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.completedSessions}</div>
                  <div className="stat-label">Completed</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon upcoming">
                  <HourglassEmptyIcon />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.upcomingSessions}</div>
                  <div className="stat-label">Upcoming</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon cancelled">
                  <CancelIcon />
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stats.cancelledSessions}</div>
                  <div className="stat-label">Cancelled</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          {!loading && sessions.length > 0 && (
            <div className="filters-section">
              <div className="search-bar">
                <SearchIcon sx={{ fontSize: 20, color: '#666' }} />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-buttons">
                <FilterListIcon sx={{ fontSize: 20, marginRight: '8px', color: '#666' }} />
                <button
                  className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('completed')}
                >
                  Completed
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'scheduled' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('scheduled')}
                >
                  Upcoming
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('cancelled')}
                >
                  Cancelled
                </button>
              </div>
            </div>
          )}

          {/* Sessions Timeline */}
          {loading ? (
            <div className="loading-state-enhanced">
              <div className="spinner"></div>
              <p>Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="empty-state-enhanced">
              <EventIcon sx={{ fontSize: 64, color: '#ccc' }} />
              <p className="empty-text">No sessions yet</p>
              <p className="empty-subtext">Schedule your first session to get started!</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="empty-state-enhanced">
              <SearchIcon sx={{ fontSize: 64, color: '#ccc' }} />
              <p className="empty-text">No sessions found</p>
              <p className="empty-subtext">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div className="sessions-timeline">
              <div className="timeline-line"></div>
              {filteredSessions.map((session, index) => (
                <div key={session._id} className="session-card-timeline">
                  <div className="timeline-marker" data-status={session.status}>
                    {session.status === 'completed' ? <CheckCircleIcon /> :
                      session.status === 'cancelled' ? <CancelIcon /> :
                        session.status === 'scheduled' ? <EventIcon /> :
                          <HourglassEmptyIcon />}
                  </div>
                  <div className="session-card-content">
                    <div className="session-header-timeline">
                      <div className="session-date-time-timeline">
                        <AccessTimeIcon sx={{ fontSize: 18, marginRight: '6px' }} />
                        <span className="session-date-main">
                          {formatDate(session.date)} at {formatTime(session.time)}
                        </span>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>

                    <div className="session-details">
                      <div className="session-detail-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span>{session.duration} minutes</span>
                      </div>

                      {session.timezone && (
                        <div className="session-detail-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 2C8 2 8 6 8 6C8 6 8 10 12 10C16 10 16 6 16 6C16 6 16 2 12 2Z" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          <span>{session.timezone}</span>
                        </div>
                      )}
                    </div>

                    {session.zoomLink && session.status === 'scheduled' && (
                      <div className="session-zoom">
                        <a
                          href={session.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="zoom-link-btn"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8zm18 0H4v8h16V8z" />
                          </svg>
                          Join Zoom Meeting
                        </a>
                        {session.password && (
                          <p className="zoom-password">Password: {session.password}</p>
                        )}
                      </div>
                    )}

                    {session.notes && (
                      <div className="session-notes">
                        <p className="notes-label">Notes:</p>
                        <p className="notes-text">{session.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;
