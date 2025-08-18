import React from 'react';
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useContext } from 'react';
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

const TransactionList = ({ type }) => {
  const { expenses, incomes, deleteExpense, deleteIncome } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const transactions = type === 'income' ? incomes : expenses;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <List>
      {transactions.map((transaction) => (
        <ListItem
          key={transaction.id}
          sx={{
            mb: 1,
            borderRadius: 2,
            bgcolor: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            borderLeft: `4px solid ${type === 'income' ? theme.palette.success.main : theme.palette.error.main}`,
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              transform: 'translateX(5px)'
            }
          }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#222' }}>
                  {transaction.description}
                </Typography>
                <Typography variant="body1" sx={{ color: type === 'income' ? 'success.main' : 'error.main', fontWeight: 500 }}>
                  {formatCurrency(transaction.amount)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
                  {formatDate(transaction.date)}
                </Typography>
              </Box>
            }
          />
          <ListItemSecondaryAction>
            <Tooltip title="Sil" arrow>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => type === 'income' ? deleteIncome(transaction.id) : deleteExpense(transaction.id)}
                color="error"
                size={isMobile ? "small" : "medium"}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    bgcolor: 'error.light'
                  }
                }}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default TransactionList; 