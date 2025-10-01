/**
 * Anomaly Detection for Refresh Token Usage
 * Refresh token replay ve şüpheli kullanım tespiti
 */

const { redis } = require('./redis');
const { logSecurityEvent, SECURITY_LEVELS, EVENT_TYPES } = require('../middlewares/securityLogger');

/**
 * User-Agent ve IP fingerprint oluşturur
 * @param {Object} req - Request object
 * @returns {Object} - Fingerprint bilgileri
 */
function createFingerprint(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.socket.remoteAddress || 
             'unknown';
  
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // User-Agent'ten önemli bilgileri çıkar
  const uaParts = {
    browser: extractBrowser(userAgent),
    os: extractOS(userAgent),
    device: extractDevice(userAgent)
  };
  
  return {
    ip,
    userAgent,
    uaParts,
    fingerprint: generateFingerprint(ip, userAgent)
  };
}

/**
 * Browser bilgisini çıkarır
 * @param {string} userAgent 
 * @returns {string}
 */
function extractBrowser(userAgent) {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

/**
 * OS bilgisini çıkarır
 * @param {string} userAgent 
 * @returns {string}
 */
function extractOS(userAgent) {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'MacOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

/**
 * Device tipini çıkarır
 * @param {string} userAgent 
 * @returns {string}
 */
function extractDevice(userAgent) {
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  return 'Desktop';
}

/**
 * Fingerprint hash'i oluşturur
 * @param {string} ip 
 * @param {string} userAgent 
 * @returns {string}
 */
function generateFingerprint(ip, userAgent) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').substring(0, 16);
}

/**
 * Refresh token kullanımını analiz eder ve anomali tespit eder
 * @param {string} userId - User ID
 * @param {string} sessionId - Session/Token ID
 * @param {Object} req - Request object
 * @returns {Promise<Object>} - Anomali analiz sonucu
 */
async function analyzeRefreshTokenUsage(userId, sessionId, req) {
  try {
    const currentFingerprint = createFingerprint(req);
    const sessionKey = `session:${sessionId}`;
    const userSessionsKey = `user_sessions:${userId}`;
    
    // Mevcut session bilgisini al
    const existingSession = await redis.get(sessionKey);
    let sessionData = existingSession ? JSON.parse(existingSession) : null;
    
    const now = Date.now();
    const analysis = {
      isAnomalous: false,
      riskLevel: 'LOW',
      reasons: [],
      fingerprint: currentFingerprint,
      sessionData
    };

    // İlk kullanım ise session'ı kaydet
    if (!sessionData) {
      sessionData = {
        userId,
        sessionId,
        createdAt: now,
        lastUsedAt: now,
        fingerprint: currentFingerprint,
        usageCount: 1,
        ipHistory: [currentFingerprint.ip],
        userAgentHistory: [currentFingerprint.userAgent]
      };
      
      await redis.setex(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(sessionData)); // 7 gün
      await redis.sadd(userSessionsKey, sessionId);
      await redis.expire(userSessionsKey, 7 * 24 * 60 * 60);
      
      return analysis;
    }

    // Anomali kontrolleri
    
    // 1. IP değişikliği kontrolü
    if (sessionData.fingerprint.ip !== currentFingerprint.ip) {
      analysis.reasons.push('IP_CHANGE');
      analysis.riskLevel = 'MEDIUM';
      
      // Farklı ülke/coğrafya kontrolü (basit)
      if (isSignificantIPChange(sessionData.fingerprint.ip, currentFingerprint.ip)) {
        analysis.isAnomalous = true;
        analysis.riskLevel = 'HIGH';
        analysis.reasons.push('GEOGRAPHIC_IP_CHANGE');
      }
    }

    // 2. User-Agent değişikliği kontrolü
    if (sessionData.fingerprint.userAgent !== currentFingerprint.userAgent) {
      analysis.reasons.push('USER_AGENT_CHANGE');
      
      // Tamamen farklı browser/OS ise şüpheli
      if (sessionData.fingerprint.uaParts.browser !== currentFingerprint.uaParts.browser ||
          sessionData.fingerprint.uaParts.os !== currentFingerprint.uaParts.os) {
        analysis.isAnomalous = true;
        analysis.riskLevel = 'HIGH';
        analysis.reasons.push('MAJOR_USER_AGENT_CHANGE');
      }
    }

    // 3. Eş zamanlı kullanım kontrolü
    const timeSinceLastUse = now - sessionData.lastUsedAt;
    if (timeSinceLastUse < 5000) { // 5 saniye içinde
      analysis.isAnomalous = true;
      analysis.riskLevel = 'CRITICAL';
      analysis.reasons.push('CONCURRENT_USAGE');
    }

    // 4. Kullanım sıklığı anomalisi
    sessionData.usageCount = (sessionData.usageCount || 0) + 1;
    const sessionAge = now - sessionData.createdAt;
    const usageRate = sessionData.usageCount / (sessionAge / (60 * 1000)); // usage per minute
    
    if (usageRate > 10) { // Dakikada 10'dan fazla refresh
      analysis.isAnomalous = true;
      analysis.riskLevel = 'HIGH';
      analysis.reasons.push('HIGH_USAGE_RATE');
    }

    // 5. Kullanıcının toplam aktif session sayısı
    const userSessions = await redis.smembers(userSessionsKey);
    if (userSessions.length > 10) {
      analysis.riskLevel = 'MEDIUM';
      analysis.reasons.push('TOO_MANY_SESSIONS');
    }

    // Session'ı güncelle
    sessionData.lastUsedAt = now;
    sessionData.fingerprint = currentFingerprint;
    
    // IP ve UA geçmişini güncelle (son 5)
    if (!sessionData.ipHistory.includes(currentFingerprint.ip)) {
      sessionData.ipHistory.push(currentFingerprint.ip);
      if (sessionData.ipHistory.length > 5) {
        sessionData.ipHistory = sessionData.ipHistory.slice(-5);
      }
    }
    
    if (!sessionData.userAgentHistory.includes(currentFingerprint.userAgent)) {
      sessionData.userAgentHistory.push(currentFingerprint.userAgent);
      if (sessionData.userAgentHistory.length > 5) {
        sessionData.userAgentHistory = sessionData.userAgentHistory.slice(-5);
      }
    }

    await redis.setex(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(sessionData));

    return analysis;

  } catch (error) {
    console.error('Anomaly detection error:', error);
    return {
      isAnomalous: false,
      riskLevel: 'LOW',
      reasons: ['ANALYSIS_ERROR'],
      error: error.message
    };
  }
}

/**
 * IP değişikliğinin önemli olup olmadığını kontrol eder
 * @param {string} oldIP 
 * @param {string} newIP 
 * @returns {boolean}
 */
function isSignificantIPChange(oldIP, newIP) {
  // Basit kontrol - farklı subnet'ler
  const oldSubnet = oldIP.split('.').slice(0, 2).join('.');
  const newSubnet = newIP.split('.').slice(0, 2).join('.');
  
  return oldSubnet !== newSubnet;
}

/**
 * Anomali tespit edildiğinde security log'a yazar
 * @param {string} userId 
 * @param {Object} analysis 
 * @param {Object} req 
 */
async function logAnomalousActivity(userId, analysis, req) {
  if (!analysis.isAnomalous) return;

  const severity = analysis.riskLevel === 'CRITICAL' ? SECURITY_LEVELS.CRITICAL :
                  analysis.riskLevel === 'HIGH' ? SECURITY_LEVELS.HIGH :
                  SECURITY_LEVELS.MEDIUM;

  await logSecurityEvent({
    eventType: EVENT_TYPES.ANOMALY_DETECTED,
    level: severity,
    userId,
    ip: analysis.fingerprint.ip,
    userAgent: analysis.fingerprint.userAgent,
    description: `Refresh token anomalisi tespit edildi: ${analysis.reasons.join(', ')}`,
    details: {
      riskLevel: analysis.riskLevel,
      reasons: analysis.reasons,
      fingerprint: analysis.fingerprint,
      sessionUsageCount: analysis.sessionData?.usageCount || 0
    }
  });
}

/**
 * Şüpheli session'ları temizler
 * @param {string} userId 
 */
async function cleanupSuspiciousSessions(userId) {
  try {
    const userSessionsKey = `user_sessions:${userId}`;
    const sessionIds = await redis.smembers(userSessionsKey);
    
    for (const sessionId of sessionIds) {
      const sessionKey = `session:${sessionId}`;
      const sessionData = await redis.get(sessionKey);
      
      if (sessionData) {
        const data = JSON.parse(sessionData);
        const sessionAge = Date.now() - data.createdAt;
        
        // 7 günden eski veya çok fazla kullanılmış session'ları temizle
        if (sessionAge > 7 * 24 * 60 * 60 * 1000 || data.usageCount > 1000) {
          await redis.del(sessionKey);
          await redis.srem(userSessionsKey, sessionId);
        }
      }
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}

module.exports = {
  analyzeRefreshTokenUsage,
  logAnomalousActivity,
  cleanupSuspiciousSessions,
  createFingerprint
};
