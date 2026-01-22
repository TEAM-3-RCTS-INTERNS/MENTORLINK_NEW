import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HomeNavbar from '../components/common/HomeNavbar';
import Sidebar from '../components/home/Sidebar';
import { useLayout } from '../contexts/LayoutContext';
import './RequestReview.css';

const RequestReview = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { sidebarCollapsed } = useLayout();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/requests/${requestId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch request');
        }

        const data = await response.json();
        setRequest(data.request);
      } catch (error) {
        console.error('Error fetching request:', error);
        alert('Failed to load request details');
        navigate('/mentor-profile');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId, navigate]);

  const handleAccept = async () => {
    if (processing) return;

    try {
      setProcessing(true);
      const response = await fetch(`http://localhost:5000/api/requests/${requestId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        alert('Request accepted successfully!');
        navigate('/mentor-profile');
      } else {
        throw new Error('Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (processing) return;

    try {
      setProcessing(true);
      const response = await fetch(`http://localhost:5000/api/requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        alert('Request declined.');
        navigate('/mentor-profile');
      } else {
        throw new Error('Failed to decline request');
      }
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Failed to decline request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="request-review-page">
        <HomeNavbar />
        <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          <Sidebar />
          <div className="main-content">
            <div className="loading-spinner">Loading request details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="request-review-page">
        <HomeNavbar />
        <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          <Sidebar />
          <div className="main-content">
            <div className="error-message">Request not found</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="request-review-page">
      <HomeNavbar />
      <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar />
        <div className="main-content">
          <div className="request-review-container">

            {/* Back Button */}
            <button className="back-btn" onClick={() => navigate('/mentor-profile')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>

            {/* Page Title */}
            <h1 className="page-title">Mentorship Request Review</h1>

            <div className="review-content">

              {/* Left Column: Applicant Profile Card */}
              <div className="applicant-profile-card">
                <div className="profile-header">
                  <img
                    src={request.student?.profileImage || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
                    alt={request.student?.name}
                    className="applicant-photo"
                  />
                  <div className="profile-info">
                    <h2>{request.student?.name || 'Student'}</h2>
                    <p className="applicant-title">{request.studentProfile?.roleStatus || 'Student'}</p>
                  </div>
                </div>

                <div className="profile-details">
                  <div className="detail-item">
                    <div className="detail-label">Email</div>
                    <div className="detail-value">{request.student?.email || 'N/A'}</div>
                  </div>

                  {request.student?.location && (
                    <div className="detail-item">
                      <div className="detail-label">Location</div>
                      <div className="detail-value">{request.student.location}</div>
                    </div>
                  )}

                  {request.studentProfile?.experienceLevel && (
                    <div className="detail-item">
                      <div className="detail-label">Experience Level</div>
                      <div className="detail-value">{request.studentProfile.experienceLevel}</div>
                    </div>
                  )}

                  {request.studentProfile?.portfolio && (
                    <div className="detail-item">
                      <div className="detail-label">Portfolio / LinkedIn</div>
                      <div className="detail-value">
                        <a
                          href={request.studentProfile.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="portfolio-link"
                        >
                          View Profile
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bio-section">
                  <h3>About Me</h3>
                  <p>{request.bio || 'No bio provided.'}</p>
                </div>
              </div>

              {/* Right Column: Application Details */}
              <div className="application-details">

                <div className="detail-section">
                  <h3>Why I Need a Mentor</h3>
                  <p>{request.reasonForMentorship || 'No reason provided.'}</p>
                </div>

                <div className="detail-section">
                  <h3>Current Priorities</h3>
                  <p>{request.currentPriorities || 'No priorities specified.'}</p>
                </div>

                <div className="detail-section">
                  <h3>Areas of Support Requested</h3>
                  <div className="support-areas">
                    {request.supportAreas && request.supportAreas.length > 0 ? (
                      request.supportAreas.map((area, index) => (
                        <span key={index} className="support-tag">{area}</span>
                      ))
                    ) : (
                      <p>No support areas specified.</p>
                    )}
                  </div>
                </div>

                {request.studentProfile?.mentorshipTypes && request.studentProfile.mentorshipTypes.length > 0 && (
                  <div className="detail-section">
                    <h3>Preferred Mentorship Types</h3>
                    <div className="support-areas">
                      {request.studentProfile.mentorshipTypes.map((type, index) => (
                        <span key={index} className="support-tag secondary">{type}</span>
                      ))}
                    </div>
                  </div>
                )}

                {request.studentProfile?.frequency && (
                  <div className="detail-section">
                    <h3>Preferred Frequency</h3>
                    <p>{request.studentProfile.frequency}</p>
                  </div>
                )}

                {request.studentProfile?.style && (
                  <div className="detail-section">
                    <h3>Preferred Communication Style</h3>
                    <p>{request.studentProfile.style}</p>
                  </div>
                )}

                {request.attachedFiles && request.attachedFiles.length > 0 && (
                  <div className="detail-section">
                    <h3>Attached Files</h3>
                    <div className="attached-files">
                      {request.attachedFiles.map((file, index) => (
                        <a
                          key={index}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-link"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                            <polyline points="13 2 13 9 20 9" />
                          </svg>
                          {file.fileName || `File ${index + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <h3>Initial Message</h3>
                  <p className="message-text">{request.message || 'No message provided.'}</p>
                </div>

              </div>

            </div>

            {/* Action Buttons */}
            {request.status === 'pending' && (
              <div className="action-buttons-fixed">
                <button
                  className="decline-btn-large"
                  onClick={handleDecline}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Decline'}
                </button>
                <button
                  className="accept-btn-large"
                  onClick={handleAccept}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Accept'}
                </button>
              </div>
            )}

            {request.status !== 'pending' && (
              <div className="status-banner">
                <p>
                  This request has already been{' '}
                  <strong>{request.status === 'accepted' ? 'accepted' : 'rejected'}</strong>.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestReview;
