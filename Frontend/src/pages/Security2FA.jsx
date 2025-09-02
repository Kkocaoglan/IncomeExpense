import { useState } from 'react';
import { twofaSetup, twofaEnable, twofaDisable } from '../services/authApi';

export default function Security2FA() {
  const [setup, setSetup] = useState(null); // {secret, otpauth, qr}
  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [backup, setBackup] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    try {
      setLoading(true);
      setError('');
      const s = await twofaSetup();
      setSetup(s);
    } catch (e) {
      setError('QR oluşturulamadı');
    } finally { setLoading(false); }
  }

  async function enable() {
    if (!setup?.secret || code.length !== 6) return;
    try {
      setLoading(true);
      setError('');
      const res = await twofaEnable({ secret: setup.secret, code });
      setBackup(res.backupCodes || []);
      setEnabled(true);
    } catch (e) {
      setError('Kod geçersiz veya süre doldu');
    } finally { setLoading(false); }
  }

  async function disable(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const dCode = form.get('disableCode');
    if (!dCode || dCode.toString().length !== 6) return;
    try {
      setLoading(true);
      setError('');
      await twofaDisable({ code: dCode.toString() });
      setEnabled(false);
      setBackup([]);
      setSetup(null);
    } catch (e) {
      setError('Devre dışı bırakılamadı');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h2>İki Aşamalı Doğrulama</h2>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}

      {!enabled && !setup && (
        <button onClick={startSetup} disabled={loading}>
          {loading ? 'Hazırlanıyor...' : 'QR Oluştur'}
        </button>
      )}

      {setup && !enabled && (
        <div style={{ marginTop: 12 }}>
          <img src={setup.qr} alt="TOTP QR" style={{ width: 180, height: 180 }} />
          <p>Authenticator uygulamasını açıp bu QR’ı tara. Sonra 6 haneli kodu gir.</p>
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder="6 haneli kod" />
          <button onClick={enable} disabled={loading || code.length !== 6}>
            {loading ? 'Etkinleştiriliyor...' : 'Etkinleştir'}
          </button>
        </div>
      )}

      {enabled && (
        <>
          <div style={{ marginTop: 12, padding: 8, border: '1px solid #ddd' }}>
            <strong>Yedek Kodlar</strong>
            <p>Bu kodları güvenli bir yere kaydet. Her biri bir kez kullanılabilir.</p>
            <ul>{backup.map((c,i)=>(<li key={i}><code>{c}</code></li>))}</ul>
          </div>
          <details style={{ marginTop: 12 }}>
            <summary>2FA’yı devre dışı bırak</summary>
            <form onSubmit={disable} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <input name="disableCode" placeholder="6 haneli kod" />
              <button type="submit" disabled={loading}>
                {loading ? 'Devre dışı bırakılıyor...' : 'Devre Dışı Bırak'}
              </button>
            </form>
          </details>
        </>
      )}
    </div>
  );
}


