import React, { useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  Box,
  Chip,
  Divider
} from '@mui/material';
import { Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
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
              bgcolor: darkMode ? 'grey.700' : 'grey.100',
              mb: 1,
              borderRadius: 1,
              borderLeft: `4px solid ${categoryColors[category]}`
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {categoryLabels[category]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam: ₺{categoryTotals[category].toFixed(2)}
                  </Typography>
                </Box>
              }
            />
            {expandedCategories[category] ? <ExpandLess /> : <ExpandMore />}
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
                    bgcolor: darkMode ? 'grey.700' : 'grey.50'
                  }}
                >
                  <ListItemText
                    primary={transaction.description}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.secondary">
                          {formatDate(transaction.date)}
                        </Typography>
                        {' - '}
                        <Typography component="span" variant="body2" color="text.secondary">
                          ₺{transaction.amount.toFixed(2)}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => type === 'income' ? deleteIncome(transaction.id) : deleteExpense(transaction.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
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