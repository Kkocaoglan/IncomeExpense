import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import styles from './Auth.module.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Email verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [userId, setUserId] = useState(null);

  // Şifre validasyonu
  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 10) errors.push('En az 10 karakter');
    if (!/[A-Z]/.test(pwd)) errors.push('En az 1 büyük harf');
    if (!/[a-z]/.test(pwd)) errors.push('En az 1 küçük harf');
    if (!/[0-9]/.test(pwd)) errors.push('En az 1 rakam');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push('En az 1 noktalama işareti');
    return errors;
  };

  const passwordErrors = validatePassword(password);
  const canSubmit = name.trim() && email.trim() && passwordErrors.length === 0 && !submitting;

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

  const handleResendCode = async () => {
    if (!userId) return;
    
    try {
      await apiClient.post('/auth/email/send', { userId });
      setVerifyMessage('Yeni kod gönderildi!');
    } catch (error) {
      setVerifyMessage('Kod gönderilirken hata oluştu');
    }
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    console.log('🔵 Register form submitted:', { email: email.trim(), name: name.trim() });
    setSubmitting(true);
    setError('');
    try {
      const result = await register(email.trim(), password, name.trim());
      // Modal'ı aç ve userId'yi sakla
      setUserId(result.userId);
      setShowVerificationModal(true);
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response?.data?.error === 'email_exists') {
        setError('Bu e-posta adresi zaten kullanımda.');
      } else if (err.response?.data?.error === 'email_password_required') {
        setError('E-posta ve şifre gereklidir.');
      } else {
        setError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card} role="dialog" aria-labelledby="regTitle">
        <h1 id="regTitle" className={styles.title}>Kayıt Ol</h1>
        {error && <div className={styles.error} role="alert" aria-live="assertive">{error}</div>}
        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="name">Ad</label>
          <input id="name" className={styles.input} value={name} onChange={e=>setName(e.target.value)} required />
          <label className={styles.label} htmlFor="remail">E-posta</label>
          <input id="remail" type="email" className={styles.input} value={email} onChange={e=>setEmail(e.target.value)} required />
          <label className={styles.label} htmlFor="rpassword">Şifre (min 10 karakter, büyük harf, rakam, noktalama işareti)</label>
          <input id="rpassword" type="password" minLength={10} className={styles.input} value={password} onChange={e=>setPassword(e.target.value)} required />
          {password && passwordErrors.length > 0 && (
            <div className={styles.error}>
              Şifre gereksinimleri:
              <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                {passwordErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <button className={styles.submit} disabled={!canSubmit}>{submitting ? 'Gönderiliyor…' : 'Kayıt Ol'}</button>
        </form>
        <footer className={styles.footer}>
          <span>Zaten hesabın var mı?</span>
          <Link to="/login" className={styles.linkBtn}>Giriş yap</Link>
        </footer>
      </div>

      {/* Email Verification Modal */}
      {showVerificationModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>E-posta Doğrulama</h2>
              <button 
                onClick={() => setShowVerificationModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                {email} adresine bir doğrulama kodu gönderdik.
                E-postanızı kontrol edin ve aşağıya kodu girin.
              </p>

              <div className={styles.codeInput}>
                <label htmlFor="verificationCode">Doğrulama Kodu</label>
                <input
                  id="verificationCode"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className={styles.input}
                />
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={isVerifying || verificationCode.length !== 6}
                className={styles.submit}
              >
                {isVerifying ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
              </button>

              {verifyMessage && (
                <p className={`${styles.message} ${verifyMessage.includes('başarıyla') ? styles.success : styles.error}`}>
                  {verifyMessage}
                </p>
              )}

              <button
                onClick={handleResendCode}
                className={styles.resendButton}
              >
                Yeni Kod Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
