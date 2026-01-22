import React, { useState } from "react";
import {
  FiCheckCircle,
  FiUserPlus,
  FiUserCheck
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import PeopleIcon from '@mui/icons-material/People';
import { followAPI } from "../../services/api";
import "../../pages/StudentCard.css";
import "./MentorCard.css";

const MentorCard = ({ mentor, onClick }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Extract mentor data with fallbacks
  const profileImage = mentor.user?.profileImage || mentor.avatar || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png';
  const name = mentor.user?.name || mentor.name || 'Mentor';
  const rawBio = mentor.user?.bio || mentor.bio || 'Experienced professional passionate about mentoring and helping others grow.';
  // Truncate bio text to ~180 characters for 3-4 lines display
  const bio = rawBio.length > 180 ? rawBio.substring(0, 180) + "..." : rawBio;
  const role = mentor.role || mentor.title || 'Professional Mentor';
  const company = mentor.company || '';
  const experience = mentor.primaryExperience || mentor.experience || '5+ years';
  const skills = mentor.skills || [];
  const verified = mentor.verified !== undefined ? mentor.verified : true;
  const userId = mentor.user?._id || mentor._id;
  const followersCount = mentor.user?.followersCount || mentor.followersCount || 0;

  const [isFollowing, setIsFollowing] = useState(mentor.isFollowing || false);
  const [localFollowersCount, setLocalFollowersCount] = useState(followersCount);
  const [loading, setLoading] = useState(false);

  const handleFollowClick = async (e) => {
    e.stopPropagation();

    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (!userId) return;

    const wasFollowing = isFollowing;
    const originalCount = localFollowersCount;

    try {
      setLoading(true);
      setIsFollowing(!wasFollowing);
      setLocalFollowersCount(prev => wasFollowing ? Math.max(0, prev - 1) : prev + 1);

      const response = await followAPI.toggleFollow(userId);
      setIsFollowing(response.isFollowing);
      setLocalFollowersCount(response.followersCount);
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setLocalFollowersCount(originalCount);
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectClick = (e) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const displaySkills = skills.length > 3 ? skills.slice(0, 3) : skills;
  const remainingSkills = skills.length > 3 ? skills.length - 3 : 0;

  return (
    <div className="student-card mentor-card-pro" onClick={() => onClick && onClick()}>
      {/* Header Section */}
      <div className="mentor-card__header-pro">
        <div className="mentor-avatar-wrapper-pro">
          <img
            src={profileImage}
            alt={name}
            className="mentor-card__avatar-pro"
          />
          <div className="mentor-avatar-badge-pro">
            <PeopleIcon style={{ fontSize: 10 }} />
            <span>{localFollowersCount > 999 ? (localFollowersCount / 1000).toFixed(1) + 'k' : localFollowersCount}</span>
          </div>
        </div>
        <div className="mentor-card__info-pro">
          <div className="mentor-card__name-row">
            <h3 className="mentor-card__name-pro">{name}</h3>
            {verified && <span className="verified-badge-pro">✓</span>}
          </div>
          <div className="mentor-card__meta-pro">
            <div className="mentor-card__subtitle-pro">
              {role}{company && ` • ${company}`}
            </div>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      <div className="mentor-card__body-pro">
        <p className="mentor-card__bio-pro">{bio}</p>
      </div>

      {/* Skills Section */}
      <div className="mentor-card__skills-pro">
        {displaySkills.map((skill, i) => (
          <span key={i} className="mentor-tag-pro">
            {skill}
          </span>
        ))}
        {remainingSkills > 0 && (
          <span className="mentor-tag-pro tag--more">+{remainingSkills}</span>
        )}
      </div>

      {/* Actions Section */}
      <div className="mentor-card__footer-pro">
        <div className="mentor-card__actions-pro">
          <button
            className="mentor-btn-pro mentor-btn-follow"
            onClick={handleFollowClick}
            disabled={loading}
          >
            {isFollowing ? <FiUserCheck /> : <FiUserPlus />}
            <span>{loading ? '...' : isFollowing ? 'Following' : 'Follow'}</span>
          </button>
          <button className="mentor-btn-pro mentor-btn-connect" onClick={handleConnectClick}>
            Connect
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorCard;
