import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

const EmailVerificationPending = () => {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get user data from navigation state
  const { email, userId } = location.state || {};

  const handleResendEmail = async () => {
    if (!userId) {
      setResendMessage('Kullanıcı bilgisi bulunamadı');
      return;
    }

    setIsResending(true);
    setResendMessage('');

    try {
      await apiClient.post('/auth/email/send', { userId });
      setResendMessage('Doğrulama e-postası tekrar gönderildi!');
    } catch (error) {
      setResendMessage('E-posta gönderilirken bir hata oluştu');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setVerifyMessage('Lütfen 6 haneli kodu girin');
      return;
    }

    setIsVerifying(true);
    setVerifyMessage('');

    try {
      await apiClient.post('/auth/email/verify', { token: verificationCode });
      setVerifyMessage('E-posta adresiniz başarıyla doğrulandı!');
      
      // 3 saniye sonra login sayfasına yönlendir
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      if (error.message.includes('invalid_or_expired')) {
        setVerifyMessage('Kod geçersiz veya süresi dolmuş');
      } else {
        setVerifyMessage('Doğrulama sırasında bir hata oluştu');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            E-posta Doğrulama Gerekiyor
          </h2>
          
          <p className="mt-4 text-sm text-gray-600">
            {email ? `${email} adresine` : 'E-posta adresinize'} bir doğrulama kodu gönderdik.
            E-postanızı kontrol edin ve aşağıya kodu girin.
          </p>

          <div className="mt-6 space-y-4">
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  Doğrulama Kodu
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
              </button>

              {verifyMessage && (
                <p className={`text-sm text-center ${verifyMessage.includes('başarıyla') ? 'text-green-600' : 'text-red-600'}`}>
                  {verifyMessage}
                </p>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-4">
              E-postayı alamadınız mı? Spam klasörünü kontrol edin veya tekrar gönderin.
            </p>

            {userId && (
              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Gönderiliyor...' : 'Tekrar Gönder'}
              </button>
            )}

            {resendMessage && (
              <p className={`text-sm ${resendMessage.includes('hata') ? 'text-red-600' : 'text-green-600'}`}>
                {resendMessage}
              </p>
            )}

            <div className="mt-6">
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                Giriş sayfasına dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPending;
