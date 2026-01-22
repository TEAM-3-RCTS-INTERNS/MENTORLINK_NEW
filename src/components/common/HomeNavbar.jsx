import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiMoon, FiSun, FiMessageCircle } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import logoImage from "../../assets/mentorlink-logo.png";
import NotificationBell from "./NotificationBell";
import "./HomeNavbar.css";

const HomeNavbar = () => {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();
  const { unreadCount } = useChat();
  const [dark, setDark] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  // Load dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    setDark(isDark);
    document.body.classList.toggle("dark-mode", isDark);
  }, []);

  // Fetch profile image (for students)
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (user?.role === "student") {
        try {
          const { studentAPI } = await import("../../services/api");
          const response = await studentAPI.getProfile();
          if (response.student?.profileImage) {
            setProfileImage(response.student.profileImage);
          }
        } catch (error) {
          console.error("Error fetching profile image:", error);
        }
      }
    };
    fetchProfileImage();
  }, [user?.role]);

  // Toggle dark/light mode
  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.body.classList.toggle("dark-mode", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Logout
  const logout = () => {
    authLogout();
    navigate("/login");
  };

  // Navigate to user's profile page based on role (disabled for admins)
  const onProfileClick = () => {
    // Don't navigate for admin users
    if (user?.role === "admin") return;
    
    if (user?.role === "student") navigate("/student-profile");
    else if (user?.role === "organizer") navigate("/organizer-profile");
    else if (user?.role === "mentor") navigate("/mentor-profile");
    else navigate("/home");
  };

  // Navigate to home
  const goHome = () => navigate("/home");

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Left: Logo only */}
        <div
          className="navbar-logo"
          onClick={goHome}
          role="button"
          tabIndex={1000}
        >
          <img src={logoImage} alt="MentorLink Logo" className="logo-image" />
        </div>

        {/* Right: Icons + Profile */}
        <div className="navbar-right">
          {/* Messages */}
          <button
            className="icon-btn messages-btn"
            onClick={() => navigate("/messages")}
            aria-label="Messages"
          >
            <FiMessageCircle size={20} />
            {unreadCount > 0 && (
              <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Dark Mode Toggle */}
          <button
            className="icon-btn theme-toggle"
            onClick={toggleDark}
            aria-label="Toggle dark mode"
          >
            {dark ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>

          {/* Logout */}
          <button className="btn btn--ghost logout-btn" onClick={logout}>
            <FiLogOut size={18} />
          </button>

          {/* Profile Avatar */}
          <button className="avatar" onClick={onProfileClick} aria-label="Profile">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span role="img" aria-label="user">
                🧑
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default HomeNavbar;
