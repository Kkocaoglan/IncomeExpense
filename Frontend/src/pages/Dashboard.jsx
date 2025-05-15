import { useContext, useState } from 'react';
import { Container, Grid, Typography, Paper, Button, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import IncomeExpenseBar from '../components/IncomeExpenseBar';
import TransactionList from '../components/TransactionList';
import InvestmentSection from '../components/InvestmentSection';
import TransactionDialog from '../components/TransactionDialog';
import DocumentScanDialog from '../components/DocumentScanDialog';
import ExchangeRates from '../components/ExchangeRates';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';

const Dashboard = () => {
  const { incomes, expenses, addIncome, addExpense } = useContext(FinanceContext);
  // State for transaction dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('income');
  // State for document scan dialog
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanType, setScanType] = useState('income');
  // Calculate total income and expenses
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const balance = totalIncome - totalExpense;

  const handleOpenIncomeForm = () => {
    setDialogType('income');
    setDialogOpen(true);
  };
  const handleOpenExpenseForm = () => {
    setDialogType('expense');
    setDialogOpen(true);
  };
  const handleCloseDialog = (transaction) => {
    if (transaction) {
      if (dialogType === 'income') {
        addIncome(transaction);
      } else {
        addExpense(transaction);
      }
    }
    setDialogOpen(false);
  };
  const handleOpenIncomeCamera = () => {
    setScanType('income');
    setScanDialogOpen(true);
  };
  const handleOpenExpenseCamera = () => {
    setScanType('expense');
    setScanDialogOpen(true);
  };
  const handleCloseScanDialog = () => {
    setScanDialogOpen(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Exchange Rates Section */}
        <Grid item xs={12}>
          <ExchangeRates />
        </Grid>
        {/* Toplam Özet */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 3, bgcolor: 'success.main', color: 'white' }}>
              <Typography variant="h6" gutterBottom>
                Toplam Gelir
              </Typography>
              <Typography variant="h4">
                {totalIncome.toLocaleString('tr-TR')} ₺
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 3, bgcolor: 'error.main', color: 'white' }}>
              <Typography variant="h6" gutterBottom>
                Toplam Gider
              </Typography>
              <Typography variant="h4">
                {totalExpense.toLocaleString('tr-TR')} ₺
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 3, bgcolor: balance >= 0 ? 'success.main' : 'error.main', color: 'white' }}>
              <Typography variant="h6" gutterBottom>
                Net Durum
              </Typography>
              <Typography variant="h4">
                {balance.toLocaleString('tr-TR')} ₺
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        {/* Income Expense Bar with tax breakdown */}
        <Grid item xs={12}>
          <IncomeExpenseBar />
        </Grid>
        {/* Transaction Lists and Add Buttons */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: 'background.paper', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>Gelirler</Typography>
              <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={handleOpenIncomeForm} sx={{ mr: 1 }}>Gelir Ekle</Button>
              <Button variant="contained" color="info" onClick={handleOpenIncomeCamera} title="Belge tarama veya fotoğraf çekme"><FileUploadIcon /></Button>
            </Box>
            <TransactionList type="income" />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: 'background.paper', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>Giderler</Typography>
              <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={handleOpenExpenseForm} sx={{ mr: 1 }}>Gider Ekle</Button>
              <Button variant="contained" color="info" onClick={handleOpenExpenseCamera} title="Belge tarama veya fotoğraf çekme"><FileUploadIcon /></Button>
            </Box>
            <TransactionList type="expense" />
          </Paper>
        </Grid>
        {/* Investment Section */}
        <Grid item xs={12}>
          <InvestmentSection />
        </Grid>
      </Grid>
      {/* Transaction Dialog */}
      <TransactionDialog 
        open={dialogOpen} 
        handleClose={handleCloseDialog} 
        type={dialogType} 
      />
      {/* Document Scan Dialog */}
      <DocumentScanDialog
        open={scanDialogOpen}
        handleClose={handleCloseScanDialog}
        type={scanType}
      />
    </Container>
  );
};

export default Dashboard; 