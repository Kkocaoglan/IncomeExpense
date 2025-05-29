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

  // Net gelir ve vergileri hesapla
  const totalTaxIncome = incomes.reduce((sum, income) => sum + (income.tax || 0), 0);
  const netIncome = totalIncome - totalTaxIncome;
  
  // Net gider ve vergileri hesapla
  const totalTaxExpense = expenses.reduce((sum, expense) => sum + (expense.tax || 0), 0);
  const netExpense = totalExpense - totalTaxExpense;

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
        <Typography variant="body2" color="error.main">
          Vergi: {formatCurrency(totalTaxIncome)}
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
            <>
              <Box
                sx={{
                  width: `${(netIncome / totalIncome) * 100}%`,
                  height: '100%',
                  bgcolor: 'success.main'
                }}
              />
              <Box
                sx={{
                  width: `${(totalTaxIncome / totalIncome) * 100}%`,
                  height: '100%',
                  bgcolor: 'error.main'
                }}
              />
            </>
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
        <Typography variant="body2" color="text.secondary">
          Vergi: {formatCurrency(totalTaxExpense)}
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
            <>
              <Box
                sx={{
                  width: `${(netExpense / totalExpense) * 100}%`,
                  height: '100%',
                  bgcolor: 'error.main'
                }}
              />
              <Box
                sx={{
                  width: `${(totalTaxExpense / totalExpense) * 100}%`,
                  height: '100%',
                  bgcolor: 'grey.700'
                }}
              />
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default IncomeExpenseBar; 