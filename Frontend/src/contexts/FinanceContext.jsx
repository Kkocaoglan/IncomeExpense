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

        // Yatırım verilerini normalize et
        const normalizedInv = inv.rows ? inv.rows.map(i => ({
          ...i,
          id: i.id,
          type: i.type,
          amount: Number(i.amount),
          price: Number(i.price),
          purchaseDate: i.purchaseDate || i.date
        })) : inv.map(i => ({
          ...i,
          id: i.id,
          type: i.type || i.assetType,
          amount: Number(i.amount),
          price: Number(i.price || i.unitPrice),
          purchaseDate: i.purchaseDate || i.date
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
    try {
      // Yatırım verilerini hazırla
      const investmentData = {
        type: newInvestment.type,
        amount: Number(newInvestment.amount),
        price: Number(newInvestment.price), // Canlı fiyat
        purchaseDate: newInvestment.purchaseDate || newInvestment.date || new Date().toISOString(),
        notes: newInvestment.notes
      };

      const created = await invApi.createInvestment(investmentData);
      const normalized = {
        ...created,
        id: created.id || Date.now(),
        type: created.type,
        amount: Number(created.amount),
        price: Number(created.price),
        purchaseDate: created.purchaseDate || created.date
      };
      
      setInvestments(prev => [normalized, ...prev]);
      
      // Yatırımı gelir olarak da ekle (yatırım yapıldığı için)
      const investmentTransaction = {
        id: `inv_${Date.now()}`,
        type: 'income',
        amount: Number(newInvestment.amount) * Number(newInvestment.price),
        description: `${newInvestment.type} Yatırımı - ${newInvestment.amount} ${newInvestment.type === 'Altın' || newInvestment.type === 'Gümüş' ? 'gr' : newInvestment.type === 'Dolar' ? '$' : newInvestment.type === 'Euro' ? '€' : '£'}`,
        category: 'Yatırım',
        date: newInvestment.purchaseDate || newInvestment.date || new Date().toISOString(),
        isInvestment: true,
        investmentId: normalized.id
      };
      
      setTransactions(prev => [investmentTransaction, ...prev]);
      setLastUpdated(Date.now());
      return normalized;
    } catch (error) {
      console.error('Yatırım ekleme hatası:', error);
      throw error;
    }
  };

  const updateInvestment = async (id, patch) => {
    try {
      const updated = await invApi.updateInvestment(id, patch);
      const normalized = {
        ...updated,
        type: updated.type,
        amount: Number(updated.amount),
        price: Number(updated.price),
        purchaseDate: updated.purchaseDate || updated.date
      };
      
      setInvestments(prev => prev.map(item => (item.id === id ? normalized : item)));
      setLastUpdated(Date.now());
      return normalized;
    } catch (error) {
      console.error('Yatırım güncelleme hatası:', error);
      throw error;
    }
  };

  const deleteInvestment = async (id) => {
    try {
      await invApi.deleteInvestment(id);
      setInvestments(prev => prev.filter(item => item.id !== id));
      
      // Yatırımla ilgili gelir kaydını da sil
      setTransactions(prev => prev.filter(tx => !(tx.isInvestment && tx.investmentId === id)));
      
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('Yatırım silme hatası:', error);
      throw error;
    }
  };

  // Portfolio calculation functions
  const calculatePortfolioValue = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.amount * inv.price, 0);
  }, [investments]);

  const calculatePortfolioProfitLoss = useMemo(() => {
    const currentValue = calculatePortfolioValue;
    const initialValue = investments.reduce((sum, inv) => sum + inv.amount * inv.price, 0);
    return currentValue - initialValue;
  }, [investments, calculatePortfolioValue]);

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
    updateInvestment,
    deleteInvestment,
    calculatePortfolioValue,
    calculatePortfolioProfitLoss,
    // misc
    goldPrice,
    // legacy helpers (still used by some components)
    addIncome,
    addExpense,
    deleteIncome,
    deleteExpense,
  }), [loading, transactions, incomes, expenses, investments, goldPrice, calculatePortfolioValue, calculatePortfolioProfitLoss]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}; 