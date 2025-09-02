import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';
import styles from './Auth.module.css';

export default function TwoFactorAuth() {
  const { user } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Setup state
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Disable state
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      const response = await apiClient.get('/auth/2fa/status');
      setIs2FAEnabled(response.enabled || false);
    } catch (error) {
      console.log('2FA status error:', error);
      setError('Durum kontrol edilirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setIsSettingUp(true);
      setError('');
      const response = await apiClient.post('/auth/2fa/setup');
      setQrCode(response.data.qr);
      setSecret(response.data.secret);
      setShowSetup(true);
    } catch (error) {
      setError('QR kod oluşturulurken hata oluştu');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Lütfen 6 haneli kodu girin');
      return;
    }

    try {
      setIsSettingUp(true);
      setError('');
      const response = await apiClient.post('/auth/2fa/enable', {
        secret,
        code: verificationCode
      });

      setBackupCodes(response.data.backupCodes);
      setShowBackupCodes(true);
      setIs2FAEnabled(true);
      setShowSetup(false);
      setSuccess('İki faktörlü doğrulama başarıyla etkinleştirildi!');
    } catch (error) {
      if (error.response?.data?.error === 'invalid_code') {
        setError('Kod geçersiz');
      } else {
        setError('Etkinleştirme sırasında hata oluştu');
      }
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disableCode.trim() || disableCode.length !== 6) {
      setError('Lütfen 6 haneli kodu girin');
      return;
    }

    try {
      setIsDisabling(true);
      setError('');
      await apiClient.post('/auth/2fa/disable', {
        code: disableCode
      });

      setIs2FAEnabled(false);
      setShowDisable(false);
      setSuccess('İki faktörlü doğrulama devre dışı bırakıldı');
    } catch (error) {
      if (error.response?.data?.error === 'invalid_code') {
        setError('Kod geçersiz');
      } else {
        setError('Devre dışı bırakma sırasında hata oluştu');
      }
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.shell}>
        <div className={styles.card}>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <h1 className={styles.title}>İki Faktörlü Doğrulama</h1>
        
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={`${styles.message} ${styles.success}`}>{success}</div>}

        <div className={styles.form}>
          <div className={styles.modalText}>
            <p>
              <strong>Mevcut Durum:</strong> {is2FAEnabled ? 'Etkin' : 'Devre Dışı'}
            </p>
            <p>
              İki faktörlü doğrulama, hesabınızı ekstra güvenlik katmanı ile korur.
              Giriş yaparken şifrenizin yanında 6 haneli bir kod da girmeniz gerekir.
            </p>
          </div>

          {!is2FAEnabled ? (
            <button
              onClick={handleSetup2FA}
              disabled={isSettingUp}
              className={styles.submit}
            >
              {isSettingUp ? 'Hazırlanıyor...' : '2FA Etkinleştir'}
            </button>
          ) : (
            <button
              onClick={() => setShowDisable(true)}
              className={styles.submit}
              style={{ backgroundColor: '#dc2626' }}
            >
              2FA Devre Dışı Bırak
            </button>
          )}
        </div>

        {/* Setup Modal */}
        {showSetup && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2>2FA Kurulumu</h2>
                <button 
                  onClick={() => setShowSetup(false)}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <p className={styles.modalText}>
                  1. Google Authenticator veya benzeri bir uygulama indirin<br/>
                  2. QR kodu tarayın veya manuel olarak kodu girin<br/>
                  3. Uygulamada görünen 6 haneli kodu aşağıya yazın
                </p>

                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                  <img src={qrCode} alt="QR Code" style={{ maxWidth: '200px' }} />
                </div>

                <div className={styles.codeInput}>
                  <label>Manuel Kod (QR çalışmazsa):</label>
                  <input
                    type="text"
                    value={secret}
                    readOnly
                    className={styles.input}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

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
                  onClick={handleEnable2FA}
                  disabled={isSettingUp || verificationCode.length !== 6}
                  className={styles.submit}
                >
                  {isSettingUp ? 'Etkinleştiriliyor...' : 'Etkinleştir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backup Codes Modal */}
        {showBackupCodes && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2>Yedek Kodlar</h2>
                <button 
                  onClick={() => setShowBackupCodes(false)}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <p className={styles.modalText}>
                  <strong>Bu kodları güvenli bir yerde saklayın!</strong><br/>
                  Telefonunuzu kaybederseniz bu kodlarla giriş yapabilirsiniz.
                  Her kod sadece bir kez kullanılabilir.
                </p>

                <div style={{ 
                  background: '#f3f4f6', 
                  padding: '15px', 
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.8'
                }}>
                  {backupCodes.map((code, index) => (
                    <div key={index} style={{ marginBottom: '5px' }}>
                      {code}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowBackupCodes(false)}
                  className={styles.submit}
                >
                  Anladım
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disable Modal */}
        {showDisable && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2>2FA Devre Dışı Bırak</h2>
                <button 
                  onClick={() => setShowDisable(false)}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <p className={styles.modalText}>
                  Güvenlik için mevcut doğrulama kodunuzu girmeniz gerekiyor.
                </p>

                <div className={styles.codeInput}>
                  <label htmlFor="disableCode">Doğrulama Kodu</label>
                  <input
                    id="disableCode"
                    type="text"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className={styles.input}
                  />
                </div>

                <button
                  onClick={handleDisable2FA}
                  disabled={isDisabling || disableCode.length !== 6}
                  className={styles.submit}
                  style={{ backgroundColor: '#dc2626' }}
                >
                  {isDisabling ? 'Devre Dışı Bırakılıyor...' : 'Devre Dışı Bırak'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
