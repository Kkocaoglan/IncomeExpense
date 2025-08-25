const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Auth token management
let currentAccessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  currentAccessToken = token;
}

export function getAccessToken() {
  return currentAccessToken;
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'
  }).then(async (response) => {
    if (response.ok) {
      const data = await response.json();
      setAccessToken(data.accessToken);
      return data.accessToken;
    } else {
      setAccessToken(null);
      // Redirect to login - we'll handle this in AuthContext
      window.location.href = '/login';
      return null;
    }
  }).catch(() => {
    setAccessToken(null);
    window.location.href = '/login';
    return null;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization header if we have a token (except for auth endpoints)
    if (currentAccessToken && !endpoint.startsWith('/auth/')) {
      headers.Authorization = `Bearer ${currentAccessToken}`;
    }

    const config = {
      headers,
      credentials: 'include', // Always include cookies for refresh token
      ...options,
    };

    try {
      let response = await fetch(url, config);
      
      // If 401 and not an auth endpoint, try to refresh token
      if (response.status === 401 && !endpoint.startsWith('/auth/')) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Retry the original request with new token
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, { ...config, headers });
        }
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  // POST request
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // POST with FormData (for file uploads)
  async postFormData(endpoint, formData, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'POST',
      body: formData,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API FormData Request failed:', error);
      throw error;
    }
  }

  // PUT request
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

// Create and export a default instance
const apiClient = new ApiClient();

export default apiClient;
export { ApiClient };
