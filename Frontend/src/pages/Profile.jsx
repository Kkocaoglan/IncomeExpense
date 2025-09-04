import { useState, useContext, useEffect } from 'react';
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
import { AuthContext } from '../contexts/AuthContext';
import PersonIcon from '@mui/icons-material/Person';

const Profile = () => {
  const { darkMode } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  
  const [profileData, setProfileData] = useState({
    name: '',
    surname: '',
    birthdate: '',
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    if (user) {
      // Kullanıcı adını ad ve soyad olarak ayır
      const nameParts = (user.name || 'Kullanıcı').split(' ');
      const firstName = nameParts[0] || 'Kullanıcı';
      const lastName = nameParts.slice(1).join(' ') || 'Adı';
      
      setProfileData({
        name: firstName,
        surname: lastName,
        birthdate: user.birthdate || '',
        email: user.email || 'kullanici@example.com'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Profil güncelleme API çağrısı burada yapılacak
      // await updateProfile(profileData);
      
      setIsEditing(false);
      setNotification({
        open: true,
        message: 'Profil bilgileri başarıyla güncellendi',
        severity: 'success'
      });
      
      // Local storage'a kaydet
      localStorage.setItem('profileData', JSON.stringify(profileData));
    } catch (error) {
      setNotification({
        open: true,
        message: 'Profil güncellenirken hata oluştu',
        severity: 'error'
      });
    }
  };

  const handleCancel = () => {
    // Orijinal kullanıcı bilgilerini geri yükle
    if (user) {
      const nameParts = (user.name || 'Kullanıcı').split(' ');
      const firstName = nameParts[0] || 'Kullanıcı';
      const lastName = nameParts.slice(1).join(' ') || 'Adı';
      
      setProfileData({
        name: firstName,
        surname: lastName,
        birthdate: user.birthdate || '',
        email: user.email || 'kullanici@example.com'
      });
    }
    setIsEditing(false);
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profil
        </Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Profil bilgilerini görüntülemek için giriş yapmanız gerekiyor.
          </Typography>
        </Paper>
      </Container>
    );
  }

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
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" color="secondary" onClick={handleCancel}>
                  İptal
                </Button>
                <Button variant="contained" color="primary" onClick={handleSave}>
                  Kaydet
                </Button>
              </Box>
            ) : (
              <Button variant="outlined" onClick={() => setIsEditing(true)}>
                DÜZENLE
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
              placeholder="Kullanıcı Adı"
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
              placeholder="Soyadı"
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
              placeholder="gg.aa.yyyy"
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
              placeholder="E-posta adresi"
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