/**
 * Güvenlik Log Middleware
 * Kritik güvenlik olaylarını loglar
 */

const prisma = require('../lib/prisma');

async function logSecurityEvent(req, level, type, event, details = null, metadata = {}) {
  try {
    await prisma.securityLog.create({
      data: {
        level: level.toUpperCase(),
        type,
        event,
        details,
        userId: req.user?.id,
        userEmail: req.user?.email,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: {
          method: req.method,
          url: req.originalUrl,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      }
    });
  } catch (error) {
    console.error('Güvenlik log hatası:', error);
  }
}

function securityLog(level = 'MEDIUM', type = 'system') {
  return (req, res, next) => {
    // Response interceptor ekle
    const originalSend = res.send;
    res.send = function(data) {
      // Güvenlik olaylarını logla
      if (res.statusCode >= 400) {
        const event = `HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`;
        const details = typeof data === 'string' ? data : JSON.stringify(data);
        
        logSecurityEvent(req, level, type, event, details, {
          statusCode: res.statusCode,
          responseData: data
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// Admin erişim logları
function logAdminAccess(req, res, next) {
  if (req.user?.role === 'ADMIN') {
    logSecurityEvent(req, 'HIGH', 'authorization', 'Admin panel erişimi', 
      `Admin kullanıcı ${req.user.email} admin paneline erişti`, {
        adminId: req.user.id,
        adminEmail: req.user.email,
        path: req.originalUrl
      });
  }
  next();
}

// Başarısız giriş denemeleri
function logFailedLogin(req, res, next) {
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      const event = 'Başarısız giriş denemesi';
      const details = `IP: ${req.ip}, Email: ${req.body?.email || 'N/A'}`;
      
      logSecurityEvent(req, 'MEDIUM', 'authentication', event, details, {
        statusCode: res.statusCode,
        attemptedEmail: req.body?.email
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

module.exports = {
  securityLog,
  logSecurityEvent,
  logAdminAccess,
  logFailedLogin
};
