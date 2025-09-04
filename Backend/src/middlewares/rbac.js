/**
 * Role-Based Access Control (RBAC) Middleware
 * Admin rolü kontrolü yapar
 */

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'forbidden',
      message: 'Bu işlem için admin yetkisi gereklidir'
    });
  }
  next();
}

/**
 * Belirli rolleri kontrol eden genel middleware
 * @param {string[]} allowedRoles - İzin verilen roller
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Bu işlem için yeterli yetkiniz bulunmamaktadır'
      });
    }
    next();
  };
}

/**
 * Admin veya kendi kullanıcısı kontrolü
 * @param {string} userIdField - Kontrol edilecek user ID field'ı (varsayılan: 'id')
 */
function requireAdminOrSelf(userIdField = 'id') {
  return (req, res, next) => {
    const targetUserId = req.params[userIdField] || req.body[userIdField];
    
    if (req.user?.role === 'ADMIN') {
      return next(); // Admin her şeye erişebilir
    }
    
    if (req.user?.id === targetUserId) {
      return next(); // Kullanıcı kendi verisine erişebilir
    }
    
    return res.status(403).json({ 
      error: 'forbidden',
      message: 'Bu işlem için yetkiniz bulunmamaktadır'
    });
  };
}

module.exports = { 
  requireAdmin, 
  requireRole, 
  requireAdminOrSelf 
};
