import apiClient from './apiClient';

const UID = import.meta.env.VITE_DEMO_USER_ID;

export const listReceipts = () =>
  apiClient.get(`/receipts?userId=${UID}`);

export const createReceipt = (payload) =>
  apiClient.post('/receipts', { userId: UID, ...payload });
