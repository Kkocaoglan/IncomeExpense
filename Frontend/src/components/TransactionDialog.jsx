import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';

const categories = {
  expense: [
    { value: 'mutfak', label: 'Mutfak' },
    { value: 'kira', label: 'Kira' },
    { value: 'beklenmeyen', label: 'Beklenmeyen' },
    { value: 'giyim', label: 'Giyim' },
    { value: 'faturalar', label: 'Faturalar' },
    { value: 'ulasim', label: 'Ulaşım' },
    { value: 'saglik', label: 'Sağlık' },
    { value: 'eglence', label: 'Eğlence' },
    { value: 'diger', label: 'Diğer' }
  ],
  income: [
    { value: 'maas', label: 'Maaş' },
    { value: 'ekgelir', label: 'Ek Gelir' },
    { value: 'yatirim', label: 'Yatırım Getirisi' },
    { value: 'diger', label: 'Diğer' }
  ]
};

const TransactionDialog = ({ open, handleClose, type }) => {
  const [transaction, setTransaction] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: ''
  });

  useEffect(() => {
    if (open) {
      setTransaction({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: ''
      });
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTransaction(prev => {
      const newTransaction = { ...prev, [name]: value };
      
      // Eğer kategori seçildiyse ve description boşsa, kategori adını description olarak ata
      if (name === 'category' && !prev.description) {
        const selectedCategory = categories[type].find(cat => cat.value === value);
        if (selectedCategory) {
          newTransaction.description = selectedCategory.label;
        }
      }
      
      return newTransaction;
    });
  };

  const handleSubmit = () => {
    if (!transaction.amount || !transaction.category || !transaction.date) {
      return;
    }
    
    // Description boşsa kategori adını kullan
    let description = transaction.description.trim();
    if (!description) {
      const selectedCategory = categories[type].find(cat => cat.value === transaction.category);
      description = selectedCategory ? selectedCategory.label : '';
    }
    
    const newTransaction = {
      ...transaction,
      description: description,
      id: Date.now(),
      amount: parseFloat(transaction.amount)
    };
    
    handleClose(newTransaction);
  };

  return (
    <Dialog open={open} onClose={() => handleClose(null)} fullWidth maxWidth="sm">
      <DialogTitle>
        {type === 'income' ? 'Yeni Gelir Ekle' : 'Yeni Gider Ekle'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Kategori</InputLabel>
              <Select
                name="category"
                value={transaction.category}
                label="Kategori"
                onChange={handleChange}
              >
                {categories[type].map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {transaction.category === 'diger' && (
            <Grid item xs={12}>
              <TextField
                name="description"
                autoFocus
                label="Açıklama *"
                type="text"
                fullWidth
                value={transaction.description}
                onChange={handleChange}
                placeholder="Örnek: Maaş, Kira, Market, Fatura..."
                required
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField
              name="amount"
              label="Tutar"
              type="number"
              fullWidth
              value={transaction.amount}
              onChange={handleChange}
              InputProps={{
                inputProps: { min: 0, step: "0.01" },
                endAdornment: <Typography>₺</Typography>
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              name="date"
              label="Tarih"
              type="date"
              fullWidth
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
        <Button onClick={() => handleClose(null)}>İptal</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionDialog; 