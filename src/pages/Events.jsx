import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import HomeNavbar from "../components/common/HomeNavbar";
import Sidebar from "../components/home/Sidebar";
import Footer from "../components/common/Footer";
import { useLayout } from "../contexts/LayoutContext";
import "./Events.css";

const Events = () => {
  const navigate = useNavigate();
  const { sidebarCollapsed } = useLayout();
  const [popularEvents, setPopularEvents] = useState([]);
  const [onlineEvents, setOnlineEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("India");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [interestedEvents, setInterestedEvents] = useState(new Set());
  const [loadedCounts, setLoadedCounts] = useState({
    popular: 6,
    online: 6,
    trending: 6,
  });
  const [loading, setLoading] = useState(true);

  const locationDropdownRef = useRef(null);
  const categoriesCarouselRef = useRef(null);
  const EVENTS_PER_PAGE = 6;

  const categories = [
    { name: "All", imageUrl: "https://placehold.co/170x170/7f8c8d/ffffff?text=All" },
    { name: "Workshop", imageUrl: "https://placehold.co/170x170/8e44ad/ffffff?text=Workshop" },
    { name: "Seminar", imageUrl: "https://placehold.co/170x170/2980b9/ffffff?text=Seminar" },
    { name: "Webinar", imageUrl: "https://placehold.co/170x170/d35400/ffffff?text=Webinar" },
    { name: "Hackathon", imageUrl: "https://placehold.co/170x170/c0392b/ffffff?text=Hackathon" },
    { name: "Competition", imageUrl: "https://placehold.co/170x170/27ae60/ffffff?text=Competition" },
    { name: "Other", imageUrl: "https://placehold.co/170x170/f39c12/ffffff?text=Other" },
  ];

  const indianCities = [
    "India", "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad",
    "Chennai", "Kolkata", "Pune", "Jaipur", "Kakinada", "Kadiri",
  ];

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:5000/api/events/get-events");
        const rawEvents = res.data.events || [];

        const formattedEvents = rawEvents.map((e) => {
          const startDate = e.startDate ? new Date(e.startDate) : new Date();
          const month = startDate.toLocaleString("en-US", { month: "short" }).toUpperCase();
          const day = startDate.getDate();

          return {
            id: e._id,
            title: e.eventName || "Untitled Event",
            subtitle: e.tagline || e.details?.substring(0, 50) || "No description",
            location: e.contactAddress?.split(",")[0] || "Location TBA",
            eventMode: e.eventMode || "Online",
            imageUrl: e.bannerImageUrl || "https://placehold.co/400x300/4B5563/FFFFFF?text=Event",
            date: startDate,
            dateDisplay: { month, day: String(day) },
            time: e.timings || "TBA",
            price: e.isPaid ? e.amount : 0,
            interested: Math.floor(Math.random() * 100), // Mock interest count
            category: e.eventType || "Other",
            registrationLink: e.registrationLink || "#",
          };
        });

        // Separate events into categories
        const popular = formattedEvents.filter(e => e.eventMode === "Offline").slice(0, 12);
        const online = formattedEvents.filter(e => e.eventMode === "Online").slice(0, 12);
        const trending = [...formattedEvents].sort(() => 0.5 - Math.random()).slice(0, 12);

        setPopularEvents(popular);
        setOnlineEvents(online);
        setTrendingEvents(trending);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter events
  const getFilteredEvents = (events) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return events.filter((event) => {
      const matchesSearch =
        searchTerm === "" ||
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = activeCategory === "All" || event.category === activeCategory;

      const matchesLocation = selectedLocation === "India" || event.location === selectedLocation;

      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      let matchesSubFilter = false;
      switch (activeFilter) {
        case "today":
          matchesSubFilter = eventDate.getTime() === today.getTime();
          break;
        case "tomorrow":
          matchesSubFilter = eventDate.getTime() === tomorrow.getTime();
          break;
        case "weekend": {
          const day = eventDate.getDay();
          matchesSubFilter = day === 6 || day === 0;
          break;
        }
        case "free":
          matchesSubFilter = event.price === 0;
          break;
        case "paid":
          matchesSubFilter = event.price > 0;
          break;
        default:
          matchesSubFilter = true;
      }

      return matchesSearch && matchesCategory && matchesSubFilter && matchesLocation;
    });
  };

  const filteredPopular = getFilteredEvents(popularEvents);
  const filteredOnline = getFilteredEvents(onlineEvents);
  const filteredTrending = getFilteredEvents(trendingEvents);

  const handleInterestedToggle = (eventId) => {
    setInterestedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) newSet.delete(eventId);
      else newSet.add(eventId);
      return newSet;
    });
  };

  const scrollCarousel = (direction) => {
    if (categoriesCarouselRef.current) {
      const scrollAmount = 300;
      categoriesCarouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="events-page">
      <HomeNavbar />
      <div className={`events-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar />
        <main className="events-main-content">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">
                Don't miss out!<br />
                Explore the <span className="highlight">vibrant events</span><br />
                happening locally and globally.
              </h1>

              {/* Search Bar */}
              <div className="search-container">
                <div className="search-box">
                  <div className="search-input-wrapper">
                    <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search events by title, city, or organizer"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Location Selector */}
                  <div className="location-selector" ref={locationDropdownRef}>
                    <button
                      className="location-button"
                      onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                    >
                      <svg className="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{selectedLocation}</span>
                    </button>

                    {showLocationDropdown && (
                      <div className="location-dropdown">
                        {indianCities.map((city) => (
                          <button
                            key={city}
                            className="location-item"
                            onClick={() => {
                              setSelectedLocation(city);
                              setShowLocationDropdown(false);
                            }}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Categories Section */}
          <section className="categories-section">
            <h2 className="section-title">Explore Categories</h2>
            <div className="carousel-wrapper">
              <button className="carousel-btn left" onClick={() => scrollCarousel("left")}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="categories-carousel" ref={categoriesCarouselRef}>
                {categories.map((cat) => (
                  <div
                    key={cat.name}
                    className={`category-card ${activeCategory === cat.name ? "active" : ""}`}
                    onClick={() => setActiveCategory(cat.name)}
                  >
                    <div className="category-image">
                      <img src={cat.imageUrl} alt={cat.name} />
                    </div>
                    <h3>{cat.name}</h3>
                  </div>
                ))}
              </div>
              <button className="carousel-btn right" onClick={() => scrollCarousel("right")}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>

          {/* Popular Events Section */}
          <section className="events-section">
            <h2 className="section-title">Popular Events in {selectedLocation}</h2>

            {/* Filters */}
            <div className="filters-container">
              <button
                className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                All
              </button>
              <button
                className={`filter-btn ${activeFilter === "today" ? "active" : ""}`}
                onClick={() => setActiveFilter("today")}
              >
                Today
              </button>
              <button
                className={`filter-btn ${activeFilter === "tomorrow" ? "active" : ""}`}
                onClick={() => setActiveFilter("tomorrow")}
              >
                Tomorrow
              </button>
              <button
                className={`filter-btn ${activeFilter === "weekend" ? "active" : ""}`}
                onClick={() => setActiveFilter("weekend")}
              >
                This Weekend
              </button>
              <button
                className={`filter-btn ${activeFilter === "free" ? "active" : ""}`}
                onClick={() => setActiveFilter("free")}
              >
                Free
              </button>
              <button
                className={`filter-btn ${activeFilter === "paid" ? "active" : ""}`}
                onClick={() => setActiveFilter("paid")}
              >
                Paid
              </button>
            </div>

            {loading ? (
              <div className="loading-spinner">
                <div className="spinner-dot"></div>
                <div className="spinner-dot"></div>
                <div className="spinner-dot"></div>
              </div>
            ) : (
              <>
                <div className="events-grid">
                  {filteredPopular.slice(0, loadedCounts.popular).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isInterested={interestedEvents.has(event.id)}
                      onToggleInterest={handleInterestedToggle}
                    />
                  ))}
                </div>
                {filteredPopular.length > loadedCounts.popular && (
                  <div className="see-more-container">
                    <button
                      className="see-more-btn"
                      onClick={() => setLoadedCounts((prev) => ({ ...prev, popular: prev.popular + 6 }))}
                    >
                      See More
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Online Events Section */}
          <section className="events-section">
            <h2 className="section-title">Discover Best of Online Events</h2>
            <div className="events-grid">
              {filteredOnline.slice(0, loadedCounts.online).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isInterested={interestedEvents.has(event.id)}
                  onToggleInterest={handleInterestedToggle}
                />
              ))}
            </div>
            {filteredOnline.length > loadedCounts.online && (
              <div className="see-more-container">
                <button
                  className="see-more-btn"
                  onClick={() => setLoadedCounts((prev) => ({ ...prev, online: prev.online + 6 }))}
                >
                  See More
                </button>
              </div>
            )}
          </section>

          {/* CTA Banner */}
          <section className="cta-banner">
            <div>
              <h3>Events specially curated for you!</h3>
              <p>Get event recommendations based on your interests and location.</p>
            </div>
            <button className="cta-btn">Get Started</button>
          </section>

          {/* Trending Events Section */}
          <section className="events-section">
            <h2 className="section-title">Trending Events around the World</h2>
            <div className="events-grid">
              {filteredTrending.slice(0, loadedCounts.trending).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isInterested={interestedEvents.has(event.id)}
                  onToggleInterest={handleInterestedToggle}
                />
              ))}
            </div>
            {filteredTrending.length > loadedCounts.trending && (
              <div className="see-more-container">
                <button
                  className="see-more-btn"
                  onClick={() => setLoadedCounts((prev) => ({ ...prev, trending: prev.trending + 6 }))}
                >
                  See More
                </button>
              </div>
            )}
          </section>

          {/* Create Event CTA */}
          <section className="cta-banner">
            <div>
              <h3>Create an event with MentorLink</h3>
              <p>Have an event to share? Reach a global audience with our easy-to-use tools.</p>
            </div>
            <button className="cta-btn" onClick={() => navigate("/host-an-event")}>
              Create Event
            </button>
          </section>

          {/* Footer inside main for correct responsive width */}
          <Footer />
        </main>
      </div>
    </div>
  );
};

// EventCard Component
const EventCard = ({ event, isInterested, onToggleInterest }) => {
  const navigate = useNavigate();

  const priceDisplay = event.price === 0 ? (
    <span className="price-free">FREE</span>
  ) : (
    <span className="price-paid">Paid · ₹{event.price.toLocaleString()}</span>
  );

  const handleCardClick = () => {
    navigate(`/events/${event.id}`);
  };

  return (
    <div className="event-card-item" onClick={handleCardClick}>
      <div className="event-image-wrapper">
        <img src={event.imageUrl} alt={event.title} />
        <div className="event-date-badge">
          <p className="month">{event.dateDisplay.month}</p>
          <p className="day">{event.dateDisplay.day}</p>
        </div>
      </div>
      <div className="event-details">
        <h3 className="event-title">{event.title}</h3>
        <p className="event-subtitle">{event.subtitle}</p>
        <div className="event-info">
          <p className="event-time">{event.time}</p>
          <div className="event-footer">
            {priceDisplay}
            <button
              className={`interested-btn-small ${isInterested ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleInterest(event.id);
              }}
            >
              <svg className="heart-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{isInterested ? event.interested + 1 : event.interested}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events;
