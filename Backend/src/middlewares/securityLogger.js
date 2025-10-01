/**
 * Security Logging Middleware
 * Admin işlemleri ve güvenlik olaylarını detaylı şekilde loglar
 */

const prisma = require('../lib/prisma');

/**
 * Security log seviyeleri
 */
const SECURITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM', 
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Security event tipleri
 */
const EVENT_TYPES = {
  // Authentication events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  MFA_SUCCESS: 'MFA_SUCCESS',
  MFA_FAILED: 'MFA_FAILED',
  
  // Admin events
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  SUDO_ACTIVATED: 'SUDO_ACTIVATED',
  SUDO_EXPIRED: 'SUDO_EXPIRED',
  
  // User management
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_SESSIONS_REVOKED: 'USER_SESSIONS_REVOKED',
  USER_CREATED: 'USER_CREATED',
  USER_DELETED: 'USER_DELETED',
  
  // System events
  SYSTEM_CONFIG_CHANGED: 'SYSTEM_CONFIG_CHANGED',
  DATA_EXPORT: 'DATA_EXPORT',
  
  // Security threats
  BRUTE_FORCE_DETECTED: 'BRUTE_FORCE_DETECTED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  ANOMALY_DETECTED: 'ANOMALY_DETECTED'
};

/**
 * Security log kaydeder
 * @param {Object} options - Log options
 * @param {string} options.eventType - Event tipi (EVENT_TYPES'den)
 * @param {string} options.level - Severity level (SECURITY_LEVELS'den)
 * @param {string} options.userId - İşlemi yapan user ID
 * @param {string} options.targetUserId - Hedef user ID (opsiyonel)
 * @param {string} options.ip - IP adresi
 * @param {string} options.userAgent - User agent
 * @param {Object} options.details - Ek detaylar
 * @param {string} options.description - Açıklama
 */
async function logSecurityEvent({
  eventType,
  level = SECURITY_LEVELS.MEDIUM,
  userId = null,
  targetUserId = null,
  ip = null,
  userAgent = null,
  details = {},
  description = ''
}) {
  try {
    await prisma.securityLog.create({
      data: {
        eventType,
        level,
        userId,
        targetUserId,
        ip,
        userAgent,
        details: JSON.stringify(details),
        description,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Security log yazma hatası:', error);
    // Security log'da hata olsa bile main işlem devam etmeli
  }
}

/**
 * Admin işlemleri için security logging middleware
 * @param {string} eventType - Event tipi
 * @param {string} level - Severity level  
 * @param {string} description - İşlem açıklaması
 */
function logAdminAction(eventType, level = SECURITY_LEVELS.MEDIUM, description = '') {
  return async (req, res, next) => {
    // İlk olarak next()'i çağır ki işlem devam etsin
    next();
    
    // Response tamamlandıktan sonra log yaz
    res.on('finish', async () => {
      try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   req.socket.remoteAddress || 
                   'unknown';
        
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        const details = {
          method: req.method,
          url: req.originalUrl,
          params: req.params,
          query: req.query,
          statusCode: res.statusCode,
          // Sensitive bilgileri çıkar
          body: filterSensitiveData(req.body || {}),
          timestamp: new Date().toISOString()
        };

        // Target user ID'yi parametrelerden al
        const targetUserId = req.params?.id || req.body?.userId || null;

        await logSecurityEvent({
          eventType,
          level,
          userId: req.user?.id || null,
          targetUserId,
          ip,
          userAgent,
          details,
          description: description || `${req.method} ${req.originalUrl}`
        });

      } catch (error) {
        console.error('Admin action logging hatası:', error);
      }
    });
  };
}

/**
 * Hassas verileri filtreler
 * @param {Object} data - Filtrelenecek data
 * @returns {Object} - Filtrelenmiş data
 */
function filterSensitiveData(data) {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
  const filtered = { ...data };
  
  for (const field of sensitiveFields) {
    if (filtered[field]) {
      filtered[field] = '[REDACTED]';
    }
  }
  
  return filtered;
}

/**
 * Automatic security logging middleware
 * Tüm admin route'lar için otomatik logging
 */
function autoSecurityLog(req, res, next) {
  // Sadece admin kullanıcıları için log
  if (req.user?.role !== 'ADMIN') {
    return next();
  }

  const method = req.method;
  const path = req.route?.path || req.path;
  
  // Event type'ı belirle
  let eventType = 'ADMIN_ACTION';
  let level = SECURITY_LEVELS.MEDIUM;
  
  if (path.includes('/role')) {
    eventType = EVENT_TYPES.USER_ROLE_CHANGED;
    level = SECURITY_LEVELS.HIGH;
  } else if (path.includes('/revoke-sessions')) {
    eventType = EVENT_TYPES.USER_SESSIONS_REVOKED;
    level = SECURITY_LEVELS.HIGH;
  } else if (method === 'DELETE') {
    eventType = EVENT_TYPES.USER_DELETED;
    level = SECURITY_LEVELS.CRITICAL;
  } else if (method === 'POST' && path.includes('/users')) {
    eventType = EVENT_TYPES.USER_CREATED;
    level = SECURITY_LEVELS.MEDIUM;
  }

  // Log middleware'ini uygula
  return logAdminAction(eventType, level, `Admin işlemi: ${method} ${path}`)(req, res, next);
}

module.exports = {
  logSecurityEvent,
  logAdminAction,
  autoSecurityLog,
  SECURITY_LEVELS,
  EVENT_TYPES
};
