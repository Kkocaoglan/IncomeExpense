import { useState, useContext } from 'react';
import {
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Collapse
} from '@mui/material';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';

const TransactionForm = () => {
  const { addIncome, addExpense } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);
  
  const [formData, setFormData] = useState({
    type: 'income',
    description: '',
    amount: '',
  });
  
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    severity: 'success'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      setAlert({
        show: true,
        message: 'Lütfen açıklama girin (ör: Maaş, Kira, Market)',
        severity: 'error'
      });
      return;
    }
    if (!formData.amount) {
      setAlert({
        show: true,
        message: 'Lütfen tutar girin',
        severity: 'error'
      });
      return;
    }
    if (parseFloat(formData.amount) <= 0) {
      setAlert({
        show: true,
        message: 'Tutar sıfırdan büyük olmalı',
        severity: 'error'
      });
      return;
    }
    const transaction = {
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      date: new Date().toISOString()
    };
    if (formData.type === 'income') {
      addIncome(transaction);
    } else {
      addExpense(transaction);
    }
    setAlert({
      show: true,
      message: `${formData.type === 'income' ? 'Gelir' : 'Gider'} başarıyla eklendi`,
      severity: 'success'
    });
    setFormData({
      type: 'income',
      description: '',
      amount: ''
    });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  return (
    <Paper 
      component="form" 
      onSubmit={handleSubmit}
      sx={{ 
        p: 3,
        bgcolor: darkMode ? 'grey.800' : 'background.paper'
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Collapse in={alert.show}>
          <Alert severity={alert.severity} sx={{ mb: 2 }}>
            {alert.message}
          </Alert>
        </Collapse>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="type-label">İşlem Tipi</InputLabel>
          <Select
            labelId="type-label"
            name="type"
            value={formData.type}
            label="İşlem Tipi"
            onChange={handleChange}
          >
            <MenuItem value="income">Gelir</MenuItem>
            <MenuItem value="expense">Gider</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Açıklama *"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Örnek: Maaş, Kira, Market, Fatura..."
          required
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Tutar"
          name="amount"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          sx={{ mb: 2 }}
          InputProps={{
            inputProps: { min: 0, step: "0.01" }
          }}
        />

        <Button 
          type="submit" 
          variant="contained" 
          fullWidth
          color={formData.type === 'income' ? 'primary' : 'error'}
        >
          {formData.type === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}
        </Button>
      </Box>
    </Paper>
  );
};

export default TransactionForm; 