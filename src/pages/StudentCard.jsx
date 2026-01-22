import React from "react";
import PeopleIcon from '@mui/icons-material/People';
import "./StudentCard.css";

const StudentCard = ({ student, onClick }) => {
  if (!student) return null;

  // Support both nested user object (from API) and direct properties (mock data)
  const name = student.user?.name || student.name || "Unnamed Student";
  const profileImage = student.user?.profileImage || student.profileImage || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";
  const roleStatus = student.roleStatus || "Student";
  const mentorshipField = student.mentorshipField || [];
  const experienceLevel = student.experienceLevel || "Beginner";
  const goal = student.goal || student.user?.bio || "Learning and growing with mentors";
  const connectionsCount = student.user?.connectionsCount || student.connectionsCount || 0;

  const displaySkills = mentorshipField.length > 3 ? mentorshipField.slice(0, 3) : mentorshipField;
  const remainingSkills = mentorshipField.length > 3 ? mentorshipField.length - 3 : 0;

  return (
    <div className="student-card student-card-pro" onClick={onClick}>
      {/* Header Section */}
      <div className="student-card__header-pro">
        <img
          src={profileImage}
          alt={name}
          className="student-card__avatar-pro"
        />
        <div className="student-card__info-pro">
          <div className="student-card__name-row">
            <h3 className="student-card__name-pro">{name}</h3>
            {/* Standard verification logic for parity */}
            <span className="verified-badge-pro">✓</span>
          </div>
          <div className="student-card__meta-pro">
            <div className="student-card__followers-pro">
              <PeopleIcon style={{ fontSize: 14, marginRight: 4 }} />
              <span>{connectionsCount} connections</span>
            </div>
            <div className="student-card__subtitle-pro">
              {roleStatus} • {experienceLevel}
            </div>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      <div className="student-card__body-pro">
        <p className="student-card__bio-pro">{goal}</p>
      </div>

      {/* Tags Section */}
      <div className="student-card__tags-pro">
        {displaySkills.map((skill, i) => (
          <span key={i} className="student-tag-pro">
            {skill}
          </span>
        ))}
        {remainingSkills > 0 && (
          <span className="student-tag-pro tag--more">+{remainingSkills}</span>
        )}
      </div>

      {/* Footer / Actions Section */}
      <div className="student-card__footer-pro">
        <button className="student-btn-pro" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          View Profile
        </button>
      </div>
    </div>
  );
};

export default StudentCard;
