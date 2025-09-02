import React, { useEffect, useState } from 'react';
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
import { ThemeContext } from '../contexts/ThemeContext';
import { listTransactions } from '../services/transactionsApi';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const TransactionList = ({ type }) => {
  const { darkMode } = useContext(ThemeContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState('date:desc');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { rows: r, total: t } = await listTransactions({ page, limit, sort, type });
      if (!alive) return;
      setRows(Array.isArray(r) ? r : []);
      setTotal(Number(t) || 0);
    })();
    return () => { alive = false; };
  }, [page, limit, sort, type]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <List>
      {rows.map((transaction) => (
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
        </ListItem>
      ))}
    </List>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
      <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Önceki</button>
      <Typography variant="caption">Sayfa {page} / {totalPages}</Typography>
      <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Sonraki</button>
      <select value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value,10)); }}>
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
      <select value={sort} onChange={e=>{ setPage(1); setSort(e.target.value); }}>
        <option value="date:desc">Tarih ↓</option>
        <option value="date:asc">Tarih ↑</option>
        <option value="amount:desc">Tutar ↓</option>
        <option value="amount:asc">Tutar ↑</option>
      </select>
    </Box>
  );
};

export default TransactionList; 