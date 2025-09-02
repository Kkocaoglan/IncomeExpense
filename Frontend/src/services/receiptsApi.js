import apiClient from './apiClient';

export const listReceipts = (filters = {}) => {
  const qs = new URLSearchParams(filters);
  return apiClient.get(`/receipts?${qs.toString()}`);
};

export const createReceipt = (payload) =>
  apiClient.post('/receipts', payload);
