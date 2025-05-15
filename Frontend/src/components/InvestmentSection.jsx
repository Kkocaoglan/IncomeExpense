import { useState, useContext } from 'react';
import { 
  Paper, Typography, Box, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Grid, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Divider
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';

const InvestmentSection = () => {
  const { investments, goldPrice, addInvestment, deleteInvestment } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    type: 'Altın',
    amount: '',
    date: new Date().toISOString().split('T')[0]  // Format as YYYY-MM-DD
  });

  // Define investment types
  const investmentTypes = [
    { value: 'Altın', label: 'Altın (gr)' },
    { value: 'Gümüş', label: 'Gümüş (gr)' },
    { value: 'Dolar', label: 'Dolar ($)' },
    { value: 'Euro', label: 'Euro (€)' },
  ];

  // Mock prices for display purposes only
  const mockPrices = {
    'Altın': goldPrice, // 2500 TL/gr as defined in FinanceContext
    'Gümüş': 40, // TL/gr
    'Dolar': 35, // TL/$
    'Euro': 38, // TL/€
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form
    setNewInvestment({
      type: 'Altın',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewInvestment({
      ...newInvestment,
      [name]: name === 'amount' ? (parseFloat(value) || '') : value
    });
  };

  const handleSubmit = () => {
    if (!newInvestment.amount) {
      return; // Basic validation
    }
    
    const investment = {
      ...newInvestment,
      id: Date.now(),
      price: mockPrices[newInvestment.type], // Current price at time of investment
      amount: parseFloat(newInvestment.amount)
    };
    
    addInvestment(investment);
    handleClose();
  };

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR').format(date);
  };

  // Calculate current value
  const calculateCurrentValue = (investment) => {
    return investment.amount * mockPrices[investment.type];
  };

  // Styling for dark mode compatibility
  const paperStyle = {
    p: 2, 
    mb: 2,
    bgcolor: darkMode ? 'grey.800' : 'background.paper',
    color: darkMode ? 'white' : 'inherit'
  };

  return (
    <>
      <Paper elevation={3} sx={paperStyle}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Yatırımlarım</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Add />}
            onClick={handleOpen}
          >
            Yeni Yatırım
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {investments.length === 0 ? (
          <Typography variant="body1" align="center">
            Henüz yatırım kaydı yok
          </Typography>
        ) : (
          <List>
            {investments.map((investment) => (
              <ListItem key={investment.id} divider>
                <ListItemText
                  primary={`${investment.type}: ${investment.amount} ${investment.type === 'Altın' || investment.type === 'Gümüş' ? 'gr' : investment.type === 'Dolar' ? '$' : '€'}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.secondary">
                        Alış Değeri: {(investment.amount * investment.price).toLocaleString('tr-TR')} ₺
                      </Typography>
                      {' - '}
                      <Typography component="span" variant="body2" color={calculateCurrentValue(investment) > (investment.amount * investment.price) ? 'success.main' : 'error.main'}>
                        Güncel Değer: {calculateCurrentValue(investment).toLocaleString('tr-TR')} ₺
                      </Typography>
                      {' - '}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {formatDate(investment.date)}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => deleteInvestment(investment.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Yeni Yatırım Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="investment-type-label">Yatırım Türü</InputLabel>
                <Select
                  labelId="investment-type-label"
                  name="type"
                  value={newInvestment.type}
                  label="Yatırım Türü"
                  onChange={handleChange}
                >
                  {investmentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label} - Güncel Fiyat: {mockPrices[type.value].toLocaleString('tr-TR')} ₺
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="amount"
                label={`Miktar ${newInvestment.type === 'Altın' || newInvestment.type === 'Gümüş' ? '(gr)' : newInvestment.type === 'Dolar' ? '($)' : '(€)'}`}
                type="number"
                fullWidth
                variant="outlined"
                value={newInvestment.amount}
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
                value={newInvestment.date}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            {newInvestment.amount && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  Toplam Değer: {(parseFloat(newInvestment.amount) * mockPrices[newInvestment.type]).toLocaleString('tr-TR')} ₺
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            color="primary"
            disabled={!newInvestment.amount}
          >
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InvestmentSection; 