import apiClient from './apiClient';

const UID = import.meta.env.VITE_DEMO_USER_ID;

export const listTransactions = async (filters = {}) => {
  const params = new URLSearchParams({ userId: UID, ...filters });
  return apiClient.get(`/transactions?${params.toString()}`);
};

export const createTransaction = (data) =>
  apiClient.post('/transactions', { userId: UID, ...data });

export const updateTransaction = (id, data) =>
  apiClient.put(`/transactions/${id}`, data);

export const deleteTransaction = (id) =>
  apiClient.delete(`/transactions/${id}`);
