import { useContext } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const IncomeExpenseBar = () => {
  const { incomes, expenses } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);

  // Toplam gelir ve giderleri hesapla
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Net gelir ve gider (vergi olmadan)
  const netIncome = totalIncome;
  const netExpense = totalExpense;

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
      {/* Gelir Kartı */}
      <Paper 
        elevation={3} 
        sx={{ 
          flex: 1, 
          p: 3,
          bgcolor: darkMode ? 'grey.800' : 'background.paper'
        }}
      >
        <Typography variant="h6" gutterBottom>
          Gelir
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Toplam: <strong>{formatCurrency(totalIncome)}</strong>
        </Typography>
        <Typography variant="body2" color="success.main">
          Net: {formatCurrency(netIncome)}
        </Typography>
        <Box 
          sx={{ 
            mt: 2,
            height: 8,
            borderRadius: 1,
            bgcolor: '#e0e0e0',
            overflow: 'hidden',
            display: 'flex'
          }}
        >
          {totalIncome > 0 && (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'success.main'
              }}
            />
          )}
        </Box>
      </Paper>

      {/* Gider Kartı */}
      <Paper 
        elevation={3} 
        sx={{ 
          flex: 1, 
          p: 3,
          bgcolor: darkMode ? 'grey.800' : 'background.paper'
        }}
      >
        <Typography variant="h6" gutterBottom>
          Gider
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Toplam: <strong>{formatCurrency(totalExpense)}</strong>
        </Typography>
        <Typography variant="body2" color="error.main">
          Ana Miktar: {formatCurrency(netExpense)}
        </Typography>
        <Box 
          sx={{ 
            mt: 2,
            height: 8,
            borderRadius: 1,
            bgcolor: '#e0e0e0',
            overflow: 'hidden',
            display: 'flex'
          }}
        >
          {totalExpense > 0 && (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'error.main'
              }}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default IncomeExpenseBar; 