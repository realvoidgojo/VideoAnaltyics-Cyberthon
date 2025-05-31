import axios from 'axios';

// Create an axios instance with default config
const apiClient = axios.create({
  timeout: 300000, // 5 minute timeout
});

// Add a response interceptor for global error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error);
      return Promise.reject({
        ...error,
        message: 'Request timed out. The server might be under heavy load.'
      });
    }
    
    if (!error.response) {
      console.error('Network error:', error);
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection.'
      });
    }
    
    // Handle specific HTTP error codes
    switch (error.response.status) {
      case 400:
        console.error('Bad request:', error);
        return Promise.reject({
          ...error,
          message: error.response.data?.error || 'Invalid request parameters'
        });
      case 500:
        console.error('Server error:', error);
        return Promise.reject({
          ...error,
          message: 'Server error. The team has been notified.'
        });
      default:
        return Promise.reject(error);
    }
  }
);

export default apiClient;