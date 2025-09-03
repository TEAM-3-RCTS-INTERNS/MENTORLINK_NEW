import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Signup.css';
import logo from '../assets/mentorlink-logo.png';
import { FiUser, FiMail, FiPhone, FiEdit2, FiChevronDown, FiLock } from 'react-icons/fi';
import { userAPI } from '../services/api';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    mobile: '',
    email: '',
    bio: '',
    gender: '',
    role: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);

    try {
      const response = await userAPI.signup(formData);
      console.log('Signup response:', response);

      // Store user ID for OTP verification
      localStorage.setItem('userId', response.userId);

      // Navigate to OTP verification page
      navigate('/otp');
    } catch (error) {
      console.error('Signup error:', error);
      alert('Signup failed: ' + error.message);
    }
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    navigate('/login');
  };

  return (
    <div className="signup-page">
      <header className="signup-header">
        <img src={logo} alt="MentorLink Logo" className="signup-logo" />
        <div className="header-actions">
          <button className="theme-toggle">🌙</button>
          <button className="signin-btn" onClick={handleSignIn}>Sign In</button>
        </div>
      </header>

      <div className="signup-container">
        <h2 className="signup-title">Tell us About you..</h2>
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name*</label>
            <div className="input-with-icon">
              <FiUser className="input-icon" />
              <input
                type="text"
                name="name"
                placeholder="Enter your Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Username*</label>
            <div className="input-with-icon">
              <FiUser className="input-icon" />
              <input
                type="text"
                name="username"
                placeholder="Enter Username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mobile Number*</label>
            <div className="input-with-icon">
              <FiPhone className="input-icon" />
              <input
                type="tel"
                name="mobile"
                placeholder="Enter Mobile Number"
                value={formData.mobile}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email*</label>
            <div className="input-with-icon">
              <FiMail className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="Enter your Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password*</label>
            <div className="input-with-icon">
              <FiLock className="input-icon" />
              <input
                type="password"
                name="password"
                placeholder="Enter your Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Bio*</label>
            <div className="input-with-icon">
              <FiEdit2 className="input-icon" />
              <textarea
                name="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Gender*</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={formData.gender === 'male'}
                  onChange={handleChange}
                  required
                />
                <span className="radio-label">Male</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={formData.gender === 'female'}
                  onChange={handleChange}
                />
                <span className="radio-label">Female</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="other"
                  checked={formData.gender === 'other'}
                  onChange={handleChange}
                />
                <span className="radio-label">Other</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Role*</label>
            <div className="select-wrapper">
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="role-select"
                required
              >
                <option value="">Select your role</option>
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
                <option value="organizer">Event Organizer</option>
              </select>
              <FiChevronDown className="select-arrow" />
            </div>
          </div>

          <button type="submit" className="submit-btn">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
