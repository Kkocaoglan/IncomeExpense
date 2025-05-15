import { createContext, useState, useEffect } from 'react';
import { getGoldPrice } from '../services/exchangeService';

export const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  const [incomes, setIncomes] = useState(() => {
    const savedIncomes = localStorage.getItem('incomes');
    return savedIncomes ? JSON.parse(savedIncomes) : [];
  });

  const [expenses, setExpenses] = useState(() => {
    const savedExpenses = localStorage.getItem('expenses');
    return savedExpenses ? JSON.parse(savedExpenses) : [];
  });

  const [investments, setInvestments] = useState(() => {
    const savedInvestments = localStorage.getItem('investments');
    return savedInvestments ? JSON.parse(savedInvestments) : [];
  });

  const [goldPrice, setGoldPrice] = useState(0);

  useEffect(() => {
    localStorage.setItem('incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('investments', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        const data = await getGoldPrice();
        const pricePerGram = data.rates.TRY / 31.1034768;
        setGoldPrice(pricePerGram);
      } catch (error) {
        console.error('Error fetching gold price:', error);
      }
    };

    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  const addIncome = (income) => {
    const newIncome = {
      ...income,
      id: income.id || Date.now(),
      date: income.date || new Date().toISOString(),
      amount: parseFloat(income.amount)
    };
    setIncomes(prevIncomes => [...prevIncomes, newIncome]);
  };

  const addExpense = (expense) => {
    const newExpense = {
      ...expense,
      id: expense.id || Date.now(),
      date: expense.date || new Date().toISOString(),
      amount: parseFloat(expense.amount)
    };
    setExpenses(prevExpenses => [...prevExpenses, newExpense]);
  };

  const addInvestment = (newInvestment) => {
    const investment = {
      ...newInvestment,
      id: Date.now(),
      date: newInvestment.date || new Date().toISOString()
    };
    setInvestments(prevInvestments => [...prevInvestments, investment]);
  };

  const deleteIncome = (id) => {
    setIncomes(prevIncomes => prevIncomes.filter(item => item.id !== id));
  };

  const deleteExpense = (id) => {
    setExpenses(prevExpenses => prevExpenses.filter(item => item.id !== id));
  };

  const deleteInvestment = (id) => {
    setInvestments(prevInvestments => prevInvestments.filter(item => item.id !== id));
  };

  return (
    <FinanceContext.Provider value={{
      incomes,
      expenses,
      investments,
      goldPrice,
      addIncome,
      addExpense,
      addInvestment,
      deleteIncome,
      deleteExpense,
      deleteInvestment
    }}>
      {children}
    </FinanceContext.Provider>
  );
}; 