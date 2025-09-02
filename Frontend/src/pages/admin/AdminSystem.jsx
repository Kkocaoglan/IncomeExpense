import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import adminApi from '../../services/adminApi';

/**
 * ADMIN SYSTEM HEALTH
 * Sistem durumu, performans metrikleri, veritabanı sağlığı
 */

const AdminSystem = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [database, setDatabase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [health, perf, db] = await Promise.all([
        adminApi.system.getHealth(),
        adminApi.system.getPerformance(),
        adminApi.system.getDatabase()
      ]);
      
      setSystemHealth(health);
      setPerformance(perf);
      setDatabase(db);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Sistem verileri yüklenemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  if (loading && !systemHealth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          🖥️ Sistem Durumu
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
            </Typography>
          )}
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSystemData}
            disabled={loading}
          >
            Yenile
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* System Health Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Genel Durum</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {getStatusIcon(systemHealth?.overall)}
                <Chip 
                  label={systemHealth?.overall || 'Bilinmiyor'} 
                  color={getStatusColor(systemHealth?.overall)}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {systemHealth?.message || 'Sistem durumu kontrol ediliyor...'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <MemoryIcon color="primary" />
                <Typography variant="h6">Bellek Kullanımı</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h4" color="primary">
                  {performance?.memory?.usagePercent || 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {performance?.memory?.used || 0} MB / {performance?.memory?.total || 0} MB
                </Typography>
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={performance?.memory?.usagePercent || 0}
                color={performance?.memory?.usagePercent > 80 ? 'warning' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StorageIcon color="primary" />
                <Typography variant="h6">Disk Kullanımı</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h4" color="primary">
                  {performance?.disk?.usagePercent || 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {performance?.disk?.used || 0} GB / {performance?.disk?.total || 0} GB
                </Typography>
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={performance?.disk?.usagePercent || 0}
                color={performance?.disk?.usagePercent > 85 ? 'warning' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Database Health */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🗄️ Veritabanı Durumu
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {database?.connections?.active || 0}
                </Typography>
                <Typography variant="caption">Aktif Bağlantı</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {database?.performance?.queryTime || 0}ms
                </Typography>
                <Typography variant="caption">Ortalama Sorgu Süresi</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {database?.performance?.queriesPerSecond || 0}
                </Typography>
                <Typography variant="caption">Sorgu/Saniye</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {database?.size?.total || 0} MB
                </Typography>
                <Typography variant="caption">Toplam Boyut</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 Performans Metrikleri
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Metrik</TableCell>
                  <TableCell>Değer</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Son Güncelleme</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>CPU Kullanımı</TableCell>
                  <TableCell>{performance?.cpu?.usagePercent || 0}%</TableCell>
                  <TableCell>
                    <Chip 
                      label={performance?.cpu?.status || 'Bilinmiyor'} 
                      color={getStatusColor(performance?.cpu?.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{performance?.cpu?.lastUpdate || 'N/A'}</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell>Uptime</TableCell>
                  <TableCell>{performance?.uptime || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label="Çalışıyor" 
                      color="success"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{performance?.uptimeLastUpdate || 'N/A'}</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell>API Response Time</TableCell>
                  <TableCell>{performance?.api?.avgResponseTime || 0}ms</TableCell>
                  <TableCell>
                    <Chip 
                      label={performance?.api?.status || 'Bilinmiyor'} 
                      color={getStatusColor(performance?.api?.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{performance?.api?.lastUpdate || 'N/A'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* System Services */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🔧 Sistem Servisleri
          </Typography>
          
          <Grid container spacing={2}>
            {systemHealth?.services?.map((service, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1
                }}>
                  {getStatusIcon(service.status)}
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {service.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {service.description}
                    </Typography>
                  </Box>
                  
                  <Chip 
                    label={service.status} 
                    color={getStatusColor(service.status)}
                    size="small"
                  />
                </Box>
              </Grid>
            )) || (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Servis bilgisi bulunamadı
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminSystem;
