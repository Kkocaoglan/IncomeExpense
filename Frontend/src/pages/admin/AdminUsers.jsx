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
  IconButton,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import adminApi from '../../services/adminApi';

/**
 * ADMIN USER MANAGEMENT
 * Kullanıcı listesi, rol güncelleme, oturum sonlandırma
 */

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    role: ''
  });
  const [editDialog, setEditDialog] = useState({
    open: false,
    user: null,
    newRole: ''
  });
  
  // Step-up authentication for critical operations
  const [stepUpAuth, setStepUpAuth] = useState({
    open: false,
    operation: null,
    password: '',
    mfaCode: '',
    loading: false
  });

  useEffect(() => {
    loadUsers();
  }, [pagination.page, pagination.limit, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        role: filters.role
      };
      
      const response = await adminApi.users.getUsers(params);
      setUsers(response.users);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));
    } catch (err) {
      // Kullanıcı dostu hata mesajları
      let userFriendlyError = 'Kullanıcılar yüklenemedi';
      if (err.message.includes('401')) {
        userFriendlyError = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      } else if (err.message.includes('403')) {
        userFriendlyError = 'Bu işlem için yetkiniz bulunmamaktadır.';
      } else if (err.message.includes('500')) {
        userFriendlyError = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      }
      setError(userFriendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async () => {
    // Step-up authentication required for role changes
    setStepUpAuth({
      open: true,
      operation: {
        type: 'role_update',
        userId: editDialog.user.id,
        newRole: editDialog.newRole,
        userEmail: editDialog.user.email
      },
      password: '',
      mfaCode: '',
      loading: false
    });
  };

  const confirmRoleUpdate = async () => {
    try {
      setStepUpAuth(prev => ({ ...prev, loading: true }));
      
      // Verify step-up authentication
      const verified = await adminApi.auth.verifyStepUp({
        password: stepUpAuth.password,
        mfaCode: stepUpAuth.mfaCode
      });
      
      if (verified) {
        // Proceed with role update
        await adminApi.users.updateUserRole(
          stepUpAuth.operation.userId, 
          stepUpAuth.operation.newRole
        );
        
        setEditDialog({ open: false, user: null, newRole: '' });
        setStepUpAuth({ open: false, operation: null, password: '', mfaCode: '', loading: false });
        await loadUsers(); // Refresh list
        
        // Security audit log
        console.warn('🛡️ ADMIN ACTION: Role updated', {
          targetUser: stepUpAuth.operation.userEmail,
          newRole: stepUpAuth.operation.newRole,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      setError('Rol güncellenemedi: ' + err.message);
    } finally {
      setStepUpAuth(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRevokeSessions = async (userId) => {
    try {
      await adminApi.users.revokeUserSessions(userId);
      await loadUsers(); // Refresh list
    } catch (err) {
      if (err.message !== 'OPERATION_CANCELLED: User cancelled') {
        setError('Oturumlar sonlandırılamadı: ' + err.message);
      }
    }
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        👥 Kullanıcı Yönetimi
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Arama"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="İsim veya email..."
              size="small"
              sx={{ minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Rol</InputLabel>
              <Select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                label="Rol"
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="USER">USER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadUsers}
            >
              Yenile
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Kullanıcı</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>İşlemler</TableCell>
              <TableCell>Son İşlem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {user.name || 'İsimsiz'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {user.id.substring(0, 8)}...
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>{user.email}</TableCell>
                
                <TableCell>
                  <Chip 
                    label={user.role} 
                    color={user.role === 'ADMIN' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%',
                      bgcolor: user.isOnline ? 'success.main' : 'grey.400'
                    }} />
                    <Typography variant="body2">
                      {user.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => setEditDialog({
                        open: true,
                        user,
                        newRole: user.role
                      })}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      onClick={() => handleRevokeSessions(user.id)}
                      color="warning"
                      title="Oturumları sonlandır"
                    >
                      <SecurityIcon />
                    </IconButton>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="caption">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </Typography>
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

      {/* Edit Role Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, user: null, newRole: '' })}>
        <DialogTitle>Kullanıcı Rolü Güncelle</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>{editDialog.user?.name || editDialog.user?.email}</strong> kullanıcısının rolünü güncelleyin:
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel>Yeni Rol</InputLabel>
              <Select
                value={editDialog.newRole}
                onChange={(e) => setEditDialog(prev => ({ ...prev, newRole: e.target.value }))}
                label="Yeni Rol"
              >
                <MenuItem value="USER">USER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, user: null, newRole: '' })}>
            İptal
          </Button>
          <Button onClick={handleRoleUpdate} variant="contained">
            Güncelle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsers;
