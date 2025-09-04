import { useState, useContext, useEffect, useMemo } from 'react';
import {
  Paper, Typography, Box, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Grid, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Divider,
  Chip, Alert, CircularProgress
} from '@mui/material';
import { Add, Delete, TrendingUp, TrendingDown, Refresh } from '@mui/icons-material';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { getAllLivePrices, calculateInvestmentValue, calculateProfitLoss } from '../services/liveInvestmentService';

const InvestmentSection = () => {
  const { investments, addInvestment, deleteInvestment } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    type: 'Altın',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Live price states
  const [livePrices, setLivePrices] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  // Investment types with emojis
  const investmentTypes = [
    { value: 'Altın', label: 'Altın (gr)', icon: '🥇' },
    { value: 'Gümüş', label: 'Gümüş (gr)', icon: '🥈' },
    { value: 'Dolar', label: 'Dolar ($)', icon: '💵' },
    { value: 'Euro', label: 'Euro (€)', icon: '💶' },
    { value: 'Sterlin', label: 'Sterlin (£)', icon: '💷' }
  ];

  // Function to load live prices
  const loadLivePrices = async () => {
    setLoading(true);
    setError('');
    try {
      const prices = await getAllLivePrices();
      if (prices) {
        setLivePrices(prices);
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err.message || 'Canlı fiyatlar yüklenemedi';
      setError(errorMessage);
      console.error('Fiyat yükleme hatası:', err);
      
      // Hata durumunda livePrices'ı temizle
      setLivePrices(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and auto-update
  useEffect(() => {
    loadLivePrices();
    const interval = setInterval(loadLivePrices, 30000); // 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => { setOpen(true); };
  const handleClose = () => {
    setOpen(false);
    setNewInvestment({
      type: 'Altın',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewInvestment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!newInvestment.amount) return;

    // Canlı fiyat kontrolü
    if (!livePrices) {
      setError('Canlı fiyatlar yüklenemedi. Lütfen önce fiyatları yenileyin.');
      return;
    }

    // Get live price for the new investment
    let currentPrice = 0;
    switch (newInvestment.type) {
      case 'Altın':
        currentPrice = livePrices.gold;
        break;
      case 'Gümüş':
        currentPrice = livePrices.silver;
        break;
      case 'Dolar':
        currentPrice = livePrices.forex.USD;
        break;
      case 'Euro':
        currentPrice = livePrices.forex.EUR;
        break;
      case 'Sterlin':
        currentPrice = livePrices.forex.GBP;
        break;
      default:
        currentPrice = 0;
    }

    if (currentPrice <= 0) {
      setError(`${newInvestment.type} için geçerli fiyat bulunamadı. Lütfen fiyatları yenileyin.`);
      return;
    }

    const investment = {
      ...newInvestment,
      id: Date.now(),
      price: currentPrice, // Use live price as purchase price
      amount: parseFloat(newInvestment.amount),
      purchaseDate: newInvestment.date
    };

    addInvestment(investment);
    handleClose();
  };

  const formatTRY = (n) => (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
  const formatDate = (dateString) => new Intl.DateTimeFormat('tr-TR').format(new Date(dateString));

  const paperStyle = {
    p: 3,
    mb: 3,
    bgcolor: darkMode ? 'grey.800' : 'background.paper'
  };

  return (
    <>
      {/* Investment List */}
      <Paper elevation={3} sx={paperStyle}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Yatırımlarım</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {lastUpdated && (
              <Typography variant="body2" color="text.secondary">
                Son Güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
              </Typography>
            )}
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadLivePrices}
              disabled={loading}
              size="small"
            >
              {loading ? <CircularProgress size={16} /> : 'Yenile'}
            </Button>
            <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleOpen}>
              Yeni Yatırım
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {livePrices && livePrices.isFallback && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Bilgi:</strong> Canlı fiyatlar alınamadığı için yaklaşık değerler kullanılıyor. 
              Gerçek fiyatlar için "Yenile" butonuna tıklayın.
            </Typography>
          </Alert>
        )}

        {investments.length === 0 ? (
          <Typography variant="body1" align="center">Henüz yatırım kaydı yok</Typography>
        ) : (
          <List>
            {investments.map((inv) => {
              const currentValue = calculateInvestmentValue(inv, livePrices);
              const profitLoss = calculateProfitLoss(inv, livePrices);
              const isProfit = profitLoss.profitLoss >= 0;

              return (
                <ListItem key={inv.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">
                          {inv.type === 'Altın' || inv.type === 'Gümüş' ? '🥇' : '💵'} {inv.type}
                        </Typography>
                        <Chip
                          label={`${inv.amount} ${inv.type === 'Altın' || inv.type === 'Gümüş' ? 'gr' : inv.type === 'Dolar' ? '$' : inv.type === 'Euro' ? '€' : '£'}`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Alış Tarihi: {formatDate(inv.purchaseDate)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Alış Fiyatı: {formatTRY(inv.price)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Alış Değeri: {formatTRY(inv.amount * inv.price)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Güncel Fiyat: {formatTRY(livePrices ?
                                (inv.type === 'Altın' ? livePrices.gold :
                                 inv.type === 'Gümüş' ? livePrices.silver :
                                 livePrices.forex[inv.type]) : inv.price
                              )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Güncel Değer: {formatTRY(currentValue)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              {isProfit ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                              <Typography
                                variant="body2"
                                color={isProfit ? 'success.main' : 'error.main'}
                                sx={{ fontWeight: 'bold' }}
                              >
                                {isProfit ? '+' : ''}{formatTRY(profitLoss.profitLoss)}
                                ({isProfit ? '+' : ''}{profitLoss.profitLossPercentage.toFixed(2)}%)
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="delete" onClick={() => deleteInvestment(inv.id)} color="error">
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      {/* Yeni Yatırım Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
                    <MenuItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </MenuItem>
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
                label="Alış Tarihi"
                type="date"
                fullWidth
                variant="outlined"
                value={newInvestment.date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Canlı Fiyat Önizlemesi */}
            {newInvestment.amount && livePrices && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Canlı Fiyat:</strong> {
                      newInvestment.type === 'Altın' ? formatTRY(livePrices.gold) :
                      newInvestment.type === 'Gümüş' ? formatTRY(livePrices.silver) :
                      newInvestment.type === 'Dolar' ? formatTRY(livePrices.forex.USD) :
                      newInvestment.type === 'Euro' ? formatTRY(livePrices.forex.EUR) :
                      formatTRY(livePrices.forex.GBP)
                    } / birim
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tahmini Değer:</strong> {formatTRY(
                      newInvestment.amount * (
                        newInvestment.type === 'Altın' ? livePrices.gold :
                        newInvestment.type === 'Gümüş' ? livePrices.silver :
                        newInvestment.type === 'Dolar' ? livePrices.forex.USD :
                        newInvestment.type === 'Euro' ? livePrices.forex.EUR :
                        livePrices.forex.GBP
                      )
                    )}
                  </Typography>
                </Alert>
              </Grid>
            )}
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