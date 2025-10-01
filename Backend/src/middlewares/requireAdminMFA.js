/**
 * Admin panel hardening - 2FA zorunlu middleware
 * Admin kullanıcıları için MFA doğrulaması gerektirir
 */

const prisma = require('../lib/prisma');

async function requireAdminMFA(req, res, next) {
  try {
    // Önce admin kontrolü
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    // Admin user'ın detaylarını database'den al
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true,
        email: true,
        role: true,
        twoFAEnabled: true,
        totpSecret: true
      }
    });

    if (!adminUser) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'Admin kullanıcısı bulunamadı'
      });
    }

    // 2FA enabled kontrolü
    if (!adminUser.twoFAEnabled || !adminUser.totpSecret) {
      return res.status(403).json({ 
        error: 'mfa_required',
        message: 'Admin hesabı için 2FA zorunludur. Lütfen 2FA\'yı etkinleştirin.',
        action: 'setup_2fa'
      });
    }

    // Session'da MFA verification kontrolü
    // Bu JWT payload'ında mfaVerified field'ı ile kontrol edilebilir
    // Veya Redis'te session-based MFA verification
    if (!req.user.mfaVerified) {
      return res.status(403).json({ 
        error: 'mfa_verification_required',
        message: 'Admin işlemi için MFA doğrulaması gereklidir',
        action: 'verify_mfa'
      });
    }

    // Tüm kontroller başarılı
    req.adminUser = adminUser;
    next();

  } catch (error) {
    console.error('requireAdminMFA middleware error:', error);
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'MFA kontrolü sırasında hata oluştu'
    });
  }
}

/**
 * Sadece admin kontrolü yapar, MFA kontrolü yapmaz
 * 2FA setup işlemleri için kullanılır
 */
function requireAdminOnly(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'forbidden',
      message: 'Bu işlem için admin yetkisi gereklidir'
    });
  }
  next();
}

module.exports = { 
  requireAdminMFA, 
  requireAdminOnly 
};
