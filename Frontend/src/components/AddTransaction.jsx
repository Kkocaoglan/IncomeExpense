import { useState, useContext } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  Grid 
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { FinanceContext } from '../contexts/FinanceContext';

const AddTransaction = ({ type }) => {
  const { addIncome, addExpense } = useContext(FinanceContext);
  const [open, setOpen] = useState(false);
  const [transaction, setTransaction] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [error, setError] = useState('');

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setTransaction({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTransaction({
      ...transaction,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    });
  };

  const handleSubmit = () => {
    let desc = transaction.description.trim();
    if (!desc) {
      setError('Lütfen açıklama girin (ör: Maaş, Kira, Market)');
      return;
    }
    if (!transaction.amount) {
      setError('Lütfen tutar girin');
      return;
    }
    if (parseFloat(transaction.amount) <= 0) {
      setError('Tutar sıfırdan büyük olmalı');
      return;
    }
    const newTransaction = {
      ...transaction,
      description: desc,
      id: Date.now(),
      amount: parseFloat(transaction.amount)
    };
    if (type === 'income') {
      addIncome(newTransaction);
    } else {
      addExpense(newTransaction);
    }
    handleClose();
  };

  return (
    <>
      <Button 
        variant="contained" 
        color={type === 'income' ? 'success' : 'error'}
        startIcon={<Add />}
        onClick={handleOpen}
        fullWidth
        sx={{ mb: 2 }}
      >
        {type === 'income' ? 'Yeni Gelir Ekle' : 'Yeni Gider Ekle'}
      </Button>
      
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{type === 'income' ? 'Yeni Gelir Ekle' : 'Yeni Gider Ekle'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                name="description"
                label="Açıklama *"
                fullWidth
                variant="outlined"
                value={transaction.description}
                onChange={handleChange}
                placeholder="Örnek: Maaş, Kira, Market, Fatura..."
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="amount"
                label="Miktar (₺)"
                type="number"
                fullWidth
                variant="outlined"
                value={transaction.amount}
                onChange={handleChange}
                min="0"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="date"
                label="Tarih"
                type="date"
                fullWidth
                variant="outlined"
                value={transaction.date}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            {error && (
              <Grid item xs={12}>
                <Box sx={{ color: 'error.main', fontSize: '0.875rem' }}>
                  {error}
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            color={type === 'income' ? 'success' : 'error'}
          >
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddTransaction; 