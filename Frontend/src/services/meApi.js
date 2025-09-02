import apiClient from './apiClient';

export const listSessions = () => apiClient.get('/me/sessions');
export const revokeSession = (id) => apiClient.delete(`/me/sessions/${id}`);
export const revokeAll = () => apiClient.post('/me/sessions/revoke-all', {});
// (opsiyonel) aktif oturum id'si
export const currentSession = () => apiClient.get('/me/sessions/current');
