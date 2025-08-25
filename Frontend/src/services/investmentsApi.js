import apiClient from './apiClient';

const UID = import.meta.env.VITE_DEMO_USER_ID;

export const listInvestments = () =>
  apiClient.get(`/investments?userId=${UID}`);

export const createInvestment = (data) =>
  apiClient.post('/investments', { userId: UID, ...data });

export const updateInvestment = (id, data) =>
  apiClient.put(`/investments/${id}`, data);

export const deleteInvestment = (id) =>
  apiClient.delete(`/investments/${id}`);
