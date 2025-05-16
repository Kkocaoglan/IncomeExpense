import React, { useState } from 'react';
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  Box,
  useTheme,
  useMediaQuery,
  Tooltip,
  Fade
} from '@mui/material';
import { Delete, ExpandMore, ExpandLess, AttachMoney } from '@mui/icons-material';
import { useContext } from 'react';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';

const categoryColors = {
  mutfak: '#FF6B6B',
  kira: '#4ECDC4',
  beklenmeyen: '#FFD93D',
  giyim: '#95E1D3',
  faturalar: '#FCE38A',
  ulasim: '#EAFFD0',
  saglik: '#F38181',
  eglence: '#E0BBE4',
  diger: '#957DAD'
};

const categoryLabels = {
  mutfak: 'Mutfak',
  kira: 'Kira',
  beklenmeyen: 'Beklenmeyen',
  giyim: 'Giyim',
  faturalar: 'Faturalar',
  ulasim: 'Ulaşım',
  saglik: 'Sağlık',
  eglence: 'Eğlence',
  diger: 'Diğer'
};

const TransactionList = ({ type }) => {
  const { expenses, incomes, deleteExpense, deleteIncome } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedCategories, setExpandedCategories] = useState({});

  const transactions = type === 'income' ? incomes : expenses;

  // Kategorilere göre işlemleri grupla
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const category = transaction.category || 'diger';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(transaction);
    return groups;
  }, {});

  // Kategori toplamlarını hesapla
  const categoryTotals = Object.entries(groupedTransactions).reduce((totals, [category, transactions]) => {
    totals[category] = transactions.reduce((sum, t) => sum + t.amount, 0);
    return totals;
  }, {});

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <List>
      {Object.entries(groupedTransactions).map(([category, transactions]) => (
        <React.Fragment key={category}>
          <ListItem
            button
            onClick={() => toggleCategory(category)}
            sx={{
              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              mb: 1,
              borderRadius: 2,
              borderLeft: `4px solid ${categoryColors[category]}`,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                transform: 'translateX(5px)'
              }
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center', 
                  gap: 1 
                }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {categoryLabels[category]}
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 0.5,
                    color: type === 'income' ? theme.palette.success.main : theme.palette.error.main
                  }}>
                    <AttachMoney fontSize="small" />
                    <Typography variant="body2">
                      {categoryTotals[category].toLocaleString('tr-TR')} ₺
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <Fade in={true}>
              {expandedCategories[category] ? <ExpandLess /> : <ExpandMore />}
            </Fade>
          </ListItem>
          <Collapse in={expandedCategories[category]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {transactions.map((transaction) => (
                <ListItem
                  key={transaction.id}
                  sx={{
                    pl: 4,
                    borderLeft: `4px solid ${categoryColors[category]}`,
                    mb: 1,
                    bgcolor: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      transform: 'translateX(5px)'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {transaction.description}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? 0.5 : 1,
                        mt: 0.5
                      }}>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          {formatDate(transaction.date)}
                        </Typography>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          color={type === 'income' ? 'success.main' : 'error.main'}
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontWeight: 500
                          }}
                        >
                          <AttachMoney fontSize="small" />
                          {transaction.amount.toLocaleString('tr-TR')} ₺
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
          </Collapse>
        </React.Fragment>
      ))}
    </List>
  );
};

export default TransactionList; 