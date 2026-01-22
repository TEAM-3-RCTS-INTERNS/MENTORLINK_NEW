import React from 'react';
import './LoadingSpinner.css';

/**
 * Reusable loading spinner component
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @param {string} text - Optional loading text
 * @param {boolean} fullPage - Whether to center in full page
 * @param {string} color - Custom color (default: orange)
 */
const LoadingSpinner = ({ 
  size = 'md', 
  text = '', 
  fullPage = false,
  color = '#FF6B35'
}) => {
  const sizeClasses = {
    sm: 'spinner--sm',
    md: 'spinner--md',
    lg: 'spinner--lg',
    xl: 'spinner--xl'
  };

  const spinner = (
    <div className={`loading-spinner ${sizeClasses[size] || 'spinner--md'}`}>
      <div 
        className="spinner-circle"
        style={{ borderTopColor: color }}
      />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-spinner-fullpage">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
