import apiClient from './apiClient';

/**
 * ADMIN-ONLY API Client
 * Bu dosya sadece admin kullanıcılar için
 * Normal kullanıcılar bu dosyaya erişemez
 */

// Security check - Admin role kontrolü
const ensureAdmin = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user || user.role !== 'ADMIN') {
    throw new Error('SECURITY_VIOLATION: Admin access required');
  }
  return user;
};

// Admin Dashboard API calls
export const adminDashboard = {
  // Dashboard istatistikleri
  async getStats() {
    ensureAdmin();
    return apiClient.get('/admin/dashboard/stats');
  },

  // Kullanıcı artışı
  async getUserGrowth(days = 30) {
    ensureAdmin();
    return apiClient.get(`/admin/dashboard/user-growth?days=${days}`);
  },

  // Transaction trendleri
  async getTransactionTrends(days = 30) {
    ensureAdmin();
    return apiClient.get(`/admin/dashboard/transaction-trends?days=${days}`);
  }
};

// User Management API calls
export const adminUsers = {
  // Kullanıcı listesi
  async getUsers(params = {}) {
    ensureAdmin();
    const query = new URLSearchParams(params);
    return apiClient.get(`/admin/users?${query}`);
  },

  // Kullanıcı detayları
  async getUser(userId) {
    ensureAdmin();
    if (!userId || typeof userId !== 'string') {
      throw new Error('SECURITY_VIOLATION: Invalid user ID');
    }
    return apiClient.get(`/admin/users/${userId}`);
  },

  // Kullanıcı rolü güncelleme (CRITICAL OPERATION)
  async updateUserRole(userId, role) {
    ensureAdmin();
    
    // Extra security checks
    if (!userId || !role) {
      throw new Error('SECURITY_VIOLATION: Missing required parameters');
    }
    
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new Error('SECURITY_VIOLATION: Invalid role');
    }

    // Kendini demote edemez
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (currentUser.id === userId && role === 'USER') {
      throw new Error('SECURITY_VIOLATION: Cannot demote yourself');
    }

    return apiClient.put(`/admin/users/${userId}/role`, { role });
  },

  // Kullanıcı oturumlarını sonlandır (CRITICAL OPERATION)
  async revokeUserSessions(userId) {
    ensureAdmin();
    
    if (!userId || typeof userId !== 'string') {
      throw new Error('SECURITY_VIOLATION: Invalid user ID');
    }

    // Confirm dialog gerekli
    if (!window.confirm('Bu kullanıcının tüm oturumları sonlandırılacak. Emin misiniz?')) {
      throw new Error('OPERATION_CANCELLED: User cancelled');
    }

    return apiClient.post(`/admin/users/${userId}/revoke-sessions`);
  },

  // Kullanıcı istatistikleri
  async getUserStats() {
    ensureAdmin();
    return apiClient.get('/admin/users/stats/overview');
  }
};

// System Management API calls
export const adminSystem = {
  // Sistem sağlığı
  async getHealth() {
    ensureAdmin();
    return apiClient.get('/admin/system/health');
  },

  // Performans metrikleri
  async getPerformance() {
    ensureAdmin();
    return apiClient.get('/admin/system/performance');
  },

  // Database istatistikleri
  async getDatabaseStats() {
    ensureAdmin();
    return apiClient.get('/admin/system/database');
  },

  // Sistem logları (SENSITIVE)
  async getLogs(level = 'info', limit = 100) {
    ensureAdmin();
    
    // Log level validation
    const validLevels = ['info', 'warn', 'error', 'debug', 'all'];
    if (!validLevels.includes(level)) {
      throw new Error('SECURITY_VIOLATION: Invalid log level');
    }

    // Limit validation
    if (limit > 1000) {
      throw new Error('SECURITY_VIOLATION: Limit too high');
    }

    return apiClient.get(`/admin/system/logs?level=${level}&limit=${limit}`);
  }
};

// Security Management API calls
export const adminSecurity = {
  // Güvenlik loglarını getir
  async getLogs(params = {}) {
    ensureAdmin();
    const query = new URLSearchParams(params);
    return apiClient.get(`/admin/security/logs?${query}`);
  },

  // Güvenlik istatistikleri
  async getStats() {
    ensureAdmin();
    return apiClient.get('/admin/security/stats');
  },

  // Logları dışa aktar
  async exportLogs(filters = {}) {
    ensureAdmin();
    return apiClient.post('/admin/security/export', filters, {
      responseType: 'blob'
    });
  },

  // Logları temizle
  async clearLogs() {
    ensureAdmin();
    
    // Confirm dialog gerekli
    if (!window.confirm('Tüm güvenlik logları silinecek. Bu işlem geri alınamaz. Emin misiniz?')) {
      throw new Error('OPERATION_CANCELLED: User cancelled');
    }
    
    return apiClient.delete('/admin/security/clear');
  }
};

// Security audit logging
const logAdminAction = (action, params = {}) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  // Console'a admin action log
  console.warn(`🛡️ ADMIN ACTION: ${action}`, {
    user: user?.email,
    timestamp: new Date().toISOString(),
    params,
    userAgent: navigator.userAgent
  });

  // Production'da bu bilgiler backend'e gönderilir
  if (process.env.NODE_ENV === 'production') {
    // Backend audit log endpoint'ine gönder
    apiClient.post('/admin/audit/log', {
      action,
      params,
      timestamp: new Date().toISOString()
    }).catch(err => console.error('Audit log failed:', err));
  }
};

// Wrapper function for all admin API calls with logging
const wrapWithAudit = (apiObject, objectName) => {
  const wrapped = {};
  
  for (const [methodName, method] of Object.entries(apiObject)) {
    wrapped[methodName] = async (...args) => {
      const actionName = `${objectName}.${methodName}`;
      
      try {
        logAdminAction(actionName, { args });
        const result = await method(...args);
        logAdminAction(`${actionName}_SUCCESS`);
        return result;
      } catch (error) {
        logAdminAction(`${actionName}_ERROR`, { error: error.message });
        throw error;
      }
    };
  }
  
  return wrapped;
};

// Export wrapped APIs with audit logging
export const auditedAdminDashboard = wrapWithAudit(adminDashboard, 'dashboard');
export const auditedAdminUsers = wrapWithAudit(adminUsers, 'users');
export const auditedAdminSystem = wrapWithAudit(adminSystem, 'system');
export const auditedAdminSecurity = wrapWithAudit(adminSecurity, 'security');

// Default exports for convenience
export default {
  dashboard: auditedAdminDashboard,
  users: auditedAdminUsers,
  system: auditedAdminSystem,
  security: auditedAdminSecurity
};
