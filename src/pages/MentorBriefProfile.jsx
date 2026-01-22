import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HomeNavbar from '../components/common/HomeNavbar';
import Sidebar from '../components/home/Sidebar';
import Footer from '../components/common/Footer';
import { mentorAPI, requestAPI, followAPI, connectionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import './MentorBriefProfile.css';

const MentorBriefProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { sidebarCollapsed } = useLayout();

    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [menteesCount, setMenteesCount] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState('none'); // none, pending, connected
    const [following, setFollowing] = useState(false);
    const [canMessage, setCanMessage] = useState(false);

    const [showConnectionModal, setShowConnectionModal] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        linkedIn: '',
        currentRole: '',
        experience: '',
        objective: '',
        message: '',
        preferredMeetingTime: '',
        agreedToTerms: false,
    });

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchMentor = async () => {
            try {
                setLoading(true);
                const response = await mentorAPI.getMentorById(id);

                if (!response || !response.mentor) {
                    throw new Error('Mentor not found');
                }

                setMentor(response.mentor);
                setFollowersCount(response.mentor.user?.followersCount || 0);
                setMenteesCount(response.mentor.menteesCount || response.mentor.activeMentees?.length || 0);

                // If user is authenticated, check follow/connection status
                if (isAuthenticated()) {
                    // Track profile view
                    try {
                        await followAPI.trackProfileView(response.mentor._id);
                    } catch (err) {
                        console.log('View tracking skipped');
                    }

                    // Check follow status
                    try {
                        const followStatus = await followAPI.checkFollowStatus(response.mentor.user?._id);
                        setIsFollowing(followStatus.isFollowing);
                        if (followStatus.followersCount) setFollowersCount(followStatus.followersCount);
                    } catch (err) {
                        console.log('Follow check skipped');
                    }

                    // Check connection status
                    try {
                        const connStatus = await connectionAPI.checkConnection(response.mentor.user?._id);
                        if (connStatus.isConnected) {
                            setConnectionStatus('connected');
                        } else if (connStatus.status === 'pending') {
                            setConnectionStatus('pending');
                        }
                    } catch (err) {
                        console.log('Connection check skipped');
                    }

                    // Check if can message
                    try {
                        const mentorshipResponse = await fetch(
                            `http://localhost:5000/api/requests/check-mentorship-status/${response.mentor.user?._id}`,
                            {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                            }
                        );
                        if (mentorshipResponse.ok) {
                            const mentorshipData = await mentorshipResponse.json();
                            setCanMessage(mentorshipData.canMessage);
                        }
                    } catch (err) {
                        console.log('Mentorship check skipped');
                    }
                }
            } catch (error) {
                console.error('Error fetching mentor:', error);
                navigate('/mentors');
            } finally {
                setLoading(false);
            }
        };

        fetchMentor();
    }, [id, navigate, isAuthenticated]);

    const handleFollowToggle = async () => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        try {
            setFollowing(true);
            const response = await followAPI.toggleFollow(mentor.user._id);
            setIsFollowing(response.isFollowing);
            setFollowersCount(response.followersCount || 0);
        } catch (error) {
            console.error('Error toggling follow:', error);
        } finally {
            setFollowing(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAuthenticated()) {
            alert('Please login to send a connection request');
            navigate('/login');
            return;
        }

        // Validate all required fields
        if (!formData.fullName || !formData.fullName.trim()) {
            alert('Please enter your full name');
            return;
        }

        if (!formData.email || !formData.email.trim()) {
            alert('Please enter your email address');
            return;
        }

        if (!formData.phone || !formData.phone.trim()) {
            alert('Please enter your phone number');
            return;
        }

        if (!formData.currentRole || !formData.currentRole.trim()) {
            alert('Please enter your current role');
            return;
        }

        if (!formData.experience) {
            alert('Please select your years of experience');
            return;
        }

        if (!formData.objective || !formData.objective.trim()) {
            alert('Please describe what you hope to achieve through this mentorship');
            return;
        }

        if (!formData.preferredMeetingTime) {
            alert('Please select your preferred meeting schedule');
            return;
        }

        if (!formData.agreedToTerms) {
            alert('Please agree to the terms and conditions');
            return;
        }

        // Prepare request data outside try block for error logging
        const requestData = {
            message: formData.message || `I am interested in connecting with you as a mentor to discuss ${formData.objective}`,
            bio: `${formData.fullName} - ${formData.currentRole} with ${formData.experience} of experience`,
            reasonForMentorship: formData.objective,
            currentPriorities: formData.preferredMeetingTime,
            supportAreas: ['Career Growth', 'Professional Development'], // Default support areas
            contactInfo: {
                email: formData.email,
                phone: formData.phone,
                linkedIn: formData.linkedIn
            }
        };

        try {
            setSubmitting(true);

            console.log('Submitting request to mentor:', mentor.user._id);
            console.log('Request data:', requestData);
            console.log('Auth token exists:', !!localStorage.getItem('token'));

            const response = await requestAPI.submitRequest(mentor.user._id, requestData);

            console.log('Response received:', response);

            // Navigate to the connection request view page
            if (response && response.request && response.request._id) {
                navigate(`/connection-request/${response.request._id}`);
            } else {
                alert('Connection request sent successfully! The mentor will review your request.');
                setShowConnectionModal(false);
            }

            // Reset form
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                linkedIn: '',
                currentRole: '',
                experience: '',
                objective: '',
                message: '',
                preferredMeetingTime: '',
                agreedToTerms: false,
            });
        } catch (error) {
            console.error('Error submitting request:', error);
            console.error('Error details:', error.details);
            console.error('Request data:', requestData);

            // Show more detailed error message
            let errorMessage = 'Failed to send connection request. ';
            if (error.message) {
                errorMessage += error.message;
            } else if (error.details?.message) {
                errorMessage += error.details.message;
            } else {
                errorMessage += 'Please try again.';
            }

            alert(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="mentor-brief-profile-page">
                <HomeNavbar />
                <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
                    <Sidebar />
                    <main className="main-content">
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Loading profile...</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (!mentor) {
        return (
            <div className="mentor-brief-profile-page">
                <HomeNavbar />
                <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
                    <Sidebar />
                    <main className="main-content">
                        <div className="error-container">
                            <h2>Mentor not found</h2>
                            <button onClick={() => navigate('/mentors')}>Browse Mentors</button>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="mentor-brief-profile-page">
            <HomeNavbar />
            <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
                <Sidebar />
                <main className="main-content">
                    {/* ===== SINGLE UNIFIED PROFILE CONTAINER ===== */}
                    <div className="profile-container">
                        
                        {/* BANNER */}
                        <div className="profile-banner" style={{
                            backgroundImage: mentor.coverImage 
                                ? `url(${mentor.coverImage})` 
                                : 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)'
                        }} />
                        
                        {/* PROFILE INFO - Avatar + Identity + About on right */}
                        <div className="profile-info">
                            <img
                                src={mentor.user?.profileImage || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
                                alt={mentor.user?.name}
                                className="profile-avatar"
                            />
                            <div className="profile-identity">
                                <h1>{mentor.user?.name || 'Mentor'}</h1>
                                <p className="username">@{mentor.user?.name?.toLowerCase().replace(/\s+/g, '') || 'mentor'}</p>
                                <p className="domain">{mentor.primaryDomain || 'Technology'}</p>
                                <p className="stats">{followersCount || 0} followers · {menteesCount || 0} mentees</p>
                            </div>
                            {/* About - On the right side */}
                            <div className="profile-about">
                                <h2>About</h2>
                                <p>{mentor.user?.bio || mentor.user?.about || 'No bio available'}</p>
                            </div>
                        </div>

                        {/* PROFILE BODY - Details Grid */}
                        <div className="profile-body">
                            {/* Details Grid - Two Columns */}
                            <section className="details-section">
                                <h2>Details</h2>
                                <div className="details-grid">
                                    <div className="col-left">
                                        {mentor.skills?.length > 0 && (
                                            <div className="detail-row">
                                                <label>EXPERTISE IN</label>
                                                <div className="tags">{mentor.skills.map((s, i) => <span key={i}>{s}</span>)}</div>
                                            </div>
                                        )}
                                        {mentor.mentoringStyle?.length > 0 && (
                                            <div className="detail-row">
                                                <label>MENTORING STYLE</label>
                                                <div className="tags">{mentor.mentoringStyle.map((s, i) => <span key={i}>{s}</span>)}</div>
                                            </div>
                                        )}
                                        {mentor.linkedin && (
                                            <div className="detail-row">
                                                <label>LINKEDIN</label>
                                                <a href={mentor.linkedin} target="_blank" rel="noopener noreferrer">{mentor.linkedin}</a>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-right">
                                        {mentor.primaryExperience && (
                                            <div className="detail-row">
                                                <label>EXPERIENCE</label>
                                                <span>{mentor.primaryExperience}</span>
                                            </div>
                                        )}
                                        {mentor.weeklyAvailability?.length > 0 && (
                                            <div className="detail-row">
                                                <label>AVAILABILITY</label>
                                                <span>{mentor.weeklyAvailability.join(', ')}</span>
                                            </div>
                                        )}
                                        {mentor.mentorshipExperience && (
                                            <div className="detail-row">
                                                <label>MENTORED</label>
                                                <span>{mentor.mentorshipExperience}</span>
                                            </div>
                                        )}
                                        {mentor.secondaryDomain && (
                                            <div className="detail-row">
                                                <label>ALSO EXPERT IN</label>
                                                <span>{mentor.secondaryDomain}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* ACTION BUTTONS - At Bottom */}
                            <div className="profile-actions-wrapper">
                                <p className="mentoring-cta">
                                    Interested in mentoring? <strong>Connect</strong> with {mentor.user?.name?.split(' ')[0] || 'this mentor'} to get started!
                                </p>
                                <div className="profile-actions">
                                    <button 
                                        className={`btn-follow ${isFollowing ? 'following' : ''}`}
                                        onClick={handleFollowToggle}
                                        disabled={following}
                                    >
                                        {following ? '...' : isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                    <button 
                                        className={`btn-connect ${connectionStatus}`}
                                        onClick={() => connectionStatus === 'none' && setShowConnectionModal(true)}
                                        disabled={connectionStatus !== 'none'}
                                    >
                                        {connectionStatus === 'connected' ? '✓ Connected' : connectionStatus === 'pending' ? 'Pending' : 'Connect'}
                                    </button>
                                    {canMessage && (
                                        <button className="btn-message" onClick={() => navigate(`/messages/${mentor.user?._id}`)}>
                                            Message
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* ===== END PROFILE CONTAINER ===== */}

                    <Footer />
                </main>
            </div>

            {/* Connection Request Modal */}
            {showConnectionModal && (
                        <div className="modal-overlay" onClick={() => setShowConnectionModal(false)}>
                            <div className="connection-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h2>Send Connection Request</h2>
                                    <button className="close-modal-btn" onClick={() => setShowConnectionModal(false)}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="connection-modal-form">
                                    {/* Full Name */}
                                    <div className="modal-form-group">
                                        <label>Full Name*</label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            placeholder="Enter your full name"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    {/* Email and Phone - Two columns */}
                                    <div className="modal-form-row">
                                        <div className="modal-form-group">
                                            <label>Email Address*</label>
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="your.email@example.com"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label>Phone Number*</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                placeholder="+1 (555) 000-0000"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* LinkedIn Profile */}
                                    <div className="modal-form-group">
                                        <label>LinkedIn Profile</label>
                                        <input
                                            type="url"
                                            name="linkedIn"
                                            placeholder="https://linkedin.com/in/yourprofile"
                                            value={formData.linkedIn}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Current Role and Experience - Two columns */}
                                    <div className="modal-form-row">
                                        <div className="modal-form-group">
                                            <label>Current Role*</label>
                                            <input
                                                type="text"
                                                name="currentRole"
                                                placeholder="e.g., Software Engineer"
                                                value={formData.currentRole}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label>Years of Experience*</label>
                                            <select
                                                name="experience"
                                                value={formData.experience}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select...</option>
                                                <option value="0-1 years">0-1 years</option>
                                                <option value="1-3 years">1-3 years</option>
                                                <option value="3-5 years">3-5 years</option>
                                                <option value="5-10 years">5-10 years</option>
                                                <option value="10+ years">10+ years</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Mentorship Objective */}
                                    <div className="modal-form-group">
                                        <label>What do you hope to achieve through this mentorship?*</label>
                                        <textarea
                                            name="objective"
                                            placeholder="Share your goals and what you're looking to learn..."
                                            value={formData.objective}
                                            onChange={handleInputChange}
                                            required
                                            rows={3}
                                        />
                                    </div>

                                    {/* Additional Message */}
                                    <div className="modal-form-group">
                                        <label>Message to Mentor</label>
                                        <textarea
                                            name="message"
                                            placeholder="Introduce yourself and explain why you'd like to connect with this mentor..."
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            rows={4}
                                        />
                                    </div>

                                    {/* Preferred Meeting Time */}
                                    <div className="modal-form-group">
                                        <label>Preferred Meeting Schedule*</label>
                                        <select
                                            name="preferredMeetingTime"
                                            value={formData.preferredMeetingTime}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select your availability...</option>
                                            <option value="Weekday Mornings">Weekday Mornings (9 AM - 12 PM)</option>
                                            <option value="Weekday Afternoons">Weekday Afternoons (12 PM - 5 PM)</option>
                                            <option value="Weekday Evenings">Weekday Evenings (5 PM - 9 PM)</option>
                                            <option value="Weekends">Weekends (Flexible)</option>
                                            <option value="Flexible">Flexible / As per mentor's availability</option>
                                        </select>
                                    </div>

                                    {/* Terms Agreement */}
                                    <div className="modal-form-group">
                                        <label className="modal-checkbox-label terms-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={formData.agreedToTerms}
                                                onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                                            />
                                            <span>I agree to respect the mentor's time and commitment policy</span>
                                        </label>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="cancel-modal-btn"
                                            onClick={() => setShowConnectionModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="submit-modal-btn"
                                            disabled={submitting}
                                        >
                                            {submitting ? 'Sending Request...' : 'Send Connection Request'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
        </div>
    );
};

export default MentorBriefProfile;
