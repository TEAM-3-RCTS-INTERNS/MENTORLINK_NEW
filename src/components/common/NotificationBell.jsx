import { useState, useEffect } from 'react';
import { FiBell } from 'react-icons/fi';
import { notificationAPI } from '../../services/api';
import NotificationPanel from './NotificationPanel';
import './NotificationBell.css';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const togglePanel = () => {
    setShowPanel(!showPanel);
  };

  const handleNotificationRead = () => {
    // Refresh unread count when a notification is read
    fetchUnreadCount();
  };

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell-btn"
        onClick={togglePanel}
        aria-label="Notifications"
      >
        <FiBell className="bell-icon" size={20} />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <NotificationPanel
          onClose={() => setShowPanel(false)}
          onNotificationRead={handleNotificationRead}
        />
      )}
    </div>
  );
};

export default NotificationBell;
