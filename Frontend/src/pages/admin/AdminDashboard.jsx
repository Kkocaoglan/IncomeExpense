import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import adminApi from '../../services/adminApi';

/**
 * ADMIN DASHBOARD
 * Sistem genel durumu ve istatistikleri
 * Sadece admin kullanıcılar erişebilir
 */

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh her 30 saniyede bir
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError('');
      
      const [statsData, healthData] = await Promise.all([
        adminApi.dashboard.getStats(),
        adminApi.system.getHealth()
      ]);
      
      setStats(statsData);
      setSystemHealth(healthData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Dashboard data load failed:', err);
      setError('Dashboard verileri yüklenemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadDashboardData();
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: `${color}.light`,
            color: `${color}.main`,
            mr: 2
          }}>
            {icon}
          </Box>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
        </Box>
        
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>
        
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        
        {trend && (
          <Box sx={{ mt: 2 }}>
            <Chip 
              label={trend} 
              size="small" 
              color={trend.includes('+') ? 'success' : 'error'}
              variant="outlined"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const SystemHealthCard = ({ health }) => {
    const isHealthy = health?.status === 'healthy';
    
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: 2, 
              bgcolor: isHealthy ? 'success.light' : 'error.light',
              color: isHealthy ? 'success.main' : 'error.main',
              mr: 2
            }}>
              {isHealthy ? <CheckCircleIcon /> : <WarningIcon />}
            </Box>
            <Typography variant="h6">
              Sistem Durumu
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              <Chip 
                label={isHealthy ? 'Sağlıklı' : 'Sorunlu'} 
                color={isHealthy ? 'success' : 'error'}
                size="small"
              />
            </Box>
          </Box>

          {health && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Uptime
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {health.uptime?.readable || 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  DB Response
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {health.database?.responseTime}ms
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Memory Usage
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {health.memory?.usage || 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Active Sessions
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {health.sessions?.active || 0}
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            🛡️ Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sistem genel durumu ve istatistikleri
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
            </Typography>
          )}
          
          <Tooltip title="Verileri yenile">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading && stats && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      <Grid container spacing={3}>
        {/* Stats Cards */}
        {stats && (
          <>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Toplam Kullanıcı"
                value={stats.users?.total || 0}
                icon={<PeopleIcon />}
                color="primary"
                subtitle={`${stats.users?.active24h || 0} aktif (24s)`}
                trend={stats.users?.growth > 0 ? `+${stats.users.growth}%` : `${stats.users.growth}%`}
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Toplam İşlem"
                value={stats.transactions?.total || 0}
                icon={<TrendingUpIcon />}
                color="success"
                subtitle={`₺${(stats.transactions?.revenue || 0).toLocaleString('tr-TR')}`}
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Sistem Performansı"
                value={systemHealth?.responseTime ? `${systemHealth.responseTime}ms` : 'N/A'}
                icon={<SpeedIcon />}
                color="info"
                subtitle="API Response Time"
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Güvenlik Durumu"
                value={systemHealth?.status === 'healthy' ? 'Güvenli' : 'Risk'}
                icon={<SecurityIcon />}
                color={systemHealth?.status === 'healthy' ? 'success' : 'error'}
                subtitle="Sistem Güvenliği"
              />
            </Grid>
          </>
        )}

        {/* System Health */}
        <Grid item xs={12} lg={6}>
          <SystemHealthCard health={systemHealth} />
        </Grid>

        {/* Recent Users */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Son Kayıt Olan Kullanıcılar
              </Typography>
              
              {stats?.recent?.users?.map((user, index) => (
                <Box 
                  key={user.id} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    py: 1,
                    borderBottom: index < stats.recent.users.length - 1 ? 1 : 0,
                    borderColor: 'divider'
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {user.name || 'İsimsiz'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip 
                      label={user.role} 
                      size="small" 
                      color={user.role === 'ADMIN' ? 'error' : 'default'}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </Typography>
                  </Box>
                </Box>
              ))}
              
              {!stats?.recent?.users?.length && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  Henüz kullanıcı kaydı yok
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Security Notice */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          🛡️ <strong>Güvenlik Uyarısı:</strong> Bu dashboard sadece yetkili admin kullanıcılar içindir. 
          Tüm aktiviteleriniz güvenlik loglarına kaydedilmektedir. 
          Hassas bilgileri paylaşmayın ve oturumunuzu güvenli tutun.
        </Typography>
      </Alert>
    </Box>
  );
};

export default AdminDashboard;
