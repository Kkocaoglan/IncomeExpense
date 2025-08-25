import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Loading spinner veya placeholder
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        Yükleniyor...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Login sayfasına yönlendir, geri dönmek için current location'ı sakla
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
