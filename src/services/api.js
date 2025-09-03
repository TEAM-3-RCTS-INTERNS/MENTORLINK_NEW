// API service for connecting frontend to backend
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
};

// User API functions
export const userAPI = {
  signup: (userData) => apiRequest('/users/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  verifyOTP: (data) => apiRequest('/users/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: (credentials) => apiRequest('/users/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  sendLoginOTP: (data) => apiRequest('/users/send-login-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  loginWithOTP: (data) => apiRequest('/users/login-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Mentor API functions
export const mentorAPI = {
  submitForm: (formData) => apiRequest('/mentors', {
    method: 'POST',
    body: JSON.stringify(formData),
  }),
};

// Student API functions
export const studentAPI = {
  submitForm: (formData) => apiRequest('/students', {
    method: 'POST',
    body: JSON.stringify(formData),
  }),
};
