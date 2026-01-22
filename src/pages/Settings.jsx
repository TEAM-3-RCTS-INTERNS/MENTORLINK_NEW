import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HomeNavbar from "../components/common/HomeNavbar";
import Sidebar from "../components/home/Sidebar";
import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/AuthContext";
import { useLayout } from "../contexts/LayoutContext";
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings, toggleDarkMode, updateSecurity, updateLocation, updateAccount, updateNotifications } = useSettings();
  const { sidebarCollapsed } = useLayout();

  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    currentLocation: settings.location.currentLocation || "",
    timezone: settings.location.timezone || "UTC-5",
    email: settings.account.email || user?.email || "",
    username: settings.account.username || user?.name || "",
  });

  // Sync form data with settings changes
  useEffect(() => {
    setFormData({
      currentLocation: settings.location.currentLocation || "",
      timezone: settings.location.timezone || "UTC-5",
      email: settings.account.email || user?.email || "",
      username: settings.account.username || user?.name || "",
    });
  }, [settings, user]);

  const handleToggle = (category, key) => {
    switch (category) {
      case 'security':
        updateSecurity(key, !settings.security[key]);
        break;
      case 'location':
        updateLocation(key, !settings.location[key]);
        break;
      case 'account':
        updateAccount(key, !settings.account[key]);
        break;
      case 'notifications':
        updateNotifications(key, !settings.notifications[key]);
        break;
      default:
        break;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveLocation = () => {
    updateLocation('currentLocation', formData.currentLocation);
    updateLocation('timezone', formData.timezone);
    alert('Location settings saved successfully!');
  };

  const handleSaveAccount = () => {
    updateAccount('email', formData.email);
    updateAccount('username', formData.username);
    alert('Account settings saved successfully!');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? Your account will be deactivated and scheduled for permanent deletion after 30 days. You can contact the admin to recover your account within this period.'
    );
    if (confirmed) {
      try {
        const { userAPI } = await import('../services/api');
        await userAPI.deleteAccount('User requested account deletion');
        alert('Your account has been scheduled for deletion. You will be logged out now. Contact admin within 30 days if you wish to recover your account.');
        logout();
        navigate('/');
      } catch (error) {
        alert(error.message || 'Failed to delete account. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <HomeNavbar />
      <div className={`flex min-h-screen${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar />

        <div className="main-content">
          {/* Settings Header */}
          <div className="settings-header">
            <h1>Settings</h1>
            <p className="settings-subtitle">Manage your account preferences and application settings</p>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button
              className={`theme-toggle-btn ${settings.darkMode ? 'dark' : ''}`}
              onClick={toggleDarkMode}
            >
              {settings.darkMode ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
                  </svg>
                  Light Mode
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
                  </svg>
                  Dark Mode
                </>
              )}
            </button>

            <button className="logout-btn" onClick={handleLogout}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 102 0V4a1 1 0 011-1h10a1 1 0 011 1v12a1 1 0 102 0V4a1 1 0 00-1-1H3z" clipRule="evenodd"/>
              </svg>
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={activeTab === "general" ? "active" : ""}
              onClick={() => setActiveTab("general")}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              General
            </button>
            <button
              className={activeTab === "location" ? "active" : ""}
              onClick={() => setActiveTab("location")}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
              Location
            </button>
            <button
              className={activeTab === "account" ? "active" : ""}
              onClick={() => setActiveTab("account")}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
              </svg>
              Account
            </button>
            <button
              className={activeTab === "notifications" ? "active" : ""}
              onClick={() => setActiveTab("notifications")}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              Notifications
            </button>
          </div>

          {/* General Tab */}
          {activeTab === "general" && (
            <div className="tab-content">
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Security Card */}
                <div className="card">
                  <h2>Security & Privacy Settings</h2>
                  <div className="settings-list">
                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Two-Factor Authentication</span>
                        <p className="toggle-description">Add an extra layer of security</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.security.twoFactor}
                          onChange={() => handleToggle('security', 'twoFactor')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Change Password</span>
                        <p className="toggle-description">Update your password regularly</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.security.passwordChange}
                          onChange={() => handleToggle('security', 'passwordChange')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Login Alerts</span>
                        <p className="toggle-description">Get notified of new logins</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.security.loginAlerts}
                          onChange={() => handleToggle('security', 'loginAlerts')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Session Recording Permission</span>
                        <p className="toggle-description">Allow session recordings</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.security.sessionPermission}
                          onChange={() => handleToggle('security', 'sessionPermission')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Data Sharing with Students</span>
                        <p className="toggle-description">Share progress data</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.security.dataSharing}
                          onChange={() => handleToggle('security', 'dataSharing')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Terms Card */}
                <div className="card">
                  <h2>Terms & Conditions</h2>
                  <ol className="terms-list">
                    <li>Provide accurate and up-to-date information in your profile.</li>
                    <li>Maintain professionalism and respect towards mentee/mentor at all times.</li>
                    <li>Avoid offensive, discriminatory, or misleading content.</li>
                    <li>Comply with all laws related to your mentoring.</li>
                    <li>Keep all session recordings, student info, and discussions confidential.</li>
                    <li>Use platform only for educational purposes.</li>
                    <li>Avoid promoting unrelated services or products.</li>
                    <li>Follow cancellation, refund, and dispute policies.</li>
                  </ol>
                </div>
              </div>

              {/* Collapsible Sections */}
              <div className="collapsible-sections">
                <details className="collapsible-card">
                  <summary>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                    </svg>
                    Security Allocations / Data Protection
                  </summary>
                  <p>Manage your data and access permissions here. Assign roles, limit access, and protect sensitive information. Your data is encrypted and stored securely.</p>
                </details>

                <details className="collapsible-card">
                  <summary>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                    </svg>
                    Legal & Compliance
                  </summary>
                  <p>View platform rules, legal compliance information, and ensure all mentoring activities meet required regulations. Last updated: January 2025.</p>
                </details>
              </div>

              {/* Danger Zone */}
              <div className="danger-zone">
                <p>Deleting your account will deactivate it for 30 days. During this period, you can contact admin to recover it. After 30 days, your account will be permanently deleted.</p>
                <button className="delete-btn" onClick={handleDeleteAccount}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === "location" && (
            <div className="tab-content">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <h2>Location Settings</h2>
                  <div className="settings-list">
                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Share Location with Mentees</span>
                        <p className="toggle-description">Allow mentees to see your location</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.location.shareLocation}
                          onChange={() => handleToggle('location', 'shareLocation')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Auto-Detect Location</span>
                        <p className="toggle-description">Automatically update your location</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.location.autoDetect}
                          onChange={() => handleToggle('location', 'autoDetect')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Show Location on Profile</span>
                        <p className="toggle-description">Display location publicly</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.location.showOnProfile}
                          onChange={() => handleToggle('location', 'showOnProfile')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group mt-6">
                    <label className="input-label">Current Location</label>
                    <input
                      type="text"
                      name="currentLocation"
                      className="text-input"
                      placeholder="Enter your city or region"
                      value={formData.currentLocation}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group mt-4">
                    <label className="input-label">Time Zone</label>
                    <select
                      name="timezone"
                      className="text-input"
                      value={formData.timezone}
                      onChange={handleInputChange}
                    >
                      <option value="UTC-5">UTC-5 (Eastern Time)</option>
                      <option value="UTC-6">UTC-6 (Central Time)</option>
                      <option value="UTC-7">UTC-7 (Mountain Time)</option>
                      <option value="UTC-8">UTC-8 (Pacific Time)</option>
                      <option value="UTC+0">UTC+0 (GMT)</option>
                      <option value="UTC+5:30">UTC+5:30 (IST)</option>
                    </select>
                  </div>

                  <button className="save-btn mt-4" onClick={handleSaveLocation}>
                    Save Location Settings
                  </button>
                </div>

                <div className="card info-card">
                  <h2>Why Location Matters</h2>
                  <div className="info-content">
                    <p>Your location helps us:</p>
                    <ul>
                      <li>Match you with mentees in your timezone</li>
                      <li>Suggest relevant local opportunities</li>
                      <li>Display accurate session times</li>
                      <li>Connect you with nearby mentors/mentees</li>
                    </ul>
                    <div className="info-note">
                      <strong>Privacy Note:</strong> Your exact location is never shared. Only your city and timezone are visible to others.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === "account" && (
            <div className="tab-content">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <h2>Account Preferences</h2>
                  <div className="settings-list">
                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Email Notifications</span>
                        <p className="toggle-description">Receive updates via email</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.account.emailNotifications}
                          onChange={() => handleToggle('account', 'emailNotifications')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Profile Visibility</span>
                        <p className="toggle-description">Make your profile public</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.account.profileVisibility}
                          onChange={() => handleToggle('account', 'profileVisibility')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Allow Direct Messages</span>
                        <p className="toggle-description">Receive messages from users</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.account.allowMessages}
                          onChange={() => handleToggle('account', 'allowMessages')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Show Activity Status</span>
                        <p className="toggle-description">Show when you're online</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.account.showActivity}
                          onChange={() => handleToggle('account', 'showActivity')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group mt-6">
                    <label className="input-label">Account Email</label>
                    <input
                      type="email"
                      name="email"
                      className="text-input"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group mt-4">
                    <label className="input-label">Username</label>
                    <input
                      type="text"
                      name="username"
                      className="text-input"
                      placeholder="Your username"
                      value={formData.username}
                      onChange={handleInputChange}
                    />
                  </div>

                  <button className="save-btn mt-4" onClick={handleSaveAccount}>
                    Save Account Settings
                  </button>
                </div>

                <div className="card">
                  <h2>Access Permissions</h2>
                  <div className="permission-list">
                    <div className="permission-item">
                      <div className="permission-icon">👤</div>
                      <div className="permission-details">
                        <h3>Profile Access</h3>
                        <p>Control who can view your profile and contact information</p>
                        <span className={`permission-status ${settings.account.profileVisibility ? 'active' : 'inactive'}`}>
                          {settings.account.profileVisibility ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="permission-item">
                      <div className="permission-icon">📅</div>
                      <div className="permission-details">
                        <h3>Calendar Integration</h3>
                        <p>Sync your mentoring sessions with external calendars</p>
                        <span className="permission-status active">Active</span>
                      </div>
                    </div>

                    <div className="permission-item">
                      <div className="permission-icon">🔔</div>
                      <div className="permission-details">
                        <h3>Push Notifications</h3>
                        <p>Receive real-time updates about sessions and messages</p>
                        <span className={`permission-status ${settings.notifications.push ? 'active' : 'inactive'}`}>
                          {settings.notifications.push ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="collapsible-sections">
                <details className="collapsible-card">
                  <summary>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
                    </svg>
                    Connected Accounts
                  </summary>
                  <p>Manage third-party integrations like Google Calendar, Zoom, and Microsoft Teams for seamless mentoring sessions.</p>
                </details>

                <details className="collapsible-card">
                  <summary>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                    Export Your Data
                  </summary>
                  <p>Download a copy of all your data including profile information, session history, and messages in compliance with data protection regulations.</p>
                </details>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="tab-content">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <h2>Notification Preferences</h2>
                  <div className="settings-list">
                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Email Notifications</span>
                        <p className="toggle-description">Receive notifications via email</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email}
                          onChange={() => handleToggle('notifications', 'email')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Push Notifications</span>
                        <p className="toggle-description">Browser push notifications</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.notifications.push}
                          onChange={() => handleToggle('notifications', 'push')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">SMS Notifications</span>
                        <p className="toggle-description">Receive text messages</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sms}
                          onChange={() => handleToggle('notifications', 'sms')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Mentorship Requests</span>
                        <p className="toggle-description">New mentorship requests</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.notifications.mentorshipRequests}
                          onChange={() => handleToggle('notifications', 'mentorshipRequests')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Session Reminders</span>
                        <p className="toggle-description">Upcoming session reminders</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sessionReminders}
                          onChange={() => handleToggle('notifications', 'sessionReminders')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Message Notifications</span>
                        <p className="toggle-description">New message alerts</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.notifications.messages}
                          onChange={() => handleToggle('notifications', 'messages')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="card info-card">
                  <h2>Notification Tips</h2>
                  <div className="info-content">
                    <p>Manage how and when you receive notifications:</p>
                    <ul>
                      <li><strong>Email:</strong> Best for detailed updates and summaries</li>
                      <li><strong>Push:</strong> Instant updates on your browser</li>
                      <li><strong>SMS:</strong> Critical updates and urgent matters</li>
                    </ul>
                    <div className="info-note">
                      <strong>Tip:</strong> Enable session reminders to never miss a mentoring appointment!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;
