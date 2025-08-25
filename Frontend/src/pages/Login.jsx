import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Auth.module.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('P@ssw0rd!');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.trim() && password.length >= 6 && !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password, remember);
      navigate('/', { replace: true });
    } catch (err) {
      // apiClient generic hata atıyor; kullanıcı dostu mesaj göster
      setError('E-posta veya şifre hatalı. Tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

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
    </div>
  );
}
