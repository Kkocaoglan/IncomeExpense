import { useState } from 'react';
import { mfaVerify, mfaVerifyBackup } from '../services/authApi';
import { useAuth } from '../contexts/AuthContext';

export default function MfaPrompt({ tmpToken, onSuccess }) {
  const { setSessionFromAccess } = useAuth();
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState('');
  const [err, setErr] = useState('');

  async function submitTOTP(e) {
    e.preventDefault();
    setErr('');
    try {
      const { accessToken, user } = await mfaVerify({ tmpToken, code });
      setSessionFromAccess(accessToken, user);
      onSuccess && onSuccess();
    } catch (e) {
      setErr('Kod hatalı veya süresi geçti.');
    }
  }

  async function submitBackup(e) {
    e.preventDefault();
    setErr('');
    try {
      const { accessToken, user } = await mfaVerifyBackup({ tmpToken, backupCode: backup });
      setSessionFromAccess(accessToken, user);
      onSuccess && onSuccess();
    } catch (e) {
      setErr('Yedek kod geçersiz.');
    }
  }

  return (
    <div style={{ maxWidth: 360 }}>
      <h2>İki Aşamalı Doğrulama</h2>
      {err && <div style={{ color: 'crimson', marginBottom: 8 }}>{err}</div>}
      <form onSubmit={submitTOTP} style={{ display: 'grid', gap: 8 }}>
        <input value={code} onChange={e=>setCode(e.target.value)} placeholder="6 haneli kod" />
        <button type="submit">Doğrula</button>
      </form>
      <details style={{ marginTop: 12 }}>
        <summary>Yedek kod kullan</summary>
        <form onSubmit={submitBackup} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <input value={backup} onChange={e=>setBackup(e.target.value)} placeholder="yedek kod" />
          <button type="submit">Doğrula</button>
        </form>
      </details>
    </div>
  );
}


