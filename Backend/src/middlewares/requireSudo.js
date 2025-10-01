/**
 * Sudo-mode middleware
 * Kritik admin işlemleri için ek parola/OTP doğrulaması gerektirir
 */

const { redis } = require('../lib/redis');

async function requireSudo(req, res, next) {
  try {
    // Session ID'yi belirle (JWT'den veya başka kaynaktan)
    const sessionId = req.user?.sessionId || req.user?.id || 'default';
    const sudoKey = `sudo:${sessionId}`;

    // Redis'te sudo session kontrolü
    const sudoSession = await redis.get(sudoKey);
    
    if (!sudoSession) {
      return res.status(403).json({ 
        error: 'sudo_required',
        message: 'Bu kritik işlem için sudo doğrulaması gereklidir',
        action: 'sudo_authenticate',
        sudoExpiry: null
      });
    }

    // Sudo session var, TTL kontrolü
    const ttl = await redis.ttl(sudoKey);
    
    if (ttl <= 0) {
      // Expire olmuş, sudo key'ini temizle
      await redis.del(sudoKey);
      return res.status(403).json({ 
        error: 'sudo_expired',
        message: 'Sudo oturumu süresi dolmuş. Yeniden doğrulama gereklidir',
        action: 'sudo_authenticate',
        sudoExpiry: null
      });
    }

    // Sudo session geçerli
    req.sudoMode = {
      active: true,
      expiresIn: ttl,
      sessionId: sessionId
    };

    next();

  } catch (error) {
    console.error('requireSudo middleware error:', error);
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'Sudo kontrolü sırasında hata oluştu'
    });
  }
}

/**
 * Sudo session oluşturur
 * @param {string} sessionId - User session ID
 * @param {number} durationSeconds - Sudo session süresi (varsayılan: 300 saniye / 5 dakika)
 */
async function createSudoSession(sessionId, durationSeconds = 300) {
  try {
    const sudoKey = `sudo:${sessionId}`;
    await redis.setex(sudoKey, durationSeconds, JSON.stringify({
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationSeconds * 1000).toISOString()
    }));
    
    return {
      success: true,
      expiresIn: durationSeconds,
      expiresAt: new Date(Date.now() + durationSeconds * 1000).toISOString()
    };
  } catch (error) {
    console.error('createSudoSession error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sudo session iptal eder
 * @param {string} sessionId - User session ID
 */
async function revokeSudoSession(sessionId) {
  try {
    const sudoKey = `sudo:${sessionId}`;
    await redis.del(sudoKey);
    return { success: true };
  } catch (error) {
    console.error('revokeSudoSession error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sudo session durumunu kontrol eder
 * @param {string} sessionId - User session ID
 */
async function getSudoStatus(sessionId) {
  try {
    const sudoKey = `sudo:${sessionId}`;
    const sudoSession = await redis.get(sudoKey);
    
    if (!sudoSession) {
      return {
        active: false,
        expiresIn: 0
      };
    }

    const ttl = await redis.ttl(sudoKey);
    return {
      active: true,
      expiresIn: ttl,
      session: JSON.parse(sudoSession)
    };
  } catch (error) {
    console.error('getSudoStatus error:', error);
    return {
      active: false,
      expiresIn: 0,
      error: error.message
    };
  }
}

module.exports = { 
  requireSudo, 
  createSudoSession, 
  revokeSudoSession, 
  getSudoStatus 
};
