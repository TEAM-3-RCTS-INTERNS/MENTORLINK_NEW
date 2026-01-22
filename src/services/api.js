// API service for connecting frontend to backend
const inferDevApiBase = () => {
  try {
    if (typeof window !== 'undefined') {
      const isLocal = /localhost|127\.0\.0\.1/i.test(window.location.hostname);
      if (isLocal) {
        return 'http://localhost:5000/api';
      }
    }
  } catch {
    // ignore environment detection errors
  }
  return '/api';
};
const API_BASE_URL = import.meta?.env?.VITE_API_URL || inferDevApiBase();

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Readiness gate: poll /health until backend reports ready or timeout
const waitForBackendReady = async (timeoutMs = 8000) => {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.ready === true || data?.ok === true) return true;
      }
    } catch (err) {
      lastErr = err;
    }
    await new Promise(r => setTimeout(r, 250));
  }
  if (lastErr) {
    // swallow lastErr; caller may retry via outer retry
  }
  return false;
};

// Transient retry/backoff wrapper
const withRetry = async (fn, { attempts = 3, baseDelayMs = 300 } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status;
      const transient = !status || [502, 503, 504].includes(status);
      if (!transient || i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)));
    }
  }
  throw lastErr;
};

// Core API request
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

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const validationErrors = data?.errors?.map?.((e) => e.msg).join(', ');
    const message = validationErrors || data?.message || `API request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

// Public wrapper that ensures backend readiness and retry on transient failures
const apiRequestSafe = async (endpoint, options = {}) => {
  // ensure backend is ready (best-effort)
  // await waitForBackendReady(8000);
  return withRetry(() => apiRequest(endpoint, options));
};

// Expose a healthcheck helper for UI to gate rendering until backend is ready
export const checkBackendReady = async (timeoutMs = 8000) => {
  return waitForBackendReady(timeoutMs);
};

// User API functions
export const userAPI = {
  signup: (userData) => apiRequestSafe('/users/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  verifyOTP: (data) => apiRequestSafe('/users/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: (credentials) => apiRequestSafe('/users/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  sendLoginOTP: (data) => apiRequestSafe('/users/send-login-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  loginWithOTP: (data) => apiRequestSafe('/users/login-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getEvents: () => apiRequestSafe('/events/get-events', {
    method: 'GET',
  }),

  uploadProfilePicture: (formData) => {
    const token = getAuthToken();
    return withRetry(async () => {
      await waitForBackendReady(4000);
      const response = await fetch(`${API_BASE_URL}/users/upload-profile-picture`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }
      return response.json();
    });
  },

  deleteAccount: (reason) => apiRequestSafe('/users/account', {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  }),
};

// Mentor API functions
export const mentorAPI = {
  submitForm: (formData) => apiRequestSafe('/mentors', {
    method: 'POST',
    body: JSON.stringify(formData),
  }),

  getProfile: () => apiRequestSafe('/mentors/profile', {
    method: 'GET',
  }),

  getAllMentors: (params = {}) => {
    const queryParams = new URLSearchParams();

    // Add pagination parameters
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    // Add filter parameters
    if (params.search) queryParams.append('search', params.search);
    if (params.domain) queryParams.append('domain', params.domain);
    if (params.company) queryParams.append('company', params.company);
    if (params.sort) queryParams.append('sort', params.sort);

    const queryString = queryParams.toString();
    const url = queryString ? `/mentors?${queryString}` : '/mentors';

    return apiRequestSafe(url, {
      method: 'GET',
    });
  },

  getMentorById: (id) => apiRequestSafe(`/mentors/${id}`, {
    method: 'GET',
  }),

  updateProfile: (data) => apiRequestSafe('/mentors/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// Student API functions
export const studentAPI = {
  submitForm: (formData) => apiRequestSafe('/students', {
    method: 'POST',
    body: JSON.stringify(formData),
  }),

  getProfile: () => apiRequestSafe('/students/profile', {
    method: 'GET',
  }),

  getAllStudents: () => apiRequestSafe('/students', {
    method: 'GET',
  }),

  getStudentById: (id) => apiRequestSafe(`/students/${id}`, {
    method: 'GET',
  }),

  updateProfileImage: (imageUrl) => apiRequestSafe('/students/profile-image', {
    method: 'PUT',
    body: JSON.stringify({ profileImage: imageUrl }),
  }),

  updateProfile: (data) => apiRequestSafe('/students/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  uploadImage: (formData) => {
    const token = getAuthToken();
    return withRetry(async () => {
      await waitForBackendReady(4000);
      const response = await fetch(`${API_BASE_URL}/students/upload-image`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    });
  },

  uploadBanner: (formData) => {
    const token = getAuthToken();
    return withRetry(async () => {
      await waitForBackendReady(4000);
      const response = await fetch(`${API_BASE_URL}/students/upload-banner`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Banner upload failed');
      }
      return response.json();
    });
  },
};

// Connection API functions
export const connectionAPI = {
  toggleConnection: (userId) => apiRequestSafe(`/connect/${userId}`, {
    method: 'POST',
  }),

  checkConnection: (userId) => apiRequestSafe(`/connect/check/${userId}`, {
    method: 'GET',
  }),

  getConnections: () => apiRequestSafe('/connect', {
    method: 'GET',
  }),
};

// Organizer API functions
export const organizerAPI = {
  submitForm: (formData) => apiRequestSafe('/organizers', {
    method: 'POST',
    body: JSON.stringify(formData),
  }),

  getProfile: () => apiRequestSafe('/organizers/profile', {
    method: 'GET',
  }),

  updateProfile: (profileData) => apiRequestSafe('/organizers/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),

  uploadProfileImage: (formData) => {
    const token = getAuthToken();
    return withRetry(async () => {
      await waitForBackendReady(4000);
      const response = await fetch(`${API_BASE_URL}/organizers/upload-profile-image`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }
      return response.json();
    });
  },

  uploadCoverImage: (formData) => {
    const token = getAuthToken();
    return withRetry(async () => {
      await waitForBackendReady(4000);
      const response = await fetch(`${API_BASE_URL}/organizers/upload-cover-image`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }
      return response.json();
    });
  },
};

// Request API functions
export const requestAPI = {
  submitRequest: (mentorId, data) => apiRequestSafe(`/requests/${mentorId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getMentorRequests: (status) => {
    const query = status ? `?status=${status}` : '';
    return apiRequestSafe(`/requests${query}`, {
      method: 'GET',
    });
  },

  getRequestById: (requestId) => apiRequestSafe(`/requests/${requestId}`, {
    method: 'GET',
  }),

  acceptRequest: (requestId) => apiRequestSafe(`/requests/${requestId}/accept`, {
    method: 'PUT',
  }),

  rejectRequest: (requestId) => apiRequestSafe(`/requests/${requestId}/reject`, {
    method: 'PUT',
  }),
};

// Notification API functions
export const notificationAPI = {
  getNotifications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequestSafe(`/notifications${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  getUnreadCount: () => apiRequestSafe('/notifications/unread-count', {
    method: 'GET',
  }),

  markAsRead: (notificationId) => apiRequestSafe(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  }),

  markAllAsRead: () => apiRequestSafe('/notifications/mark-all-read', {
    method: 'PUT',
  }),

  deleteNotification: (notificationId) => apiRequestSafe(`/notifications/${notificationId}`, {
    method: 'DELETE',
  }),

  deleteAllNotifications: () => apiRequestSafe('/notifications/all', {
    method: 'DELETE',
  }),
};

// Session API functions
export const sessionAPI = {
  createSession: (data) => apiRequestSafe('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getSessions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequestSafe(`/sessions${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  getSessionsWithUser: (userId) => apiRequestSafe(`/sessions/with-user/${userId}`, {
    method: 'GET',
  }),

  getSessionById: (sessionId) => apiRequestSafe(`/sessions/${sessionId}`, {
    method: 'GET',
  }),

  updateSessionStatus: (sessionId, status) => apiRequestSafe(`/sessions/${sessionId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),

  deleteSession: (sessionId) => apiRequestSafe(`/sessions/${sessionId}`, {
    method: 'DELETE',
  }),
};

// Chat/Messaging API functions
export const chatAPI = {
  sendMessage: (data) => apiRequestSafe('/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  uploadAttachment: async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/messages/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }
    
    return response.json();
  },

  getConversations: () => apiRequestSafe('/messages/conversations'),

  getMessages: (recipientId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequestSafe(`/messages/${recipientId}${query ? '?' + query : ''}`);
  },

  markAsRead: (recipientId) => apiRequestSafe(`/messages/mark-read/${recipientId}`, {
    method: 'PUT',
  }),

  deleteMessage: (messageId) => apiRequestSafe(`/messages/${messageId}`, {
    method: 'DELETE',
  }),

  getUnreadCount: () => apiRequestSafe('/messages/unread-count'),

  searchMessages: (query) => apiRequestSafe(`/messages/search?q=${encodeURIComponent(query)}`),
};

// Follow API functions
export const followAPI = {
  toggleFollow: (userId) => apiRequestSafe(`/follow/toggle/${userId}`, {
    method: 'POST',
  }),

  getFollowers: (userId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequestSafe(`/follow/followers/${userId}${query ? '?' + query : ''}`);
  },

  getFollowing: (userId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequestSafe(`/follow/following/${userId}${query ? '?' + query : ''}`);
  },

  checkFollowStatus: (userId) => apiRequestSafe(`/follow/status/${userId}`, {
    method: 'GET',
  }),

  trackProfileView: (mentorId) => apiRequestSafe(`/follow/view/${mentorId}`, {
    method: 'POST',
  }),

  getProfileAnalytics: () => apiRequestSafe('/follow/analytics', {
    method: 'GET',
  }),
};

// Testimonial API functions
export const testimonialAPI = {
  getAllTestimonials: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequestSafe(`/testimonials${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  createTestimonial: (data) => apiRequestSafe('/testimonials', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateTestimonial: (id, data) => apiRequestSafe(`/testimonials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  deleteTestimonial: (id) => apiRequestSafe(`/testimonials/${id}`, {
    method: 'DELETE',
  }),

  approveTestimonial: (id) => apiRequestSafe(`/testimonials/${id}/approve`, {
    method: 'PATCH',
  }),
};