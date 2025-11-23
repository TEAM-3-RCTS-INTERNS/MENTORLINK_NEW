import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiUser, FiCalendar, FiUsers, FiSettings, FiMessageSquare, FiShield } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import "./Sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useChat();

  // Determine which tab is active
  const path = location.pathname;
  let active = "home";
  if (path.includes("profile")) active = "profile";
  else if (path.includes("events")) active = "events";
  else if (path.includes("mentors")) active = "mentors";
  else if (path.includes("students")) active = "students";
  else if (path.includes("messages")) active = "messages";
  else if (path.includes("settings")) active = "settings";
  else if (path.includes("admin")) active = "admin";

  // Decide profile path dynamically
  let profilePath = "student-profile";
  if (user?.role === "organizer") {
    profilePath = "organizer-profile";
  } else if (user?.role === "mentor") {
    profilePath = "mentor-profile";
  }

  // Navigation handler
  const handleNavigation = (path) => {
    if (path.includes("profile")) {
      navigate(`/${path}`, { state: { refresh: Date.now() } });
    } else {
      navigate(`/${path}`);
    }
  };

  // Sidebar items
  const items = [
    { key: "home", icon: <FiHome />, label: "Home", path: "home" },
    { key: "profile", icon: <FiUser />, label: "Profile", path: profilePath },
    { key: "messages", icon: <FiMessageSquare />, label: "Messages", path: "messages", badge: unreadCount },
    { key: "events", icon: <FiCalendar />, label: "Events", path: "events" },
    { key: "mentors", icon: <FiUsers />, label: "Mentors", path: "mentors" },
    { key: "students", icon: <FiUsers />, label: "Students", path: "students" },
    { key: "settings", icon: <FiSettings />, label: "Settings", path: "settings" },
  ];

  if (user?.role === 'admin') {
    items.splice(1, 0, { key: "admin", icon: <FiShield />, label: "Admin", path: "admin" });
  }

  return (
    <aside className="sidebar">
      <ul className="sidebar__list">
        {items.map((item) => (
          <li
            key={item.key}
            className={`sidebar__item ${active === item.key ? "active" : ""}`}
            onClick={() => handleNavigation(item.path)}
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span className="sidebar__label">
              {item.label}
              {item.badge > 0 && (
                <span className="sidebar__badge">{item.badge}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
