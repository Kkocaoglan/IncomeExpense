import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Home, AccountCircle, Brightness4, Brightness7, Settings } from '@mui/icons-material';
import { ThemeContext } from '../contexts/ThemeContext';

const Header = () => {
  const { darkMode, toggleTheme } = useContext(ThemeContext);

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
            color="inherit" 
            onClick={toggleTheme}
            sx={{ mx: 1 }}
          >
            {darkMode ? <Brightness7 /> : <Brightness4 />}
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
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 