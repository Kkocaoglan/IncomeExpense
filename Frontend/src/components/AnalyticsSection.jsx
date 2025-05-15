import React, { useContext, useMemo } from 'react';
import { Paper, Typography, Box, Grid } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FinanceContext } from '../contexts/FinanceContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

const AnalyticsSection = () => {
  const { expenses, incomes } = useContext(FinanceContext);

  // Kategori bazlı gider analizi
  const expenseByCategory = useMemo(() => {
    const categoryTotals = {};
    expenses.forEach(expense => {
      const category = expense.category || 'diger';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value
    }));
  }, [expenses]);

  // Aylık karşılaştırma
  const monthlyComparison = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    const lastMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return expenseDate.getMonth() === lastMonth && 
               expenseDate.getFullYear() === lastMonthYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      current: currentMonthExpenses,
      last: lastMonthExpenses,
      change: ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    };
  }, [expenses]);

  return (
    <Grid container spacing={3}>
      {/* Kategori Dağılımı */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Gider Kategorileri
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₺${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>

      {/* Aylık Karşılaştırma */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Aylık Karşılaştırma
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              Bu Ay: ₺{monthlyComparison.current.toFixed(2)}
            </Typography>
            <Typography variant="body1">
              Geçen Ay: ₺{monthlyComparison.last.toFixed(2)}
            </Typography>
            <Typography 
              variant="body1" 
              color={monthlyComparison.change >= 0 ? 'error.main' : 'success.main'}
            >
              Değişim: %{monthlyComparison.change.toFixed(1)}
            </Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AnalyticsSection; 