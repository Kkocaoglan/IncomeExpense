import { Container, Typography, Box } from '@mui/material';
import InvestmentSection from '../components/InvestmentSection';

const Investments = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Yatırımlarım
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Altın, döviz ve diğer yatırım araçlarınızı bu sayfadan takip edebilirsiniz.
        </Typography>
      </Box>
      
      <InvestmentSection />
    </Container>
  );
};

export default Investments; 