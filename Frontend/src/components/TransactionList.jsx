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
  Tooltip,
  Button,
  Select,
  MenuItem
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { FinanceContext } from '../contexts/FinanceContext';
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
  const { lastUpdated, removeTransaction } = useContext(FinanceContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState('date:desc');

  const fetchList = async () => {
    const { rows: r, total: t } = await listTransactions({ page, limit, sort, type });
    setRows(Array.isArray(r) ? r : []);
    setTotal(Number(t) || 0);
  };

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

  // Refetch whenever transactions change globally
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdated]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm('Bu kaydı silmek istiyor musunuz?');
    if (!ok) return;
    try {
      await removeTransaction(id);
    } catch (e) {
      console.error('Silme hatası:', e);
      alert('Kayıt silinirken bir hata oluştu.');
    }
  };

  return (
    <>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#222' }}>
                  {transaction.description}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {formatDate(transaction.date)}
                  </Typography>
                  <Typography variant="body1" sx={{ color: type === 'income' ? 'success.main' : 'error.main', fontWeight: 600 }}>
                    {formatCurrency(transaction.amount)}
                  </Typography>
                  <Tooltip title="Sil">
                    <IconButton size="small" color="error" onClick={() => handleDelete(transaction.id)}>
                      <Delete fontSize="small" color="error" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
    </>
  );
};

export default TransactionList; 