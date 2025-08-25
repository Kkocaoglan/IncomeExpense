import { useState, useContext, useEffect, useMemo } from 'react';
import { 
  Paper, Typography, Box, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Grid, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Divider
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';
// Live price fetching removed

const InvestmentSection = () => {
  const { investments, addInvestment, deleteInvestment } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    type: 'Altın',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Basit mod: canlı fiyat yok, sadece alış fiyatıyla değer hesaplanır
  const [lastUpdated] = useState(null);

  // Yatırım türleri
  const investmentTypes = [
    { value: 'Altın', label: 'Altın (gr)' },
    { value: 'Gümüş', label: 'Gümüş (gr)' },
    { value: 'Dolar', label: 'Dolar ($)' },
    { value: 'Euro', label: 'Euro (€)' },
    { value: 'Sterlin', label: 'Sterlin (£)' }
  ];

  // Canlı/dünkü fiyatlar kaldırıldı

  const handleOpen = () => { setOpen(true); };
  const handleClose = () => {
    setOpen(false);
    setNewInvestment({ type: 'Altın', amount: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewInvestment({
      ...newInvestment,
      [name]: name === 'amount' ? (parseFloat(String(value).replace(/[\.\s]/g, '').replace(',', '.')) || '') : value
    });
  };

  const handleSubmit = async () => {
    if (!newInvestment.amount) return;
    // Basit mod: kullanıcıdan alış fiyatı girilecek
    const pricePerUnit = parseFloat(prompt('Alış fiyatı (TRY) birim başına:') || '0');
    const investment = {
      ...newInvestment,
      id: Date.now(),
      price: pricePerUnit || 0,
      amount: parseFloat(newInvestment.amount)
    };
    addInvestment(investment);
    handleClose();
  };

  const formatTRY = (n) => (n || 0).toLocaleString('tr-TR') + ' ₺';
  const formatDate = (dateString) => new Intl.DateTimeFormat('tr-TR').format(new Date(dateString));
  const currentValue = (investment) => investment.amount * (investment.price || 0);
  // Günlük getiri kaldırıldı

  const paperStyle = {
    p: 2, 
    mb: 2,
    bgcolor: darkMode ? 'grey.800' : 'background.paper',
    color: darkMode ? 'white' : 'inherit'
  };

  return (
    <>
      <Paper elevation={3} sx={paperStyle}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Yatırımlarım</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {lastUpdated && (
              <Typography variant="body2" color="text.secondary">
                Güncellendi: {lastUpdated.toLocaleTimeString('tr-TR')}
              </Typography>
            )}
            <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleOpen}>
              Yeni Yatırım
            </Button>
          </Box>
        </Box>
        {/* Günlük getiri kaldırıldı (canlı fiyat yok) */}

        <Divider sx={{ mb: 2 }} />

        {investments.length === 0 ? (
          <Typography variant="body1" align="center">Henüz yatırım kaydı yok</Typography>
        ) : (
          <List>
            {investments.map((inv) => (
              <ListItem key={inv.id} divider>
                <ListItemText
                  primary={`${inv.type}: ${inv.amount} ${inv.type === 'Altın' || inv.type === 'Gümüş' ? 'gr' : inv.type === 'Dolar' ? '$' : inv.type === 'Euro' ? '€' : '£'}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.secondary">
                        Alış Değeri: {formatTRY(inv.amount * (inv.price || 0))}
                      </Typography>
                      {' - '}
                      <Typography component="span" variant="body2" color={currentValue(inv) >= (inv.amount * (inv.price || 0)) ? 'success.main' : 'error.main'}>
                        Güncel Değer: {formatTRY(currentValue(inv))}
                      </Typography>
                      {/* Günlük getiri kaldırıldı */}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {formatDate(inv.date)}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="delete" onClick={() => deleteInvestment(inv.id)} color="error">
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
                  {investmentTypes.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="amount"
                label={`Miktar ${newInvestment.type === 'Altın' || newInvestment.type === 'Gümüş' ? '(gr)' : newInvestment.type === 'Dolar' ? '($)' : newInvestment.type === 'Euro' ? '(€)' : '(£)'}`}
                type="number"
                fullWidth
                variant="outlined"
                value={newInvestment.amount}
                onChange={handleChange}
                onKeyDown={(e) => { if (['-','+','e','E'].includes(e.key)) e.preventDefault(); }}
                onPaste={(e) => {
                  const text = (e.clipboardData || window.clipboardData).getData('text');
                  const num = parseFloat(text.replace(/[\.\s]/g, '').replace(',', '.'));
                  if (isNaN(num) || num < 0) e.preventDefault();
                }}
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
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {/* Anlık değer önizlemesi kaldırıldı */}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={!newInvestment.amount}>
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InvestmentSection; 