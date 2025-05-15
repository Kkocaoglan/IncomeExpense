import { useState, useContext } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { FinanceContext } from '../contexts/FinanceContext';

const QuickAddButtons = () => {
  const { addIncome, addExpense } = useContext(FinanceContext);
  const [openDialog, setOpenDialog] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const handleOpenDialog = (type) => {
    setTransactionType(type);
    setDescription('');
    setAmount('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = () => {
    if (!description || !amount) return;

    const transaction = {
      description,
      amount: parseFloat(amount),
      date: new Date().toISOString()
    };

    if (transactionType === 'income') {
      addIncome(transaction);
    } else {
      addExpense(transaction);
    }

    handleCloseDialog();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
      <Button
        variant="contained"
        color="success"
        size="large"
        startIcon={<AddIcon />}
        onClick={() => handleOpenDialog('income')}
        sx={{
          py: 1.5,
          fontWeight: 'bold',
          fontSize: '1rem',
          backgroundColor: '#2e7d32'
        }}
      >
        YENİ GELİR EKLE
      </Button>

      <Button
        variant="contained"
        color="error"
        size="large"
        startIcon={<AddIcon />}
        onClick={() => handleOpenDialog('expense')}
        sx={{
          py: 1.5,
          fontWeight: 'bold',
          fontSize: '1rem'
        }}
      >
        YENİ GİDER EKLE
      </Button>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {transactionType === 'income' ? 'Yeni Gelir Ekle' : 'Yeni Gider Ekle'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Açıklama"
            type="text"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Tutar"
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            InputProps={{
              inputProps: { min: 0, step: "0.01" }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button 
            onClick={handleSubmit} 
            color={transactionType === 'income' ? 'success' : 'error'}
          >
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickAddButtons; 