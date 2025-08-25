import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Box, Menu, MenuItem } from '@mui/material';
import { Home, AccountCircle, Settings, ExitToApp } from '@mui/icons-material';
import { ThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { darkMode } = useContext(ThemeContext);
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  return (
    <AppBar position="static" color={darkMode ? 'default' : 'primary'}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Gelir-Gider Takip
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton component={Link} to="/" color="inherit" aria-label="home">
            <Home />
          </IconButton>
          <IconButton
            component={Link}
            to="/profile"
            color="inherit"
            aria-label="profile"
          >
            <AccountCircle />
          </IconButton>
          <IconButton
            component={Link}
            to="/settings"
            color="inherit"
            aria-label="settings"
            sx={{ ml: 1 }}
          >
            <Settings />
          </IconButton>
          <IconButton
            color="inherit"
            aria-label="user menu"
            onClick={handleMenuOpen}
            sx={{ ml: 1 }}
          >
            <ExitToApp />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem disabled>
              {user?.name || user?.email}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Çıkış Yap
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 