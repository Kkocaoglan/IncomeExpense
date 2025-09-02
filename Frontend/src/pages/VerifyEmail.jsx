import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

const VerifyEmail = () => {
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('E-posta doğrulaması yapılıyor...');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // URL'den token'ı al
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('Geçersiz doğrulama bağlantısı');
          return;
        }

        // API'ye doğrulama isteği gönder
        const response = await apiClient.post('/auth/email/verify', { token });
        
        if (response.data.ok) {
          setStatus('success');
          setMessage('E-posta adresiniz başarıyla doğrulandı!');
          
          // 3 saniye sonra login sayfasına yönlendir
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (error) {
        setStatus('error');
        if (error.response?.data?.error === 'invalid_or_expired') {
          setMessage('Doğrulama bağlantısı geçersiz veya süresi dolmuş');
        } else {
          setMessage('Doğrulama sırasında bir hata oluştu');
        }
      }
    };

    verifyEmail();
  }, [location, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
        );
      case 'success':
        return (
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {getIcon()}
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            E-posta Doğrulama
          </h2>
          
          <p className="mt-4 text-sm text-gray-600">
            {message}
          </p>

          {status === 'success' && (
            <p className="mt-2 text-xs text-gray-500">
              3 saniye içinde giriş sayfasına yönlendirileceksiniz...
            </p>
          )}

          {status === 'error' && (
            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Giriş Sayfasına Dön
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
