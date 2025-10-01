import { useState, useContext } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Badge,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  ExitToApp as ExitIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  AdminPanelSettings as AdminIcon,
  Computer as ComputerIcon
} from '@mui/icons-material';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';

const DRAWER_WIDTH = 280;

/**
 * ADMIN LAYOUT COMPONENT
 * Güvenli admin dashboard layout'u
 * Sadece admin kullanıcılar için tasarlandı
 */

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin navigation items
  const adminNavItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/admin/dashboard',
      badge: null
    },
    {
      text: 'Kullanıcı Yönetimi',
      icon: <PeopleIcon />,
      path: '/admin/users',
      badge: null,
      sensitive: true
    },
    {
      text: 'Güvenlik Logları',
      icon: <SecurityIcon />,
      path: '/admin/security',
      badge: null,
      sensitive: true
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Admin panelinden çıkış yapmak istediğinizden emin misiniz?')) {
      // Admin çıkış loglaması
      console.warn('🛡️ ADMIN LOGOUT', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
        sessionDuration: Date.now() - parseInt(localStorage.getItem('lastLoginTime') || '0')
      });
      
      logout();
      navigate('/');
    }
  };

  const handleReturnToApp = () => {
    if (window.confirm('Normal kullanıcı arayüzüne geçmek istediğinizden emin misiniz?')) {
      navigate('/dashboard');
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: darkMode ? '#1a1a1a' : '#f5f5f5' }}>
      {/* Admin Header */}
      <Box sx={{ 
        p: 3, 
        bgcolor: darkMode ? '#0d1117' : '#1976d2', 
        color: 'white',
        textAlign: 'center'
      }}>
        <AdminIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Admin Panel
        </Typography>
        <Chip 
          label={user?.email} 
          size="small" 
          sx={{ 
            mt: 1, 
            bgcolor: 'rgba(255,255,255,0.2)', 
            color: 'white',
            fontSize: '0.75rem'
          }} 
        />
      </Box>

      {/* Security Warning */}
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="warning" 
          size="small"
          icon={<WarningIcon fontSize="small" />}
          sx={{ fontSize: '0.75rem' }}
        >
          <Typography variant="caption">
            Bu alan sadece yetkili personel içindir. 
            Tüm aktiviteler loglanmaktadır.
          </Typography>
        </Alert>
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ px: 1 }}>
        {adminNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isSensitive = item.sensitive;
          
          return (
            <ListItem
              key={item.path}
              button
              onClick={() => handleNavigation(item.path)}
              sx={{
                mb: 1,
                borderRadius: 2,
                bgcolor: isActive ? (darkMode ? '#2d2d2d' : '#e3f2fd') : 'transparent',
                border: isSensitive ? '1px solid rgba(255,152,0,0.3)' : 'none',
                '&:hover': {
                  bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5'
                }
              }}
            >
              <ListItemIcon sx={{ 
                color: isActive ? theme.palette.primary.main : 'inherit',
                minWidth: 40
              }}>
                {isSensitive ? (
                  <Badge badgeContent="!" color="warning" variant="dot">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? theme.palette.primary.main : 'inherit'
                }}
              />
              {item.badge && (
                <Badge badgeContent={item.badge} color="error" />
              )}
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Bottom Actions */}
      <List sx={{ px: 1 }}>
        <ListItem
          button
          onClick={handleReturnToApp}
          sx={{
            mb: 1,
            borderRadius: 2,
            bgcolor: darkMode ? '#2d4a2d' : '#e8f5e8',
            '&:hover': {
              bgcolor: darkMode ? '#3d5a3d' : '#d4eed4'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <ExitIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Uygulamaya Dön"
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItem>

        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            bgcolor: darkMode ? '#4a2d2d' : '#ffe8e8',
            '&:hover': {
              bgcolor: darkMode ? '#5a3d3d' : '#ffd4d4'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <ExitIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Çıkış Yap"
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItem>
      </List>

      {/* Security Footer */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        p: 2, 
        textAlign: 'center',
        bgcolor: darkMode ? '#0d1117' : '#f0f0f0',
        borderTop: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="caption" color="text.secondary">
          🛡️ Güvenli Admin Paneli
        </Typography>
        <br />
        <Typography variant="caption" color="text.secondary">
          v1.0.0 - {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: darkMode ? '#0d1117' : '#1976d2'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">
              {adminNavItems.find(item => item.path === location.pathname)?.text || 'Admin Panel'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Yetkili Kullanıcı: {user?.email}
            </Typography>
          </Box>

          {/* Live Security Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 8, 
              height: 8, 
              bgcolor: 'success.main', 
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            <Typography variant="caption">
              Güvenli Bağlantı
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              border: 'none'
            },
          }}
        >
          {drawer}
        </Drawer>
        
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              border: 'none'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: darkMode ? '#0d1117' : '#fafafa',
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
