import { useContext } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';

const Summary = () => {
  const { incomes, expenses } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);

  // Toplam gelir ve giderleri hesapla
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 3,
        bgcolor: darkMode ? 'grey.800' : 'background.paper'
      }}
    >
      <Typography variant="h5" gutterBottom>
        Genel Durum
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Toplam Gelir
          </Typography>
          <Typography 
            variant="h4" 
            color="success.main"
            sx={{ fontWeight: 'medium' }}
          >
            {totalIncome.toLocaleString('tr-TR')} ₺
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Toplam Gider
          </Typography>
          <Typography 
            variant="h4" 
            color="error.main"
            sx={{ fontWeight: 'medium' }}
          >
            {totalExpense.toLocaleString('tr-TR')} ₺
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Genel Bakiye
          </Typography>
          <Typography 
            variant="h4" 
            color={balance >= 0 ? 'success.main' : 'error.main'}
            sx={{ fontWeight: 'medium' }}
          >
            {balance.toLocaleString('tr-TR')} ₺
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default Summary; 