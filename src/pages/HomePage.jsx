import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HomeNavbar from '../components/common/HomeNavbar';
import Sidebar from '../components/home/Sidebar';
import FilterPanel from '../components/home/FilterPanel';
import MentorCard from '../components/home/MentorCard';
import StudentCard from './StudentCard';
import Footer from '../components/common/Footer';
import { mentorAPI, studentAPI } from '../services/api';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import './HomePage.css';

// Motivational quotes for rotating display
const QUOTES = [
  "The right mentor can change the direction of your career.",
  "Mentorship turns confusion into clarity.",
  "Guidance matters more than guesswork.",
  "Learn faster with real-world insights.",
  "Growth is faster when guided.",
  "Great careers are built with the right advice.",
  "Don't learn alone. Learn smarter.",
  "Your growth deserves expert guidance.",
  "Connect with peers who inspire greatness.",
  "Every expert was once a beginner.",
];

// Mentor-specific quotes
const MENTOR_QUOTES = [
  "A mentor is someone who sees more talent and ability within you than you see in yourself.",
  "The greatest gift is not being afraid to question.",
  "Behind every successful person, there is a mentor.",
  "Mentors open doors you didn't even know existed.",
  "The best mentors inspire greatness in others.",
];

// Student/Learner quotes
const STUDENT_QUOTES = [
  "Today's learners are tomorrow's leaders.",
  "Learning never exhausts the mind.",
  "The more you learn, the more you grow.",
  "Education is the passport to the future.",
  "Great things happen when learners connect.",
];

// Time-based greetings
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌆' };
  return { text: 'Welcome Back', emoji: '🌙' };
};

const HomePage = () => {
  const navigate = useNavigate();
  const { getLayoutClass } = useLayout();
  const { user } = useAuth();

  // User profile state
  const [userName, setUserName] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  // Quote rotation state
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);

  // Mentor & Student section quote states
  const [mentorQuoteIndex, setMentorQuoteIndex] = useState(0);
  const [mentorQuoteFading, setMentorQuoteFading] = useState(false);
  const [studentQuoteIndex, setStudentQuoteIndex] = useState(0);
  const [studentQuoteFading, setStudentQuoteFading] = useState(false);

  // Events state
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [activeUpcomingIndex, setActiveUpcomingIndex] = useState(0);
  const [activeLiveIndex, setActiveLiveIndex] = useState(0);

  // Data states
  const [mentors, setMentors] = useState([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Filters (for FilterPanel compatibility)
  const [filters, setFilters] = useState({
    query: '',
    sort: 'experience',
    domains: [],
    companies: [],
  });

  // Fetch user profile for name
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id || !user?.role) {
        setProfileLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        let response;

        if (user.role === 'student') {
          response = await axios.get('http://localhost:5000/api/students/me', { headers });
          setUserName(response.data.student?.name || response.data.name || '');
        } else if (user.role === 'mentor') {
          response = await axios.get('http://localhost:5000/api/mentors/me', { headers });
          setUserName(response.data.mentor?.name || response.data.name || '');
        } else if (user.role === 'organizer') {
          response = await axios.get('http://localhost:5000/api/organizers/me', { headers });
          setUserName(response.data.organizer?.name || response.data.name || '');
        } else {
          setUserName('');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setUserName('');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Quote rotation with fade effect - INCREASED TIME to 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        setQuoteFading(false);
      }, 500);
    }, 7000); // Changed from 4000 to 7000ms

    return () => clearInterval(interval);
  }, []);

  // Mentor quote rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setMentorQuoteFading(true);
      setTimeout(() => {
        setMentorQuoteIndex((prev) => (prev + 1) % MENTOR_QUOTES.length);
        setMentorQuoteFading(false);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Student quote rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setStudentQuoteFading(true);
      setTimeout(() => {
        setStudentQuoteIndex((prev) => (prev + 1) % STUDENT_QUOTES.length);
        setStudentQuoteFading(false);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live events auto-scroll (shift every 4 seconds)
  useEffect(() => {
    if (ongoingEvents.length === 0) return;
    const interval = setInterval(() => {
      setActiveLiveIndex((prev) => (prev + 1) % (ongoingEvents.length + 1)); // +1 for stay tuned card
    }, 4000);
    return () => clearInterval(interval);
  }, [ongoingEvents.length]);

  // Upcoming events auto-scroll (shift every 4 seconds)
  useEffect(() => {
    if (upcomingEvents.length === 0) return;
    const interval = setInterval(() => {
      setActiveUpcomingIndex((prev) => (prev + 1) % (upcomingEvents.length + 1)); // +1 for stay tuned card
    }, 4000);
    return () => clearInterval(interval);
  }, [upcomingEvents.length]);

  // Fetch mentors
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setMentorsLoading(true);
        const response = await mentorAPI.getAllMentors({ limit: 6 });
        setMentors((response.mentors || []).slice(0, 6));
      } catch (err) {
        console.error('Error fetching mentors:', err);
      } finally {
        setMentorsLoading(false);
      }
    };
    fetchMentors();
  }, []);

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setStudentsLoading(true);
        const response = await studentAPI.getAllStudents();
        setStudents((response.students || []).slice(0, 6));
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Fetch events and categorize into ongoing/upcoming
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const res = await axios.get('http://localhost:5000/api/events/get-events');
        const rawEvents = res.data.events || [];
        const now = new Date();

        const formattedEvents = rawEvents.map((e) => {
          const startDate = e.startDate ? new Date(e.startDate) : new Date();
          const endDate = e.endDate ? new Date(e.endDate) : new Date(startDate.getTime() + 86400000);
          const month = startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
          const day = startDate.getDate();

          const timeDiff = startDate - now;
          const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

          return {
            id: e._id,
            title: e.eventName || 'Untitled Event',
            subtitle: e.tagline || e.details?.substring(0, 50) || 'No description',
            location: e.contactAddress?.split(',')[0] || 'Location TBA',
            eventMode: e.eventMode || 'Online',
            imageUrl: e.bannerImageUrl || 'https://placehold.co/400x200/4B5563/FFFFFF?text=Event',
            startDate,
            endDate,
            dateDisplay: { month, day: String(day) },
            time: e.timings || 'TBA',
            price: e.isPaid ? e.amount : 0,
            daysLeft: daysLeft > 0 ? daysLeft : 0,
          };
        });

        // Ongoing: started but not ended
        const ongoing = formattedEvents
          .filter(e => e.startDate <= now && e.endDate >= now)
          .sort((a, b) => a.endDate - b.endDate);

        // Upcoming: not started yet
        const upcoming = formattedEvents
          .filter(e => e.startDate > now)
          .sort((a, b) => a.startDate - b.startDate)
          .slice(0, 10);

        setOngoingEvents(ongoing);
        setUpcomingEvents(upcoming);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Testimonials data
  const testimonials = useMemo(() => [
    { id: 't1', text: 'MentorLink connected me with an industry expert who helped me land my dream job at Google.', author: 'Amit Verma', company: 'Google', avatar: 'https://i.pravatar.cc/100?img=31' },
    { id: 't2', text: 'The mentorship sessions boosted my confidence and skills. Highly recommend MentorLink.', author: 'Priya Singh', company: 'Amazon', avatar: 'https://i.pravatar.cc/100?img=32' },
    { id: 't3', text: 'My mentor helped me navigate a career switch into UX design. Invaluable advice.', author: 'Rohit Patel', company: 'Adobe', avatar: 'https://i.pravatar.cc/100?img=33' },
    { id: 't4', text: 'The interactive sessions and real-world insights were game changers for me.', author: 'Sneha Rao', company: 'Microsoft', avatar: 'https://i.pravatar.cc/100?img=34' },
    { id: 't5', text: 'Easy to use platform with mentors who are truly invested in your success.', author: 'Karan Mehta', company: 'Meta', avatar: 'https://i.pravatar.cc/100?img=35' },
    { id: 't6', text: 'I gained clarity on my career path and built a strong professional network.', author: 'Neha Sharma', company: 'LinkedIn', avatar: 'https://i.pravatar.cc/100?img=36' },
    { id: 't7', text: 'MentorLink helped me prepare for technical interviews with great feedback.', author: 'Rahul Jain', company: 'Google', avatar: 'https://i.pravatar.cc/100?img=37' },
    { id: 't8', text: 'The mentors are approachable and knowledgeable. Learned a lot about leadership.', author: 'Divya Kapoor', company: 'Amazon', avatar: 'https://i.pravatar.cc/100?img=38' },
  ], []);

  // Skeleton loaders
  const renderMentorSkeleton = (count = 6) => (
    Array.from({ length: count }).map((_, idx) => (
      <div key={`mentor-skeleton-${idx}`} className="mentor-card-skeleton">
        <div className="skeleton-header">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-text-group">
            <div className="skeleton-line skeleton-line-title"></div>
            <div className="skeleton-line skeleton-line-subtitle"></div>
          </div>
        </div>
        <div className="skeleton-line skeleton-line-bio"></div>
        <div className="skeleton-line skeleton-line-bio short"></div>
      </div>
    ))
  );

  const renderStudentSkeleton = (count = 6) => (
    Array.from({ length: count }).map((_, idx) => (
      <div key={`student-skeleton-${idx}`} className="student-card-skeleton">
        <div className="skeleton-header">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-text-group">
            <div className="skeleton-line skeleton-line-title"></div>
            <div className="skeleton-line skeleton-line-subtitle"></div>
          </div>
        </div>
        <div className="skeleton-line skeleton-line-bio"></div>
      </div>
    ))
  );

  const greeting = getGreeting();
  const layoutClass = getLayoutClass();

  return (
    <>
      <HomeNavbar />
      <div className={layoutClass}>
        <Sidebar />

        <main className="home-main">
          {/* WELCOME + EVENTS - Compact Header */}
          <div className="page-hero">
            <div className="hero-greeting">
              <span className="hero-emoji">{greeting.emoji}</span>
              <span className="hero-text">
                {greeting.text}{userName && !profileLoading ? `, ${userName}` : ''}!
              </span>
            </div>
            <p className={`hero-quote ${quoteFading ? 'quote--fading' : ''}`}>
              "{QUOTES[quoteIndex]}"
            </p>
          </div>

          {/* EVENTS ROW - Both Live & Upcoming in one flow */}
          <div className="events-row">
            {/* Live Events - Full Width Banner */}
            {!eventsLoading && ongoingEvents.length > 0 && (
              <div className="events-block events-block--live">
                <div className="events-block__header events-block__header--center">
                  <span className="badge badge--live">🔴 LIVE</span>
                  <span className="events-block__title">Happening Now</span>
                </div>
                <div className="banner-container">
                  {ongoingEvents.map((event, idx) => (
                    <div
                      key={`live-${event.id}`}
                      className={`banner-card ${idx === activeLiveIndex ? 'banner-card--active' : 'banner-card--hidden'}`}
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <div className="banner-card__img">
                        <img src={event.imageUrl} alt={event.title} />
                        <span className="banner-card__tag banner-card__tag--live">LIVE NOW</span>
                      </div>
                      <div className="banner-card__info">
                        <h4>{event.title}</h4>
                        <p>📍 {event.location} • {event.eventMode}</p>
                      </div>
                    </div>
                  ))}
                  {/* Stay Tuned Card */}
                  <div className={`banner-card banner-stay-tuned ${activeLiveIndex === ongoingEvents.length ? 'banner-card--active' : 'banner-card--hidden'}`}>
                    <div className="banner-stay-tuned__content">
                      <span>🎯</span>
                      <p>Stay tuned for more live events!</p>
                    </div>
                  </div>
                </div>
                {/* Dots indicator */}
                <div className="events-dots">
                  {[...ongoingEvents, { id: 'stay-tuned' }].map((_, idx) => (
                    <button
                      key={idx}
                      className={`events-dot ${idx === activeLiveIndex ? 'events-dot--active' : ''}`}
                      onClick={() => setActiveLiveIndex(idx)}
                      aria-label={`Go to event ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events - Full Width Banner */}
            {!eventsLoading && (
              <div className="events-block events-block--upcoming">
                <div className="events-block__header events-block__header--center">
                  <span className="badge badge--upcoming">📅 UPCOMING</span>
                  <span className="events-block__title">Don't Miss Out</span>
                  <button className="see-all-btn" onClick={() => navigate('/events')}>See all →</button>
                </div>
                {upcomingEvents.length > 0 ? (
                  <>
                    <div className="banner-container">
                      {upcomingEvents.map((event, idx) => (
                        <div
                          key={`upcoming-${event.id}`}
                          className={`banner-card ${idx === activeUpcomingIndex ? 'banner-card--active' : 'banner-card--hidden'}`}
                          onClick={() => navigate(`/events/${event.id}`)}
                        >
                          <div className="banner-card__img">
                            <img src={event.imageUrl} alt={event.title} />
                            <span className="banner-card__tag banner-card__tag--upcoming">
                              {event.daysLeft === 0 ? 'Today!' : `${event.daysLeft}d left`}
                            </span>
                          </div>
                          <div className="banner-card__info">
                            <h4>{event.title}</h4>
                            <p>📍 {event.location} • {event.eventMode}</p>
                          </div>
                        </div>
                      ))}
                      {/* Stay Tuned Card */}
                      <div className={`banner-card banner-stay-tuned banner-stay-tuned--upcoming ${activeUpcomingIndex === upcomingEvents.length ? 'banner-card--active' : 'banner-card--hidden'}`}>
                        <div className="banner-stay-tuned__content">
                          <span>✨</span>
                          <p>Stay tuned for more upcoming events!</p>
                        </div>
                      </div>
                    </div>
                    {/* Dots indicator */}
                    <div className="events-dots">
                      {[...upcomingEvents, { id: 'stay-tuned' }].map((_, idx) => (
                        <button
                          key={idx}
                          className={`events-dot ${idx === activeUpcomingIndex ? 'events-dot--active' : ''}`}
                          onClick={() => setActiveUpcomingIndex(idx)}
                          aria-label={`Go to event ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="banner-stay-tuned banner-stay-tuned--upcoming banner-stay-tuned--only">
                    <div className="banner-stay-tuned__content">
                      <span>✨</span>
                      <p>No upcoming events yet. Stay tuned!</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MENTORS SECTION */}
          {(mentorsLoading || mentors.length > 0) && (
            <div className="content-block content-block--mentors">
              <div className="content-block__header content-block__header--center">
                <h3>👨‍🏫 Mentors for You</h3>
                <p className={`section-quote ${mentorQuoteFading ? 'section-quote--fading' : ''}`}>
                  "{MENTOR_QUOTES[mentorQuoteIndex]}"
                </p>
                <button className="see-all-btn" onClick={() => navigate('/mentors')}>View more →</button>
              </div>
              <div className="mentors-grid">
                {mentorsLoading ? renderMentorSkeleton(6) : (
                  mentors.map((m) => (
                    <MentorCard
                      key={m._id || m.id}
                      mentor={m}
                      onClick={() => m._id && navigate(`/mentors/${m._id}`)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* STUDENTS SECTION */}
          {(studentsLoading || students.length > 0) && (
            <div className="content-block content-block--students">
              <div className="content-block__header content-block__header--center">
                <h3>🎓 Active Learners</h3>
                <p className={`section-quote ${studentQuoteFading ? 'section-quote--fading' : ''}`}>
                  "{STUDENT_QUOTES[studentQuoteIndex]}"
                </p>
                <button className="see-all-btn" onClick={() => navigate('/students')}>View more →</button>
              </div>
              <div className="students-grid">
                {studentsLoading ? renderStudentSkeleton(6) : (
                  students.map((s) => (
                    <StudentCard
                      key={s._id || s.id}
                      student={s}
                      onClick={() => s._id && navigate(`/students/${s._id}`)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* TESTIMONIALS SECTION - Beautiful Infinite Scroll */}
          <div className="testimonials-section">
            <div className="testimonials-header">
              <span className="testimonials-badge">💬 TESTIMONIALS</span>
              <h3 className="testimonials-title">What Our Community Says</h3>
              <p className="testimonials-subtitle">Real stories from real people who transformed their careers</p>
            </div>
            
            {/* Infinite scroll track */}
            <div className="testimonials-marquee">
              <div className="testimonials-track">
                {/* First set of cards */}
                {testimonials.map((t) => (
                  <div key={t.id} className="testimonial-card-new">
                    <div className="testimonial-card-new__quote">"</div>
                    <p className="testimonial-card-new__text">{t.text}</p>
                    <div className="testimonial-card-new__author">
                      <img src={t.avatar} alt={t.author} className="testimonial-card-new__avatar" />
                      <div className="testimonial-card-new__info">
                        <span className="testimonial-card-new__name">{t.author}</span>
                        <span className="testimonial-card-new__company">
                          <span className="company-icon">🏢</span> {t.company}
                        </span>
                      </div>
                    </div>
                    <div className="testimonial-card-new__stars">⭐⭐⭐⭐⭐</div>
                  </div>
                ))}
                {/* Duplicate for seamless loop */}
                {testimonials.map((t) => (
                  <div key={`${t.id}-dup`} className="testimonial-card-new">
                    <div className="testimonial-card-new__quote">"</div>
                    <p className="testimonial-card-new__text">{t.text}</p>
                    <div className="testimonial-card-new__author">
                      <img src={t.avatar} alt={t.author} className="testimonial-card-new__avatar" />
                      <div className="testimonial-card-new__info">
                        <span className="testimonial-card-new__name">{t.author}</span>
                        <span className="testimonial-card-new__company">
                          <span className="company-icon">🏢</span> {t.company}
                        </span>
                      </div>
                    </div>
                    <div className="testimonial-card-new__stars">⭐⭐⭐⭐⭐</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <Footer />
        </main>

        <FilterPanel filters={filters} setFilters={setFilters} />
      </div>
    </>
  );
};

export default HomePage;
