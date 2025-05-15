import { useContext, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  useTheme, 
  useMediaQuery 
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { FinanceContext } from '../contexts/FinanceContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { incomes, expenses } = useContext(FinanceContext);

  // Kategori bazlı gelir ve gider verilerini hazırla
  const { incomePieData, expensePieData, monthlyBarData } = useMemo(() => {
    // Gelirleri kategorilere göre grupla
    const incomeByCategory = incomes.reduce((acc, income) => {
      const category = income.category;
      acc[category] = (acc[category] || 0) + income.amount;
      return acc;
    }, {});

    // Giderleri kategorilere göre grupla
    const expenseByCategory = expenses.reduce((acc, expense) => {
      const category = expense.category;
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {});

    // Pasta grafik için verileri formatla
    const incomePieData = Object.entries(incomeByCategory).map(([name, value]) => ({
      name,
      value
    }));

    const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value
    }));

    // Aylık toplam gelir ve giderleri hesapla
    const monthlyData = [...incomes, ...expenses].reduce((acc, item) => {
      const date = new Date(item.date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = { income: 0, expense: 0 };
      }
      
      if (incomes.includes(item)) {
        acc[monthYear].income += item.amount;
      } else {
        acc[monthYear].expense += item.amount;
      }
      
      return acc;
    }, {});

    // Çubuk grafik için verileri formatla
    const monthlyBarData = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        Gelir: data.income,
        Gider: data.expense
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split('/');
        const [bMonth, bYear] = b.month.split('/');
        return new Date(aYear, aMonth - 1) - new Date(bYear, bMonth - 1);
      });

    return { incomePieData, expensePieData, monthlyBarData };
  }, [incomes, expenses]);

  const totalIncome = useMemo(() => 
    incomes.reduce((sum, income) => sum + income.amount, 0)
  , [incomes]);

  const totalExpense = useMemo(() => 
    expenses.reduce((sum, expense) => sum + expense.amount, 0)
  , [expenses]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Toplam Özet */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              bgcolor: 'success.light',
              color: 'white'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Toplam Gelir
            </Typography>
            <Typography variant="h4">
              {totalIncome.toLocaleString('tr-TR')} ₺
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              bgcolor: 'error.light',
              color: 'white'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Toplam Gider
            </Typography>
            <Typography variant="h4">
              {totalExpense.toLocaleString('tr-TR')} ₺
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              bgcolor: totalIncome - totalExpense >= 0 ? 'primary.light' : 'warning.light',
              color: 'white'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Net Durum
            </Typography>
            <Typography variant="h4">
              {(totalIncome - totalExpense).toLocaleString('tr-TR')} ₺
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Pasta Grafikler */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom align="center">
              Gelir Dağılımı
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value.toLocaleString('tr-TR')}₺`}
                >
                  {incomePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString('tr-TR') + '₺'} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom align="center">
              Gider Dağılımı
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value.toLocaleString('tr-TR')}₺`}
                >
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString('tr-TR') + '₺'} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Aylık Gelir/Gider Grafiği */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom align="center">
          Aylık Gelir/Gider Analizi
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyBarData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => value.toLocaleString('tr-TR') + '₺'} />
            <Legend />
            <Bar dataKey="Gelir" fill="#4caf50" />
            <Bar dataKey="Gider" fill="#f44336" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default Dashboard; 