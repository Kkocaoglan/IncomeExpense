import { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { setAccessToken as setApiAccessToken } from '../services/apiClient';

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
  const [accessToken, setAccessTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sayfa yüklendiğinde refresh token ile otomatik giriş dene
  useEffect(() => {
    async function tryAutoLogin() {
      try {
        const response = await fetch('http://localhost:5001/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setApiAccessToken(data.accessToken); // Update apiClient token
          setAccessTokenState(data.accessToken);
          
          // Access token ile kullanıcı bilgilerini al
          const userResponse = await fetch('http://localhost:5001/api/auth/me', {
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

    setApiAccessToken(response.data.accessToken); // Update apiClient token
    setAccessTokenState(response.data.accessToken);
    setUser(response.data.user);
    
    // Remember seçeneği için localStorage'a işaret koyabiliriz
    if (remember) {
      localStorage.setItem('auth_remember', 'true');
    } else {
      localStorage.removeItem('auth_remember');
    }

    return response.data;
  };

  // Tek noktadan session kurulum helper: accessToken + user
  const setSessionFromAccess = (token, userLike) => {
    if (!token || !userLike) return;
    setApiAccessToken(token);
    setAccessTokenState(token);
    setUser(userLike);
  };

  const register = async (email, password, name) => {
    console.log('🟡 AuthContext register called:', { email, name });
    // Kayıt yap
    const response = await apiClient.post('/auth/register', { 
      email, 
      password, 
      name 
    });
    console.log('🟢 Register response:', response);

    // E-posta doğrulama için userId döndür (backend direkt user objesini döndürüyor)
    const userId = response?.id || response.data?.id;
    console.log('🔍 UserId extracted:', userId);
    
    // E-posta doğrulama gönder
    if (userId) {
      console.log('📧 Sending email verification for userId:', userId);
      await apiClient.post('/auth/email/send', { userId });
      console.log('✅ Email verification sent');
    } else {
      console.log('❌ No userId found, skipping email send');
    }

    return { userId, email };
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {}, {
        credentials: 'include'
      });
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      setApiAccessToken(null); // Clear apiClient token
      setAccessTokenState(null);
      setUser(null);
      localStorage.removeItem('auth_remember');
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setApiAccessToken(data.accessToken); // Update apiClient token
        setAccessTokenState(data.accessToken);
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
    isAuthenticated: !!user && !!accessToken,
    setApiAccessToken,
    setAccessTokenState,
    setUser,
    setSessionFromAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
