// src/pages/OrganizerProfile.jsx
import React, { useState, useEffect, useRef } from "react";
import HomeNavbar from "../components/common/HomeNavbar";
import Sidebar from "../components/home/Sidebar";
import { organizerAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useLayout } from "../contexts/LayoutContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./OrganizerProfile.css";

const OrganizerProfile = () => {
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { sidebarCollapsed } = useLayout();
  const profileImageRef = useRef(null);
  const coverImageRef = useRef(null);

  const [organizerProfile, setOrganizerProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [pastEvents, setPastEvents] = useState([]);
  const [presentEvents, setPresentEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Profile edit form
  const [profileForm, setProfileForm] = useState({
    name: "",
    domains: "",
    motivation: "",
    audience: [],
    eventTypes: [],
    profileImage: "",
    coverImage: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await organizerAPI.getProfile();
        const org = response.organizer;
        setOrganizerProfile(org);

        setProfileForm({
          name: org?.user?.name || "",
          domains: org?.domains || "",
          motivation: org?.motivation || "",
          audience: org?.audience || [],
          eventTypes: org?.eventTypes || [],
          profileImage: org?.profileImage || "",
          coverImage: org?.coverImage || "",
        });

        if (org?.user?._id) fetchOrganizerEvents(org.user._id);
      } catch (error) {
        console.error("Error fetching organizer profile:", error);
        if (error.status === 401) navigate("/login", { replace: true });
      }
    };
    fetchProfile();
  }, [authLoading, isAuthenticated, navigate]);

  const fetchOrganizerEvents = async (organizerId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/events/organizer/${organizerId}`);
      const events = response.data.events || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const past = [];
      const present = [];
      const upcoming = [];

      events.forEach((event) => {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        if (endDate < today) past.push(event);
        else if (startDate <= today && endDate >= today) present.push(event);
        else upcoming.push(event);
      });

      setPastEvents(past);
      setPresentEvents(present);
      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error("Error fetching organizer events:", error);
    }
  };

  const handleHostEvent = () => {
    navigate("/host-an-event", { state: { organizerId: organizerProfile?.user?._id } });
  };

  const handleEditEvent = (eventId, e) => {
    e.stopPropagation();
    navigate("/host-an-event", {
      state: { organizerId: organizerProfile?.user?._id, eventId, isEditing: true },
    });
  };

  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await axios.delete(`http://localhost:5000/api/events/${eventId}`);
        fetchOrganizerEvents(organizerProfile?.user?._id);
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event");
      }
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("profileImage", file);

    try {
      const response = await organizerAPI.uploadProfileImage(formData);
      setOrganizerProfile({ ...organizerProfile, profileImage: response.imageUrl });
      setProfileForm({ ...profileForm, profileImage: response.imageUrl });
      alert("Profile image updated successfully!");
    } catch (error) {
      console.error("Error uploading profile image:", error);
      alert(error.message || "Failed to upload image");
    }
  };

  const handleCoverImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("coverImage", file);

    try {
      const response = await organizerAPI.uploadCoverImage(formData);
      setOrganizerProfile({ ...organizerProfile, coverImage: response.imageUrl });
      setProfileForm({ ...profileForm, coverImage: response.imageUrl });
      alert("Cover image updated successfully!");
    } catch (error) {
      console.error("Error uploading cover image:", error);
      alert(error.message || "Failed to upload image");
    }
  };

  const handleSaveProfile = async () => {
    try {
      await organizerAPI.updateProfile(profileForm);
      setOrganizerProfile({ ...organizerProfile, ...profileForm });
      setIsEditingProfile(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    }
  };

  const renderEvents = () => {
    let events = [];
    let colorClass = "";

    if (activeTab === "past") {
      events = pastEvents;
      colorClass = "red-section";
    } else if (activeTab === "present") {
      events = presentEvents;
      colorClass = "blue-section";
    } else if (activeTab === "upcoming") {
      events = upcomingEvents;
      colorClass = "green-section";
    }

    return (
      <div className={`events-section ${colorClass}`}>
        <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Events</h2>
        {events.length ? (
          <div className="events-list">
            {events.map((event) => {
              const startDate = new Date(event.startDate);
              const endDate = new Date(event.endDate);
              const monthShort = startDate.toLocaleDateString('en-US', { month: 'short' });
              const day = startDate.getDate();

              return (
                <div key={event._id} className="event-card" onClick={() => navigate(`/events/${event._id}`)}>
                  {/* Event Banner */}
                  <div className="event-banner">
                    {event.bannerImageUrl && (
                      <img src={event.bannerImageUrl} alt={event.eventName} />
                    )}

                    {/* Date Badge */}
                    <div className="event-date-badge">
                      <p className="month">{monthShort}</p>
                      <p className="day">{day}</p>
                    </div>

                    {/* Action Buttons Overlay */}
                    <div className="event-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="event-edit-btn" onClick={(e) => handleEditEvent(event._id, e)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                      <button className="event-delete-btn" onClick={(e) => handleDeleteEvent(event._id, e)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Event Content */}
                  <div className="event-content">
                    <h3>{event.eventName}</h3>
                    {event.tagline && <p className="event-tagline">{event.tagline}</p>}

                    <div className="event-meta">
                      <div className="event-date">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                      </div>
                      <div className="event-mode">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {event.eventMode} • {event.eventType}
                      </div>
                    </div>

                    <div className="event-footer">
                      <div className={`event-price ${event.isPaid ? 'paid' : 'free'}`}>
                        {event.isPaid ? `₹${event.amount}` : 'FREE'}
                      </div>
                      <div className="event-mode-badge">{event.eventMode}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-events">No {activeTab} events found.</div>
        )}
      </div>
    );
  };

  return (
    <div className="organizer-profile">
      <HomeNavbar />
      <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar />
        <div className="main-content">
          <div className="profile-page-container">
            {/* Cover Image */}
            <div className="cover-container">
              <img
                src={
                  organizerProfile?.coverImage ||
                  "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600"
                }
                alt="Cover"
                className="cover-image"
              />
              <button className="change-cover-btn" onClick={() => coverImageRef.current.click()}>
                📷 Change Cover
              </button>
              <input
                ref={coverImageRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleCoverImageUpload}
              />
            </div>

            {/* Profile Info */}
            <div className="profile-top">
              {/* Left: Profile Picture & Info */}
              <div className="left">
                <div className="profile-picture-container">
                  <img
                    src={
                      organizerProfile?.profileImage ||
                      "https://ui-avatars.com/api/?name=Organizer&size=200&background=10b981&color=fff"
                    }
                    alt="Profile"
                    className="profile-picture"
                  />
                  <button className="change-avatar-btn" onClick={() => profileImageRef.current.click()}>
                    📷
                  </button>
                  <input
                    ref={profileImageRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleProfileImageUpload}
                  />
                </div>

                {!isEditingProfile ? (
                  <div className="user-info-section">
                    <h1>{organizerProfile?.user?.name || "Organizer"}</h1>
                    <p className="user-title">{organizerProfile?.domains || "Event Organizer"}</p>
                    <p className="user-bio">
                      {organizerProfile?.motivation || "Passionate about creating meaningful events."}
                    </p>
                    <div className="profile-actions">
                      <button className="btn-edit" onClick={() => setIsEditingProfile(true)}>
                        ✏️ Edit Profile
                      </button>
                      <button className="btn-host" onClick={handleHostEvent}>
                        + Host Event
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={profileForm.name}
                      className="edit-input"
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      placeholder="Your Name"
                    />
                    <input
                      type="text"
                      value={profileForm.domains}
                      className="edit-input"
                      onChange={(e) => setProfileForm({ ...profileForm, domains: e.target.value })}
                      placeholder="Your Domain"
                    />
                    <textarea
                      className="edit-textarea"
                      value={profileForm.motivation}
                      onChange={(e) => setProfileForm({ ...profileForm, motivation: e.target.value })}
                      placeholder="Your Motivation"
                      rows={4}
                    />
                    <div className="profile-actions">
                      <button className="btn-cancel" onClick={() => setIsEditingProfile(false)}>
                        Cancel
                      </button>
                      <button className="btn-save" onClick={handleSaveProfile}>
                        💾 Save
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right side: Event Types */}
              <div className="right">
                <div className="skills-section">
                  <h2>Event Types</h2>
                  <div className="skills-list">
                    {(organizerProfile?.eventTypes || []).length > 0 ? (
                      organizerProfile.eventTypes.map((t, i) => (
                        <span key={i} className="skill-tag">
                          {t}
                        </span>
                      ))
                    ) : (
                      <p style={{ color: '#9ca3af', fontSize: '14px' }}>No event types specified</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="events-tabs">
              <button className={activeTab === "past" ? "active-tab" : ""} onClick={() => setActiveTab("past")}>
                Past
              </button>
              <button className={activeTab === "present" ? "active-tab" : ""} onClick={() => setActiveTab("present")}>
                Present
              </button>
              <button className={activeTab === "upcoming" ? "active-tab" : ""} onClick={() => setActiveTab("upcoming")}>
                Upcoming
              </button>
            </div>

            {renderEvents()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerProfile;
