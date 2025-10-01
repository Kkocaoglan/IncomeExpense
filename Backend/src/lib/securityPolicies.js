/**
 * Güvenlik Politikaları
 * Production-grade güvenlik kuralları ve kontrolleri
 */

const prisma = require('./prisma');
const { redis } = require('./redis');

/**
 * Admin güvenlik politikaları
 */
const ADMIN_SECURITY_POLICIES = {
  // 2FA zorunluluğu (test için kapatıldı)
  REQUIRE_2FA: false,
  // Sudo mode timeout (dakika)
  SUDO_MODE_TIMEOUT: 15,
  // Session timeout (saat)
  MAX_SESSION_DURATION: 8,
  // Concurrent session limiti
  MAX_CONCURRENT_SESSIONS: 3,
  // IP değişiklik kontrolü
  STRICT_IP_VALIDATION: true,
  // Bruteforce koruması
  ADMIN_LOGIN_ATTEMPTS: 3,
  ADMIN_LOCKOUT_DURATION: 30 // dakika
};

/**
 * User güvenlik politikaları
 */
const USER_SECURITY_POLICIES = {
  // 2FA zorunluluğu (kademeli olarak açılacak)
  REQUIRE_2FA_FOR_NEW_USERS: true,
  REQUIRE_2FA_FOR_EXISTING_USERS: false, // Geçiş dönemi
  // Password politikaları
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_PASSWORD_COMPLEXITY: true,
  PASSWORD_HISTORY_COUNT: 5,
  // Session güvenliği
  MAX_SESSION_DURATION: 24, // saat
  IDLE_TIMEOUT: 2 // saat
};

/**
 * Admin için 2FA zorunluluğu kontrolü
 */
async function enforceAdmin2FA(req, res, next) {
  console.log('🔍 enforceAdmin2FA middleware CALLED for:', req.originalUrl);
  try {
    if (!ADMIN_SECURITY_POLICIES.REQUIRE_2FA) {
      console.log('⏭️ 2FA requirement disabled, skipping');
      return next();
    }

    const user = req.user;
    console.log('👤 User in middleware:', user ? { id: user.id, role: user.role, mfaVerified: user.mfaVerified } : 'NO USER');
    if (!user || user.role !== 'ADMIN') {
      console.log('⏭️ Not admin user, skipping');
      return next();
    }

    // Admin için 2FA kontrolü
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFAEnabled: true, role: true }
    });

    // 2FA kurulu değilse setup'a yönlendir
    console.log('📊 Admin 2FA Status:', { twoFAEnabled: adminUser.twoFAEnabled });
    if (!adminUser.twoFAEnabled) {
      console.log('❌ 2FA not enabled, returning 403');
      return res.status(403).json({
        error: 'admin_2fa_required',
        message: 'Admin hesapları için 2FA zorunludur',
        requiresSetup: true,
        redirectTo: '/admin/security/2fa-setup'
      });
    }

    // 2FA kurulu ama MFA verification geçilmemişse
    if (!user.mfaVerified) {
      return res.status(403).json({
        error: 'mfa_verification_required',
        message: 'Bu admin işlemi için MFA doğrulaması gereklidir',
        requiresVerification: true,
        redirectTo: '/admin/mfa-verify'
      });
    }

    next();
  } catch (error) {
    console.error('Admin 2FA kontrolü hatası:', error);
    res.status(500).json({ error: 'security_check_failed' });
  }
}

/**
 * User için kademeli 2FA kontrolü
 */
async function enforceUser2FA(req, res, next) {
  try {
    const user = req.user;
    if (!user || user.role === 'ADMIN') {
      return next();
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { 
        twoFAEnabled: true, 
        createdAt: true,
        emailVerifiedAt: true 
      }
    });

    // Yeni kullanıcılar için zorunlu
    const isNewUser = new Date() - new Date(userRecord.createdAt) < 30 * 24 * 60 * 60 * 1000; // 30 gün
    
    if (USER_SECURITY_POLICIES.REQUIRE_2FA_FOR_NEW_USERS && isNewUser) {
      if (!userRecord.twoFAEnabled) {
        return res.status(403).json({
          error: 'user_2fa_required',
          message: 'Hesap güvenliği için 2FA aktifleştirmeniz gerekiyor',
          requiresSetup: true,
          redirectTo: '/security/2fa-setup',
          reason: 'new_user_policy'
        });
      }
    }

    // Mevcut kullanıcılar için opsiyonel (şimdilik)
    if (USER_SECURITY_POLICIES.REQUIRE_2FA_FOR_EXISTING_USERS && !isNewUser) {
      if (!userRecord.twoFAEnabled) {
        // Soft enforcement - warning ver ama engellembe
        res.setHeader('X-Security-Warning', '2FA-recommended');
      }
    }

    next();
  } catch (error) {
    console.error('User 2FA kontrolü hatası:', error);
    next(); // User için hata durumunda devam et
  }
}

/**
 * Session güvenlik kontrolü
 */
async function enforceSessionSecurity(req, res, next) {
  try {
    const user = req.user;
    if (!user) return next();

    const sessionKey = `session:${user.id}`;
    const sessionData = await redis.get(sessionKey);
    
    if (sessionData) {
      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      // Session timeout kontrolü
      const maxDuration = user.role === 'ADMIN' 
        ? ADMIN_SECURITY_POLICIES.MAX_SESSION_DURATION * 60 * 60 * 1000
        : USER_SECURITY_POLICIES.MAX_SESSION_DURATION * 60 * 60 * 1000;
      
      if (now - session.startTime > maxDuration) {
        await redis.del(sessionKey);
        return res.status(401).json({
          error: 'session_expired',
          message: 'Oturum süresi doldu, lütfen tekrar giriş yapın'
        });
      }
      
      // IP değişiklik kontrolü (Admin için strict)
      if (user.role === 'ADMIN' && ADMIN_SECURITY_POLICIES.STRICT_IP_VALIDATION) {
        const currentIP = req.ip || req.connection.remoteAddress;
        if (session.ip && session.ip !== currentIP) {
          console.warn('🚨 Admin IP değişikliği tespit edildi:', {
            userId: user.id,
            oldIP: session.ip,
            newIP: currentIP,
            userAgent: req.headers['user-agent']
          });
          
          // Şüpheli aktivite logu
          await prisma.securityLog.create({
            data: {
              userId: user.id,
              level: 'HIGH',
              type: 'IP_CHANGE_DETECTED',
              event: 'admin_session_ip_change',
              details: {
                oldIP: session.ip,
                newIP: currentIP,
                userAgent: req.headers['user-agent']
              }
            }
          });
          
          return res.status(401).json({
            error: 'suspicious_activity',
            message: 'Güvenlik nedeniyle oturum sonlandırıldı',
            requiresReauth: true
          });
        }
      }
      
      // Session güncelle
      session.lastActivity = now;
      await redis.setex(sessionKey, 24 * 60 * 60, JSON.stringify(session)); // 24 saat TTL
    }

    next();
  } catch (error) {
    console.error('Session güvenlik kontrolü hatası:', error);
    next(); // Hata durumunda devam et ama logla
  }
}

/**
 * Güvenlik politikalarını başlat
 */
async function initializeSecurityPolicies() {
  console.log('🛡️ Güvenlik politikaları başlatılıyor...');
  
  // Admin 2FA zorunluluğunu kontrol et
  if (ADMIN_SECURITY_POLICIES.REQUIRE_2FA) {
    const adminsWithout2FA = await prisma.user.count({
      where: {
        role: 'ADMIN',
        twoFAEnabled: false
      }
    });
    
    if (adminsWithout2FA > 0) {
      console.warn(`⚠️ ${adminsWithout2FA} admin hesabında 2FA aktif değil!`);
    }
  }
  
  console.log('✅ Güvenlik politikaları yüklendi');
  console.log('📋 Admin politikaları:', ADMIN_SECURITY_POLICIES);
  console.log('📋 User politikaları:', USER_SECURITY_POLICIES);
}

/**
 * Güvenlik politikası durumunu getir
 */
function getSecurityPolicyStatus() {
  return {
    admin: ADMIN_SECURITY_POLICIES,
    user: USER_SECURITY_POLICIES,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  ADMIN_SECURITY_POLICIES,
  USER_SECURITY_POLICIES,
  enforceAdmin2FA,
  enforceUser2FA,
  enforceSessionSecurity,
  initializeSecurityPolicies,
  getSecurityPolicyStatus
};
