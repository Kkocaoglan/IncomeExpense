import apiClient from './apiClient';

export const mfaVerify = (data) => apiClient.post('/auth/mfa/verify', data);
export const mfaVerifyBackup = (data) => apiClient.post('/auth/mfa/verify-backup', data);
export const twofaSetup = () => apiClient.post('/auth/2fa/setup', {});
export const twofaEnable = (payload) => apiClient.post('/auth/2fa/enable', payload);
export const twofaDisable = (payload) => apiClient.post('/auth/2fa/disable', payload);
export const twofaStatus = () => apiClient.get('/auth/2fa/status');


