import { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';

/**
 * ADMIN SECURITY GUARD
 * Bu component sadece admin kullanıcıların admin sayfalarına erişmesini sağlar
 * Multi-layer security kontrolü yapar
 */

const AdminGuard = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const [securityCheck, setSecurityCheck] = useState('checking');
  const [denialReason, setDenialReason] = useState('');

  useEffect(() => {
    performSecurityCheck();
  }, [user, location]);

  const performSecurityCheck = async () => {
    try {
      // DEBUG LOGS
      console.log('🔍 AdminGuard Debug:', {
        user,
        userRole: user?.role,
        hasAccessToken: !!localStorage.getItem('accessToken'),
        path: location.pathname
      });

      // Layer 1: Authentication check
      if (!user) {
        console.log('❌ Layer 1 Failed: No user');
        setDenialReason('Giriş yapmanız gerekiyor');
        setSecurityCheck('denied');
        return;
      }

      // Layer 2: Role verification
      if (user.role !== 'ADMIN') {
        console.log('❌ Layer 2 Failed: Role is', user.role, 'expected ADMIN');
        setDenialReason('Admin yetkisi gerekiyor');
        setSecurityCheck('denied');
        
        // Security audit log
        console.warn('🚨 SECURITY ALERT: Non-admin user attempted admin access', {
          userId: user.id,
          email: user.email,
          attemptedPath: location.pathname,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        
        return;
      }

      // Layer 3: Session validation
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('❌ Layer 3 Failed: No access token');
        setDenialReason('Geçersiz oturum');
        setSecurityCheck('denied');
        return;
      }

      console.log('✅ All security layers passed!');
      setSecurityCheck('granted');

    } catch (error) {
      console.error('Security check failed:', error);
      setDenialReason('Güvenlik kontrolü başarısız');
      setSecurityCheck('denied');
    }
  };

  // Loading state
  if (loading || securityCheck === 'checking') {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Güvenlik kontrolü yapılıyor...
        </Typography>
      </Box>
    );
  }

  // Access denied
  if (securityCheck === 'denied') {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        p: 3
      }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            🚫 Erişim Reddedildi
          </Typography>
          <Typography variant="body2">
            {denialReason}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Bu olay güvenlik loglarına kaydedilmiştir.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Access granted - render admin content
  return (
    <Box>
      {/* Security watermark - sadece development'ta görünür */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          right: 0, 
          bgcolor: 'error.main', 
          color: 'white', 
          p: 1, 
          fontSize: 12,
          zIndex: 9999,
          opacity: 0.8
        }}>
          🛡️ ADMIN MODE
        </Box>
      )}
      
      {children}
    </Box>
  );
};

export default AdminGuard;
