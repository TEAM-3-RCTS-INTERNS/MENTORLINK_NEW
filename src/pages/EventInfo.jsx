import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import HomeNavbar from "../components/common/HomeNavbar";
import Sidebar from "../components/home/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { useLayout } from "../contexts/LayoutContext";
import "./EventInfo.css";

const EventInfo = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sidebarCollapsed } = useLayout();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInterested, setIsInterested] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/api/events/${eventId}`);
        setEvent(response.data.event);

        // Check if current user is the organizer
        if (user && response.data.event.organizerId === user._id) {
          setIsOrganizer(true);
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId, user]);

  const handleInterestToggle = () => {
    setIsInterested(!isInterested);
  };

  const handleRegister = () => {
    if (event?.registrationLink) {
      window.open(event.registrationLink, "_blank");
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleEdit = () => {
    navigate("/host-an-event", { state: { eventId: event._id, editMode: true, eventData: event } });
  };

  if (loading) {
    return (
      <div className="event-info-page">
        <HomeNavbar />
        <div className={`event-info-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          <Sidebar />
          <div className="event-info-container">
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading event details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-info-page">
        <HomeNavbar />
        <div className={`event-info-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          <Sidebar />
          <div className="event-info-container">
            <div className="error-container">
              <h2>Event Not Found</h2>
              <p>The event you're looking for doesn't exist or has been removed.</p>
              <button className="back-button" onClick={() => navigate("/events")}>
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <div className="event-info-page">
      <HomeNavbar />
      <div className={`event-info-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar />
        <main className="event-info-main">
          {/* Back Button and Edit Button */}
          <div className="event-nav-controls">
            <button className="nav-back-button" onClick={handleBack}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            {isOrganizer && (
              <button className="nav-edit-button" onClick={handleEdit}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Event
              </button>
            )}
          </div>

          {/* Hero Section with Banner */}
          <section className="event-hero">
            <div className="event-hero-image">
              <img
                src={event.bannerImageUrl || "https://placehold.co/1200x400/4B5563/FFFFFF?text=Event+Banner"}
                alt={event.eventName}
              />
              <div className="event-hero-overlay">
                <div className="event-hero-content">
                  <div className="event-badges">
                    <span className="badge-type">{event.eventType}</span>
                    <span className="badge-mode">{event.eventMode}</span>
                  </div>
                  <h1 className="event-hero-title">{event.eventName}</h1>
                  {event.tagline && <p className="event-hero-tagline">{event.tagline}</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Event Quick Info */}
          <section className="event-quick-info">
            <div className="quick-info-grid">
              <div className="quick-info-card">
                <svg className="quick-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <h3>Date</h3>
                  <p>
                    {isSameDay
                      ? startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                </div>
              </div>

              <div className="quick-info-card">
                <svg className="quick-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3>Time</h3>
                  <p>{event.timings}</p>
                </div>
              </div>

              <div className="quick-info-card">
                <svg className="quick-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <h3>Location</h3>
                  <p>{event.eventMode === "Online" ? "Virtual Event" : event.contactAddress?.split(",")[0] || "TBA"}</p>
                </div>
              </div>

              <div className="quick-info-card">
                <svg className="quick-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3>Price</h3>
                  <p className={event.isPaid ? "price-paid" : "price-free"}>
                    {event.isPaid ? `₹${event.amount.toLocaleString()}` : "FREE"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content Area */}
          <div className="event-content-wrapper">
            <div className="event-main-content">
              {/* About Event */}
              <section className="event-section">
                <h2 className="section-title">
                  <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  About This Event
                </h2>
                <div className="section-content">
                  <p className="event-description">{event.details}</p>
                </div>
              </section>

              {/* Event Stages/Timeline */}
              {event.additionalInfo && (
                <section className="event-section">
                  <h2 className="section-title">
                    <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Additional Information
                  </h2>
                  <div className="section-content">
                    <p className="event-additional-info">{event.additionalInfo}</p>
                  </div>
                </section>
              )}

              {/* Important Things to Remember */}
              {event.importantToRemember && (
                <section className="event-section">
                  <h2 className="section-title important-section">
                    <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Important Things to Remember
                  </h2>
                  <div className="section-content important-content">
                    <p className="event-important-info">{event.importantToRemember}</p>
                  </div>
                </section>
              )}

              {/* Contact & Venue */}
              <section className="event-section">
                <h2 className="section-title">
                  <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Venue & Contact
                </h2>
                <div className="section-content">
                  <div className="contact-info">
                    <p className="contact-address">{event.contactAddress}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar with Action Cards */}
            <aside className="event-sidebar">
              {/* Registration Card */}
              <div className="action-card registration-card">
                <h3>Ready to Join?</h3>
                <div className="registration-price">
                  {event.isPaid ? (
                    <div className="paid-event">
                      <span className="price-label">Event Fee</span>
                      <span className="price-amount">₹{event.amount.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="free-event">
                      <span className="free-badge">FREE EVENT</span>
                    </div>
                  )}
                </div>
                <button className="register-button" onClick={handleRegister}>
                  <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Register Now
                </button>
                <button
                  className={`interest-button ${isInterested ? "interested" : ""}`}
                  onClick={handleInterestToggle}
                >
                  <svg className="button-icon" fill={isInterested ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {isInterested ? "Interested" : "Mark as Interested"}
                </button>
              </div>

              {/* Share Card */}
              <div className="action-card share-card">
                <h3>Share This Event</h3>
                <div className="share-buttons">
                  <button className="share-btn" title="Share on Twitter">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </button>
                  <button className="share-btn" title="Share on Facebook">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                  <button className="share-btn" title="Share on LinkedIn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </button>
                  <button className="share-btn" title="Copy Link">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Event Stats Card */}
              <div className="action-card stats-card">
                <h3>Event Stats</h3>
                <div className="stats-list">
                  <div className="stat-item">
                    <span className="stat-label">Event Type</span>
                    <span className="stat-value">{event.eventType}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Mode</span>
                    <span className="stat-value">{event.eventMode}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Duration</span>
                    <span className="stat-value">
                      {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))} {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EventInfo;
