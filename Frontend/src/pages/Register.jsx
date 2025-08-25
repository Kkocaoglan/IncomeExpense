import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Auth.module.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = name.trim() && email.trim() && password.length >= 6 && !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await register(email.trim(), password, name.trim()); // arka tarafta login de ediyoruz
      navigate('/', { replace: true });
    } catch (err) {
      setError('Kayıt başarısız. E-posta kullanımda olabilir.');
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
          <label className={styles.label} htmlFor="rpassword">Şifre (min 6)</label>
          <input id="rpassword" type="password" minLength={6} className={styles.input} value={password} onChange={e=>setPassword(e.target.value)} required />
          <button className={styles.submit} disabled={!canSubmit}>{submitting ? 'Gönderiliyor…' : 'Kayıt Ol'}</button>
        </form>
        <footer className={styles.footer}>
          <span>Zaten hesabın var mı?</span>
          <Link to="/login" className={styles.linkBtn}>Giriş yap</Link>
        </footer>
      </div>
    </div>
  );
}
