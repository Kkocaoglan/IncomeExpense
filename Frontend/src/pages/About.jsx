import { useContext } from 'react';
import { Container, Paper, Typography, Box, Divider, Link, Grid, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { ThemeContext } from '../contexts/ThemeContext';
import { Info, Code, ContactSupport, AccountBalance, Security, Speed } from '@mui/icons-material';

const About = () => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Uygulama Hakkında
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3, bgcolor: darkMode ? 'grey.800' : 'background.paper' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Gelir Gider Takip Uygulaması
          </Typography>
          <Typography variant="body1" paragraph>
            Bu uygulama, kişisel finans yönetimini kolaylaştırmak amacıyla geliştirilmiştir. 
            Gelirlerinizi ve giderlerinizi takip edebilir, yatırımlarınızı izleyebilirsiniz.
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Özellikler
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <AccountBalance />
                </ListItemIcon>
                <ListItemText 
                  primary="Gelir ve Gider Takibi" 
                  secondary="Tüm finansal hareketlerinizi kaydedin ve izleyin"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Security />
                </ListItemIcon>
                <ListItemText 
                  primary="Yerel Depolama" 
                  secondary="Verileriniz yerel olarak tarayıcınızda güvenle saklanır"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Speed />
                </ListItemIcon>
                <ListItemText 
                  primary="Hızlı ve Kullanışlı" 
                  secondary="Kolay kullanımlı arayüz ve hızlı performans"
                />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Teknik Bilgiler
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Code />
                </ListItemIcon>
                <ListItemText 
                  primary="Geliştirme Teknolojileri" 
                  secondary="React, Material-UI, Context API"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Info />
                </ListItemIcon>
                <ListItemText 
                  primary="Versiyon" 
                  secondary="1.0.0"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <ContactSupport />
                </ListItemIcon>
                <ListItemText 
                  primary="Destek" 
                  secondary={
                    <Link href="mailto:destek@gelirgider.app" color="primary">
                      destek@gelirgider.app
                    </Link>
                  }
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          © 2023 Gelir Gider Takip Uygulaması. Tüm hakları saklıdır.
        </Typography>
      </Box>
    </Container>
  );
};

export default About; 