import { createContext, useState, useEffect, useMemo } from 'react';
import { getGoldGramTRY } from '../services/exchangeService';
import * as txApi from '../services/transactionsApi';
import * as invApi from '../services/investmentsApi';

export const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [goldPrice, setGoldPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Derived lists for backward compatibility with UI that expects incomes/expenses
  const incomes = useMemo(
    () => transactions.filter(t => t.type === 'income'),
    [transactions]
  );
  const expenses = useMemo(
    () => transactions.filter(t => t.type === 'expense'),
    [transactions]
  );

  // Initial load from API
  useEffect(() => {
    (async () => {
      try {
        const [tx, inv] = await Promise.all([
          txApi.listTransactions(),
          invApi.listInvestments()
        ]);

        const normalizedTx = tx.map(t => ({ ...t, amount: Number(t.amount) }));
        setTransactions(normalizedTx);

        const normalizedInv = inv.map(i => ({
          ...i,
          amount: Number(i.amount),
          unitPrice: Number(i.unitPrice)
        }));
        setInvestments(normalizedInv);
      } catch (e) {
        console.error('API load failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Gold price polling (kept as before)
  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        const gramTry = await getGoldGramTRY();
        setGoldPrice(gramTry);
      } catch (error) {
        console.error('Error fetching gold price:', error);
      }
    };

    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Transactions API
  const addTransaction = async (data) => {
    if (parseFloat(data.amount) <= 0) {
      alert('Tutar sıfırdan büyük olmalı!');
      return;
    }
    const created = await txApi.createTransaction({
      ...data,
      date: data.date || new Date().toISOString(),
    });
    const normalized = { ...created, amount: Number(created.amount) };
    setTransactions(prev => [normalized, ...prev]);
    setLastUpdated(Date.now());
    return normalized;
  };

  const updateTransaction = async (id, patch) => {
    const updated = await txApi.updateTransaction(id, patch);
    const normalized = { ...updated, amount: Number(updated.amount) };
    setTransactions(prev => prev.map(t => (t.id === id ? normalized : t)));
    setLastUpdated(Date.now());
    return normalized;
  };

  const removeTransaction = async (id) => {
    await txApi.deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    setLastUpdated(Date.now());
  };

  // Backward-compat helpers used by some components
  const addIncome = async (income) => addTransaction({ ...income, type: 'income' });
  const addExpense = async (expense) => addTransaction({ ...expense, type: 'expense' });
  const deleteIncome = async (id) => removeTransaction(id);
  const deleteExpense = async (id) => removeTransaction(id);

  // Investments API
  const addInvestment = async (newInvestment) => {
    const created = await invApi.createInvestment({
      ...newInvestment,
      date: newInvestment.date || new Date().toISOString(),
    });
    const normalized = {
      ...created,
      amount: Number(created.amount),
      unitPrice: Number(created.unitPrice)
    };
    setInvestments(prev => [normalized, ...prev]);
    return normalized;
  };

  const deleteInvestment = async (id) => {
    await invApi.deleteInvestment(id);
    setInvestments(prev => prev.filter(item => item.id !== id));
  };

  const value = useMemo(() => ({
    loading,
    // primary
    transactions,
    lastUpdated,
    addTransaction,
    updateTransaction,
    removeTransaction,
    // derived/compat
    incomes,
    expenses,
    // investments
    investments,
    addInvestment,
    deleteInvestment,
    // misc
    goldPrice,
    // legacy helpers (still used by some components)
    addIncome,
    addExpense,
    deleteIncome,
    deleteExpense,
  }), [loading, transactions, incomes, expenses, investments, goldPrice]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}; 