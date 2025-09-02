const API_BASE_URL = (typeof window !== 'undefined' && window?.import?.meta?.env?.VITE_API_URL)
  ? window.import.meta.env.VITE_API_URL
  : (typeof window !== 'undefined' && window.location && window.location.port === '5173')
    ? 'http://localhost:5001/api'
    : (import.meta?.env?.VITE_API_URL || '/api');

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

  refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
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

    // Generate Idempotency-Key for write requests if not provided
    const method = String(options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (!headers['Idempotency-Key']) {
        const fallback = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        headers['Idempotency-Key'] = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : fallback;
      }
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
        let errorBody = null;
        const ct = response.headers.get('content-type') || '';
        try {
          if (ct.includes('application/json')) errorBody = await response.json();
          else errorBody = await response.text();
        } catch {}
        const err = new Error(`API Error: ${response.status} ${response.statusText}`);
        err.status = response.status;
        err.response = errorBody;
        throw err;
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
        let errorBody = null;
        const ct = response.headers.get('content-type') || '';
        try {
          if (ct.includes('application/json')) errorBody = await response.json();
          else errorBody = await response.text();
        } catch {}
        const err = new Error(`API Error: ${response.status} ${response.statusText}`);
        err.status = response.status;
        err.response = errorBody;
        throw err;
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
