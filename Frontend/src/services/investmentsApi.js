import apiClient from './apiClient';

export const listInvestments = (filters = {}) => {
  const qs = new URLSearchParams(filters);
  return apiClient.get(`/investments?${qs.toString()}`);
};

export const createInvestment = (data) =>
  apiClient.post('/investments', data);

export const updateInvestment = (id, data) =>
  apiClient.put(`/investments/${id}`, data);

export const deleteInvestment = (id) =>
  apiClient.delete(`/investments/${id}`);
