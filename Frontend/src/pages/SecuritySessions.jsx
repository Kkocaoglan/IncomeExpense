import { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { listSessions, revokeSession, revokeAll, currentSession } from '../services/meApi';

function fmtRel(d) {
  const t = new Date(d).getTime(), now = Date.now();
  const mins = Math.round((t - now)/60000);
  const abs = Math.abs(mins);
  const unit = abs >= 1440 ? `${Math.round(abs/1440)} gün` :
               abs >= 60 ? `${Math.round(abs/60)} saat` : `${abs} dk`;
  return mins < 0 ? `${unit} önce` : `${unit} sonra`;
}

function parseUA(ua='') {
  const isWin = /Windows/i.test(ua), isMac=/Mac/i.test(ua), isLin=/Linux/i.test(ua), isAndroid=/Android/i.test(ua), isiOS=/iPhone|iPad|iPod/i.test(ua);
  const os = isiOS ? 'iOS' : isAndroid ? 'Android' : isMac ? 'macOS' : isWin ? 'Windows' : isLin ? 'Linux' : 'Bilinmiyor';
  const isChrome=/Chrome|Chromium/i.test(ua), isSafari=/Safari/i.test(ua) && !isChrome, isFirefox=/Firefox/i.test(ua), isEdge=/Edg/i.test(ua);
  const browser = isEdge?'Edge':isChrome?'Chrome':isFirefox?'Firefox':isSafari?'Safari':'Tarayıcı';
  return { os, browser };
}

export default function SecuritySessions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [currentId, setCurrentId] = useState(null);

  async function load() {
    setLoading(true); 
    setErr('');
    try {
      const [s, cur] = await Promise.allSettled([listSessions(), currentSession()]);
      if (s.status === 'fulfilled') setRows(s.value);
      if (cur.status === 'fulfilled') setCurrentId(cur.value?.id || null);
    } catch (e) { 
      setErr('Oturumlar yüklenemedi.'); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { 
    load(); 
  }, []);

  const totalActive = rows.length;

  async function onRevoke(id) {
    if (!confirm('Bu oturumu sonlandırmak istiyor musun?')) return;
    try {
      await revokeSession(id);
      setRows(rs => rs.filter(r => r.id !== id));
    } catch (e) {
      setErr('Oturum sonlandırılamadı.');
    }
  }

  async function onRevokeAll() {
    if (!confirm('Tüm oturumlar kapatılsın mı? (Bu cihaz dahil)')) return;
    try {
      await revokeAll();
      setRows([]);
    } catch (e) {
      setErr('Oturumlar sonlandırılamadı.');
    }
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          🔒 Cihazlarım & Oturumlar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aktif oturumlarınızı yönetin ve hesap güvenliğinizi artırın
        </Typography>
      </Box>

      {/* Error Alert */}
      {err && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {err}
        </Alert>
      )}

      {/* Stats */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Aktif Oturumlar: {totalActive}
        </Typography>
      </Paper>

      {/* Actions */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="error"
          size="large"
          onClick={onRevokeAll}
        >
          🗑️ Tüm Oturumları Kapat
        </Button>
      </Box>

      {/* Sessions List */}
      <Paper elevation={3} sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Aktif Oturum Yok
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Şu anda hiçbir cihazda oturum açık değil.
            </Typography>
          </Box>
        ) : (
          <Box>
            {rows.map((r) => {
              const { os, browser } = parseUA(r.userAgent || '');
              const isCurrent = currentId && r.id === currentId;
              
              return (
                <Paper key={r.id} sx={{ p: 2, mb: 2, backgroundColor: isCurrent ? 'success.light' : 'background.paper' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">
                        {browser} - {os}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        IP: {r.ip || 'Bilinmiyor'} | Açılış: {fmtRel(r.createdAt)} | Bitiş: {fmtRel(r.expiresAt)}
                      </Typography>
                      {isCurrent && (
                        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                          ✓ Bu cihaz
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      {!isCurrent && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => onRevoke(r.id)}
                        >
                          🗑️ Sonlandır
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>
    </Container>
  );
}
