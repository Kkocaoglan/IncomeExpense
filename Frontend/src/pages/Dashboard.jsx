import { useContext, useState } from 'react';
import { Container, Grid, Typography, Paper, Button, Box, Card, CardContent, useTheme, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import IncomeExpenseBar from '../components/IncomeExpenseBar';
import TransactionList from '../components/TransactionList';
import InvestmentSection from '../components/InvestmentSection';
import TransactionDialog from '../components/TransactionDialog';
import DocumentScanDialog from '../components/DocumentScanDialog';
import ExchangeRates from '../components/ExchangeRates';
import Chatbot from '../components/Chatbot';
import { FinanceContext } from '../contexts/FinanceContext';
import { ThemeContext } from '../contexts/ThemeContext';

const Dashboard = () => {
  const { incomes, expenses, addIncome, addExpense } = useContext(FinanceContext);
  const { darkMode } = useContext(ThemeContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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

  const StatCard = ({ title, value, icon, color }) => (
    <Card 
      elevation={3} 
      sx={{ 
        height: '100%',
        background: darkMode ? 'linear-gradient(45deg, #1a1a1a 30%, #2d2d2d 90%)' : 'linear-gradient(45deg, #ffffff 30%, #f5f5f5 90%)',
        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-5px)'
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: `${color}20`,
            color: color,
            mr: 2
          }}>
            {icon}
          </Box>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: color }}>
          ₺{value.toLocaleString('tr-TR')}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Exchange Rates Section */}
        <Grid item xs={12}>
          <ExchangeRates />
        </Grid>

        {/* Chatbot Section */}
        <Grid item xs={12}>
          <Chatbot />
        </Grid>

        {/* Summary Cards */}
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Toplam Gelir"
            value={totalIncome}
            icon={<TrendingUpIcon />}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Toplam Gider"
            value={totalExpense}
            icon={<TrendingDownIcon />}
            color={theme.palette.error.main}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Net Durum"
            value={balance}
            icon={<AccountBalanceIcon />}
            color={balance >= 0 ? theme.palette.success.main : theme.palette.error.main}
          />
        </Grid>

        {/* Income Expense Bar */}
        <Grid item xs={12}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3,
              background: darkMode ? 'linear-gradient(45deg, #1a1a1a 30%, #2d2d2d 90%)' : 'linear-gradient(45deg, #ffffff 30%, #f5f5f5 90%)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}
          >
            <IncomeExpenseBar />
          </Paper>
        </Grid>

        {/* Transaction Lists */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3,
              height: '100%',
              background: darkMode ? 'linear-gradient(45deg, #1a1a1a 30%, #2d2d2d 90%)' : 'linear-gradient(45deg, #ffffff 30%, #f5f5f5 90%)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>Gelirler</Typography>
              <Button 
                variant="contained" 
                color="success" 
                startIcon={<AddIcon />} 
                onClick={handleOpenIncomeForm}
                sx={{ 
                  mr: 1,
                  background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1b5e20 30%, #2e7d32 90%)'
                  }
                }}
              >
                Gelir Ekle
              </Button>
              <Button 
                variant="contained" 
                color="info" 
                onClick={handleOpenIncomeCamera}
                title="Kamera (beta)"
                sx={{
                  minWidth: 48,
                  p: 1,
                  background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)'
                  }
                }}
              >
                <CameraAltIcon />
              </Button>
            </Box>
            <TransactionList type="income" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3,
              height: '100%',
              background: darkMode ? 'linear-gradient(45deg, #1a1a1a 30%, #2d2d2d 90%)' : 'linear-gradient(45deg, #ffffff 30%, #f5f5f5 90%)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>Giderler</Typography>
              <Button 
                variant="contained" 
                color="error" 
                startIcon={<AddIcon />} 
                onClick={handleOpenExpenseForm}
                sx={{ 
                  mr: 1,
                  background: 'linear-gradient(45deg, #c62828 30%, #d32f2f 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #b71c1c 30%, #c62828 90%)'
                  }
                }}
              >
                Gider Ekle
              </Button>
              <Button 
                variant="contained" 
                color="info" 
                onClick={handleOpenExpenseCamera}
                title="Kamera (beta)"
                sx={{
                  minWidth: 48,
                  p: 1,
                  background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)'
                  }
                }}
              >
                <CameraAltIcon />
              </Button>
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