import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Pagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Grid
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import adminApi from '../../services/adminApi';

/**
 * ADMIN SECURITY LOGS
 * Güvenlik logları, audit trail, şüpheli aktiviteler
 */

const AdminSecurity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadSecurityLogs();
    loadSecurityStats();
  }, [pagination.page, pagination.limit, filters]);

  const loadSecurityLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await adminApi.security.getLogs(params);
      setLogs(response.logs);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));
    } catch (err) {
      setError('Güvenlik logları yüklenemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityStats = async () => {
    try {
      const statsData = await adminApi.security.getStats();
      setStats(statsData);
    } catch (err) {
      console.warn('Güvenlik istatistikleri yüklenemedi:', err);
    }
  };

  const handleViewLog = (log) => {
    setSelectedLog(log);
    setViewDialog(true);
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Tüm güvenlik logları silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?')) {
      return;
    }
    
    try {
      await adminApi.security.clearLogs();
      await loadSecurityLogs();
      await loadSecurityStats();
    } catch (err) {
      setError('Loglar temizlenemedi: ' + err.message);
    }
  };

  const handleExportLogs = async () => {
    try {
      await adminApi.security.exportLogs(filters);
    } catch (err) {
      setError('Loglar dışa aktarılamadı: ' + err.message);
    }
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getLevelIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <InfoIcon />;
      case 'low': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'authentication': return 'primary';
      case 'authorization': return 'warning';
      case 'data_access': return 'info';
      case 'system': return 'default';
      default: return 'default';
    }
  };

  if (loading && logs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        🛡️ Güvenlik Logları
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Security Stats */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error">
                  {stats.criticalCount || 0}
                </Typography>
                <Typography variant="caption">Kritik Olay</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning">
                  {stats.highCount || 0}
                </Typography>
                <Typography variant="caption">Yüksek Risk</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info">
                  {stats.todayCount || 0}
                </Typography>
                <Typography variant="caption">Bugün</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {stats.totalCount || 0}
                </Typography>
                <Typography variant="caption">Toplam</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Arama"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="IP, kullanıcı, olay..."
              size="small"
              sx={{ minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Seviye</InputLabel>
              <Select
                value={filters.level}
                onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                label="Seviye"
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="critical">Kritik</MenuItem>
                <MenuItem value="high">Yüksek</MenuItem>
                <MenuItem value="medium">Orta</MenuItem>
                <MenuItem value="low">Düşük</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Tip</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                label="Tip"
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="authentication">Kimlik Doğrulama</MenuItem>
                <MenuItem value="authorization">Yetkilendirme</MenuItem>
                <MenuItem value="data_access">Veri Erişimi</MenuItem>
                <MenuItem value="system">Sistem</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Başlangıç Tarihi"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Bitiş Tarihi"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadSecurityLogs}
            >
              Yenile
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportLogs}
        >
          Dışa Aktar
        </Button>
        
        <Button
          variant="outlined"
          color="warning"
          startIcon={<DeleteIcon />}
          onClick={handleClearLogs}
        >
          Logları Temizle
        </Button>
      </Box>

      {/* Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tarih</TableCell>
              <TableCell>Seviye</TableCell>
              <TableCell>Tip</TableCell>
              <TableCell>Kullanıcı</TableCell>
              <TableCell>IP Adresi</TableCell>
              <TableCell>Olay</TableCell>
              <TableCell>Detay</TableCell>
              <TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(log.timestamp).toLocaleString('tr-TR')}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Chip 
                    icon={getLevelIcon(log.level)}
                    label={log.level} 
                    color={getLevelColor(log.level)}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  <Chip 
                    label={log.type} 
                    color={getTypeColor(log.type)}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {log.userEmail || 'Anonim'}
                  </Typography>
                  {log.userId && (
                    <Typography variant="caption" color="text.secondary">
                      ID: {log.userId.substring(0, 8)}...
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {log.ipAddress || 'N/A'}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200 }}>
                    {log.event}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 150 }}>
                    {log.details?.substring(0, 50) || 'Detay yok'}
                    {log.details?.length > 50 && '...'}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Tooltip title="Detayları Görüntüle">
                    <IconButton
                      size="small"
                      onClick={() => handleViewLog(log)}
                      color="primary"
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* View Log Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="primary" />
            Güvenlik Log Detayı
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedLog && (
            <List>
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Tarih"
                  secondary={new Date(selectedLog.timestamp).toLocaleString('tr-TR')}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Seviye"
                  secondary={
                    <Chip 
                      icon={getLevelIcon(selectedLog.level)}
                      label={selectedLog.level} 
                      color={getLevelColor(selectedLog.level)}
                      size="small"
                    />
                  }
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Kullanıcı"
                  secondary={`${selectedLog.userEmail || 'Anonim'} (${selectedLog.userId || 'N/A'})`}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="IP Adresi"
                  secondary={selectedLog.ipAddress || 'N/A'}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Olay"
                  secondary={selectedLog.event}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Detaylar"
                  secondary={selectedLog.details || 'Detay yok'}
                />
              </ListItem>
              
              {selectedLog.metadata && (
                <>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <InfoIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Meta Veri"
                      secondary={
                        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      }
                    />
                  </ListItem>
                </>
              )}
            </List>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminSecurity;
