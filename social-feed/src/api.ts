// API configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Helper function to get auth token
export const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

// Helper function to set auth token
export const setAuthToken = (token: string) => {
  localStorage.setItem('access_token', token);
};

// Helper function to remove auth token
export const removeAuthToken = () => {
  localStorage.removeItem('access_token');
};

// API calls
export const api = {
  // Authentication
  register: async (userData: { userID: string; name: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    try {
      console.log('Making request to:', `${API_BASE_URL}/login`);
      
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        body: formData,
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response type:', response.type);
      console.log('Response url:', response.url);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.log('Non-JSON response:', textResponse);
        throw new Error(`Server returned non-JSON response: ${textResponse.substring(0, 200)}...`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${data.detail || data.message || 'Unknown error'}`);
      }
      
      return data;
    } catch (error) {
      console.error('Login API error:', error);
      
      // Check if it's a network error (CORS issue)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please check if the backend server is running and CORS is properly configured.');
      }
      
      throw error;
    }
  },

  // Posts
  createPost: async (postData: { 
    userID: string; 
    title: string; 
    content: string; 
    hashtag?: boolean; 
    hashtags?: string[];
  }) => {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(postData),
    });
    return response.json();
  },

  getUserPosts: async (userID: string, limit: number = 10) => {
    const response = await fetch(`${API_BASE_URL}/posts/${userID}?limit=${limit}`);
    return response.json();
  },

  getUserFeed: async (userID: string, limit: number = 10) => {
    const response = await fetch(`${API_BASE_URL}/feed/${userID}?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },

  // Social features
  followUser: async (followerID: string, followeeID: string) => {
    const response = await fetch(`${API_BASE_URL}/follows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ followerID, followeeID }),
    });
    return response.json();
  },

  sharePost: async (userID: string, postID: number) => {
    const response = await fetch(`${API_BASE_URL}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ userID, postID }),
    });
    return response.json();
  },

  // Hashtag generation
  generateHashtags: async (postID?: number, content?: string) => {
    const response = await fetch(`${API_BASE_URL}/hashtags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ postID, content }),
    });
    return response.json();
  },
};
