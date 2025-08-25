import { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { setAccessToken } from '../services/apiClient';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sayfa yüklendiğinde refresh token ile otomatik giriş dene
  useEffect(() => {
    async function tryAutoLogin() {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.accessToken); // Update apiClient token
          
          // Access token ile kullanıcı bilgilerini al
          const userResponse = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${data.accessToken}` }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser(userData);
          }
        }
      } catch (error) {
        console.log('Auto login failed:', error);
      } finally {
        setLoading(false);
      }
    }

    tryAutoLogin();
  }, []);

  const login = async (email, password, remember = true) => {
    const response = await apiClient.post('/auth/login', { 
      email, 
      password 
    }, {
      credentials: 'include'
    });

    setAccessToken(response.accessToken); // Update apiClient token
    setUser(response.user);
    
    // Remember seçeneği için localStorage'a işaret koyabiliriz
    if (remember) {
      localStorage.setItem('auth_remember', 'true');
    } else {
      localStorage.removeItem('auth_remember');
    }

    return response;
  };

  const register = async (email, password, name) => {
    // Önce kayıt yap
    await apiClient.post('/auth/register', { 
      email, 
      password, 
      name 
    });

    // Sonra otomatik giriş yap
    return await login(email, password, true);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {}, {
        credentials: 'include'
      });
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      setAccessToken(null); // Clear apiClient token
      setUser(null);
      localStorage.removeItem('auth_remember');
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken); // Update apiClient token
        return data.accessToken;
      } else {
        // Refresh başarısız, logout yap
        await logout();
        return null;
      }
    } catch (error) {
      console.log('Refresh failed:', error);
      await logout();
      return null;
    }
  };

  const value = {
    user,
    accessToken,
    loading,
    login,
    register,
    logout,
    refreshToken,
    isAuthenticated: !!user && !!accessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
