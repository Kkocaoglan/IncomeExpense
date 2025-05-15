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
    if (transaction.description.trim() === '' || !transaction.amount) {
      return;
    }
    
    const newTransaction = {
      ...transaction,
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
                label="Açıklama"
                fullWidth
                variant="outlined"
                value={transaction.description}
                onChange={handleChange}
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