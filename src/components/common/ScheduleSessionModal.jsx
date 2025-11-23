import React, { useState } from 'react';
import './ScheduleSessionModal.css';

const ScheduleSessionModal = ({ isOpen, onClose, mentee, onSchedule }) => {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    timezone: 'GMT-05:00 (Eastern Time - US and Canada)',
    zoomLink: '',
    password: '',
    duration: '30',
    notes: ''
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.time || !formData.zoomLink) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await onSchedule({
        ...formData,
        chatId: mentee?.chatId
      });

      // Reset form
      setFormData({
        date: '',
        time: '',
        timezone: 'GMT-05:00 (Eastern Time - US and Canada)',
        zoomLink: '',
        password: '',
        duration: '30',
        notes: ''
      });

      onClose();
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert('Failed to schedule session');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Schedule a Session</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <form className="schedule-form" onSubmit={handleSubmit}>
          {/* Mentee Info */}
          {mentee && (
            <div className="mentee-info-section">
              <img
                src={mentee.profileImage || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
                alt={mentee.name}
                className="mentee-avatar-small"
              />
              <div>
                <p className="mentee-name">{mentee.name}</p>
                <p className="mentee-email">{mentee.email}</p>
              </div>
            </div>
          )}

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <div className="input-with-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          {/* Time */}
          <div className="form-group">
            <label htmlFor="time">Time</label>
            <div className="input-with-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="form-group">
            <label htmlFor="timezone">Time Zone</label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="timezone-select"
            >
              <option value="GMT-05:00 (Eastern Time - US and Canada)">GMT-05:00 (Eastern Time - US and Canada)</option>
              <option value="GMT-06:00 (Central Time - US and Canada)">GMT-06:00 (Central Time - US and Canada)</option>
              <option value="GMT-07:00 (Mountain Time - US and Canada)">GMT-07:00 (Mountain Time - US and Canada)</option>
              <option value="GMT-08:00 (Pacific Time - US and Canada)">GMT-08:00 (Pacific Time - US and Canada)</option>
              <option value="GMT+00:00 (UTC)">GMT+00:00 (UTC)</option>
              <option value="GMT+05:30 (India Standard Time)">GMT+05:30 (India Standard Time)</option>
            </select>
          </div>

          {/* Zoom Session Details */}
          <div className="zoom-section">
            <h3>Zoom Session Details</h3>

            <div className="form-group">
              <label htmlFor="zoomLink">Zoom Meeting Link</label>
              <input
                type="url"
                id="zoomLink"
                name="zoomLink"
                value={formData.zoomLink}
                onChange={handleChange}
                placeholder="https://zoom.us/j/123456789"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="text"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="1234567"
                />
              </div>

              <div className="form-group">
                <label htmlFor="duration">Duration</label>
                <select
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any notes for the student!"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="send-invite-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleSessionModal;
