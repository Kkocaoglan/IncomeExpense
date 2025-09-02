import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import styles from './Auth.module.css';

export default function Login() {
  const navigate = useNavigate();
  const { login, setApiAccessToken, setAccessTokenState, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tmpToken, setTmpToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
  const [mfaError, setMfaError] = useState('');

  const canSubmit = email.trim() && password.length >= 6 && !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await apiClient.post('/auth/login', {
        email: email.trim(),
        password,
        remember
      });
      
             console.log('🔍 Login response:', response);
       
       // 2FA kontrolü
       if (response.mfa_required) {
         setTmpToken(response.tmpToken);
         setShow2FAModal(true);
         setSubmitting(false);
         return;
       }
       
       // Normal login - Response'dan gelen verileri kullan
       const { accessToken, user } = response;
       
       // AuthContext'i güncelle - Zaten destructure edilmiş
       setApiAccessToken(accessToken);
       setAccessTokenState(accessToken);
       setUser(user);
      
      // Remember seçeneği için localStorage
      if (remember) {
        localStorage.setItem('auth_remember', 'true');
      } else {
        localStorage.removeItem('auth_remember');
      }
      
      navigate('/', { replace: true });
    } catch (err) {
      console.log('❌ Login error:', err);
      setError('E-posta veya şifre hatalı. Tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  const handleMFAVerification = async () => {
    if (!mfaCode.trim() || mfaCode.length !== 6) {
      setMfaError('Lütfen 6 haneli kodu girin');
      return;
    }

    setIsVerifyingMFA(true);
    setMfaError('');

    try {
      const response = await apiClient.post('/auth/mfa/verify', {
        tmpToken,
        code: mfaCode
      });

      // MFA başarılı, normal login işlemini tamamla
      await login(email.trim(), password, remember);
      navigate('/', { replace: true });
    } catch (error) {
      if (error.response?.data?.error === 'invalid_code') {
        setMfaError('Kod geçersiz');
      } else {
        setMfaError('Doğrulama sırasında bir hata oluştu');
      }
    } finally {
      setIsVerifyingMFA(false);
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.card} role="dialog" aria-labelledby="authTitle" aria-describedby="authDesc">
        <header className={styles.header}>
          {/* Logo'n varsa <img src="/logo.svg" alt="Uygulama logosu" /> koy */}
          <h1 id="authTitle" className={styles.title}>Giriş Yap</h1>
          <p id="authDesc" className={styles.subtitle}>Hesabına eriş ve finanslarını yönet.</p>
        </header>

        {error && (
          <div className={styles.error} role="alert" aria-live="assertive">{error}</div>
        )}

        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="email">E-posta</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={styles.input}
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
            autoFocus
          />

          <div className={styles.row}>
            <label className={styles.label} htmlFor="password">Şifre</label>
            <button
              type="button"
              className={styles.linkBtn}
              aria-pressed={showPw}
              onClick={()=>setShowPw(s=>!s)}
            >
              {showPw ? 'Gizle' : 'Göster'}
            </button>
          </div>
          <input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            className={styles.input}
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
            minLength={6}
          />

          <div className={styles.options}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e)=>setRemember(e.target.checked)}
              />
              <span>Beni hatırla</span>
            </label>
            <button type="button" className={styles.linkBtn} onClick={()=>alert('Şifre sıfırlama yakında.')}>
              Şifremi unuttum
            </button>
          </div>

          <button className={styles.submit} disabled={!canSubmit}>
            {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        <footer className={styles.footer}>
          <span>Hesabın yok mu?</span>
          <Link to="/register" className={styles.linkBtn}>Kayıt ol</Link>
        </footer>
      </div>

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>İki Faktörlü Doğrulama</h2>
              <button 
                onClick={() => setShow2FAModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                Güvenlik için iki faktörlü doğrulama gerekiyor.
                Authenticator uygulamanızdaki 6 haneli kodu girin.
              </p>

              <div className={styles.codeInput}>
                <label htmlFor="mfaCode">Doğrulama Kodu</label>
                <input
                  id="mfaCode"
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className={styles.input}
                />
              </div>

              <button
                onClick={handleMFAVerification}
                disabled={isVerifyingMFA || mfaCode.length !== 6}
                className={styles.submit}
              >
                {isVerifyingMFA ? 'Doğrulanıyor...' : 'Doğrula'}
              </button>

              {mfaError && (
                <p className={`${styles.message} ${styles.error}`}>
                  {mfaError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
