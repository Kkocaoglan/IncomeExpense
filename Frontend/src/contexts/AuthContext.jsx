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

// Export AuthContext for direct usage
export { AuthContext };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sayfa yüklendiğinde refresh token ile otomatik giriş dene
  useEffect(() => {
    async function tryAutoLogin() {
      try {
        console.log('🔍 AuthContext: Trying auto login...');
        const base = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${base}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-Requested-By': 'IncomeExpenses-Frontend'
          }
        });
        
        console.log('🔄 Refresh response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Refresh success, setting user...');
          setApiAccessToken(data.accessToken); // Update apiClient token
          setAccessTokenState(data.accessToken);
          
          // Access token ile kullanıcı bilgilerini al
          const userResponse = await fetch(`${base}/auth/me`, {
            headers: { Authorization: `Bearer ${data.accessToken}` }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('✅ User data loaded:', userData.email);
            setUser(userData);
          } else {
            console.log('❌ /me failed:', userResponse.status);
          }
        } else {
          const errorText = await response.text();
          console.log('❌ Refresh failed:', response.status, errorText);
        }
      } catch (error) {
        console.log('❌ Auto login failed:', error);
      } finally {
        console.log('🏁 Auto login finished, setting loading false');
        setLoading(false);
      }
    }

    tryAutoLogin();
  }, []);

  const login = async (email, password, remember = true) => {
    const response = await apiClient.post('/auth/login', { 
      email, 
      password, 
      remember
    }, {
      credentials: 'include'
    });

    // MFA isteği gelirse UI bu sonucu kullanabilir
    if (response?.mfa_required) {
      return response; // { mfa_required: true, tmpToken }
    }

    // Normal login
    setApiAccessToken(response.accessToken);
    setAccessTokenState(response.accessToken);
    setUser(response.user);
    
    // 🛡️ CRITICAL: Save accessToken to localStorage for AdminGuard
    localStorage.setItem('accessToken', response.accessToken);
    
    // 🛡️ ADMIN AUTO-REDIRECT SECURITY
    if (response.user?.role === 'ADMIN') {
      // Admin login audit
      console.warn('🛡️ ADMIN LOGIN DETECTED', {
        email: response.user.email,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      // Save login timestamp for session age validation
      localStorage.setItem('lastLoginTime', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Return special admin flag
      response._adminRedirect = true;
    } else {
      // Regular user
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    if (remember) {
      localStorage.setItem('auth_remember', 'true');
    } else {
      localStorage.removeItem('auth_remember');
    }

    return response;
  };

  // Tek noktadan session kurulum helper: accessToken + user
  const setSessionFromAccess = (token, userLike) => {
    if (!token || !userLike) return;
    setApiAccessToken(token);
    setAccessTokenState(token);
    setUser(userLike);
    // Persist for guards and reloads
    try {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('user', JSON.stringify(userLike));
      if (userLike?.role === 'ADMIN') {
        localStorage.setItem('lastLoginTime', Date.now().toString());
      }
    } catch {}
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
    const userId = response?.id;
    console.log('🔍 UserId extracted:', userId);
    
    // E-posta doğrulama gönder (geçici olarak disable)
    if (userId && false) { // Geçici olarak kapatıldı
      console.log('📧 Sending email verification for userId:', userId);
      await apiClient.post('/auth/email/send', { userId });
      console.log('✅ Email verification sent');
    } else {
      console.log('⏸️ Email verification disabled for development');
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
      localStorage.removeItem('accessToken'); // Clear accessToken
      localStorage.removeItem('user'); // Clear user data
    }
  };

  const refreshToken = async () => {
    try {
      const base = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-By': 'IncomeExpenses-Frontend'
        }
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
