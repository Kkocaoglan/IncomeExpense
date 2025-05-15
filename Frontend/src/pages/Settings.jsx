import { useState, useContext } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Switch, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import { ThemeContext } from '../contexts/ThemeContext';

const Settings = () => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [currency, setCurrency] = useState('TRY');
  const [dateFormat, setDateFormat] = useState('DD.MM.YYYY');
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleCurrencyChange = (event) => {
    setCurrency(event.target.value);
  };

  const handleDateFormatChange = (event) => {
    setDateFormat(event.target.value);
  };

  const handleSave = () => {
    setNotification({
      open: true,
      message: 'Ayarlar başarıyla kaydedildi',
      severity: 'success'
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Ayarlar
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <List>
          <ListItem>
            <ListItemText 
              primary="Karanlık Mod" 
              secondary="Uygulamanın arayüzünü karanlık moda geçirir" 
            />
            <ListItemSecondaryAction>
              <Switch 
                edge="end"
                checked={darkMode}
                onChange={toggleDarkMode}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText 
              primary="Para Birimi" 
              secondary="Uygulamada kullanılacak varsayılan para birimi" 
            />
            <ListItemSecondaryAction>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={currency}
                  onChange={handleCurrencyChange}
                  displayEmpty
                >
                  <MenuItem value="TRY">TRY (₺)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </ListItemSecondaryAction>
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText 
              primary="Tarih Formatı" 
              secondary="Tarihlerin görüntülenme biçimi" 
            />
            <ListItemSecondaryAction>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={dateFormat}
                  onChange={handleDateFormatChange}
                  displayEmpty
                >
                  <MenuItem value="DD.MM.YYYY">DD.MM.YYYY</MenuItem>
                  <MenuItem value="MM.DD.YYYY">MM.DD.YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSave}
          >
            Değişiklikleri Kaydet
          </Button>
        </Box>
      </Paper>
      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings; 