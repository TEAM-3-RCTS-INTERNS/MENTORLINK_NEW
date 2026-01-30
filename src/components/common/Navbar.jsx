import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { FiMoon, FiSun, FiMenu, FiX } from "react-icons/fi";
import "./Navbar.css";
import logoImage from "../../assets/mentorlink-logo.png";

const Navbar = () => {
  const [dark, setDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Load saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    setDark(isDark);
    document.body.classList.toggle("dark-mode", isDark);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle theme
  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.body.classList.toggle("dark-mode", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close menu on link click
  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-logo" onClick={() => navigate("/home")}>
          <img src={logoImage} alt="MentorLink Logo" className="logo-image" />
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        {/* Right Side: Menu + Button + Dark Mode Toggle */}
        <div className={`navbar-right ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="navbar-menu">
            <a href="#hero" className="nav-link" onClick={() => handleNavClick('#hero')}>Home</a>
            <a href="#about" className="nav-link" onClick={() => handleNavClick('#about')}>About</a>
            <a href="#contact" className="nav-link" onClick={() => handleNavClick('#contact')}>Contact</a>
          </div>

          <button
            className="get-started-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate("/login");
            }}
          >
            Get Started
          </button>

          {/* Dark Mode Toggle */}
          <button
            className="theme-toggle-square"
            onClick={toggleDark}
            aria-label="Toggle dark mode"
          >
            {dark ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div
            className="mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>
    </nav>
  );
};

export default Navbar;