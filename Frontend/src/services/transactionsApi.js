import apiClient from './apiClient';

export const listTransactions = async (filters = {}) => {
  const qs = new URLSearchParams(filters);
  return apiClient.get(`/transactions?${qs.toString()}`);
};

export const createTransaction = (data) =>
  apiClient.post('/transactions', data);

export const updateTransaction = (id, data) =>
  apiClient.put(`/transactions/${id}`, data);

export const deleteTransaction = (id) =>
  apiClient.delete(`/transactions/${id}`);
