import { useState, useContext } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Avatar,
  TextField,
  Button,
  Grid,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import { ThemeContext } from '../contexts/ThemeContext';
import PersonIcon from '@mui/icons-material/Person';

const Profile = () => {
  const { darkMode } = useContext(ThemeContext);
  const [profileData, setProfileData] = useState({
    name: 'Kullanıcı Adı',
    surname: 'Soyadı',
    birthdate: '',
    email: 'kullanici@example.com',
    phone: '+90 555 123 4567',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
    setNotification({
      open: true,
      message: 'Profil bilgileri başarıyla güncellendi',
      severity: 'success'
    });
    localStorage.setItem('profileData', JSON.stringify(profileData));
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profil
      </Typography>
      <Paper sx={{ p: 3, mb: 4, bgcolor: darkMode ? 'grey.800' : 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{ width: 100, height: 100, bgcolor: 'primary.main', mr: 3 }}
          >
            <PersonIcon sx={{ fontSize: 60 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" gutterBottom>
              {profileData.name} {profileData.surname}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {profileData.email}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            {isEditing ? (
              <Button variant="contained" color="primary" onClick={handleSave}>
                Kaydet
              </Button>
            ) : (
              <Button variant="outlined" onClick={() => setIsEditing(true)}>
                Düzenle
              </Button>
            )}
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ad"
              name="name"
              value={profileData.name}
              onChange={handleChange}
              disabled={!isEditing}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Soyad"
              name="surname"
              value={profileData.surname}
              onChange={handleChange}
              disabled={!isEditing}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Doğum Tarihi"
              name="birthdate"
              type="date"
              value={profileData.birthdate}
              onChange={handleChange}
              disabled={!isEditing}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="E-posta"
              name="email"
              type="email"
              value={profileData.email}
              onChange={handleChange}
              disabled={!isEditing}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Telefon"
              name="phone"
              value={profileData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              margin="normal"
            />
          </Grid>
        </Grid>
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

export default Profile; 