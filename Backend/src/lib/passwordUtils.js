/**
 * Enhanced Password Utilities with Pepper and Reuse Prevention
 * Güvenli şifre hashing ve geçmiş şifre kontrolü
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('./prisma');

/**
 * Pepper ile şifreyi hash'ler
 * @param {string} plainPassword - Düz metin şifre
 * @param {number} saltRounds - Bcrypt salt rounds (varsayılan: 14)
 * @returns {Promise<string>} - Peppered ve bcrypt hash
 */
async function hashPasswordWithPepper(plainPassword, saltRounds = 14) {
  const pepper = process.env.PEPPER;
  
  if (!pepper || pepper.length < 32) {
    throw new Error('PEPPER environment variable must be at least 32 characters');
  }

  // İlk olarak pepper ile HMAC-SHA256
  const pepperedPassword = crypto
    .createHmac('sha256', pepper)
    .update(plainPassword)
    .digest('hex');

  // Sonra bcrypt ile hash
  const hash = await bcrypt.hash(pepperedPassword, saltRounds);
  
  return hash;
}

/**
 * Pepper ile şifreyi doğrular
 * @param {string} plainPassword - Düz metin şifre
 * @param {string} hashedPassword - Hash'lenmiş şifre
 * @returns {Promise<boolean>} - Şifre doğru mu?
 */
async function verifyPasswordWithPepper(plainPassword, hashedPassword) {
  const pepper = process.env.PEPPER;
  
  if (!pepper) {
    throw new Error('PEPPER environment variable is required');
  }

  // Pepper ile HMAC-SHA256
  const pepperedPassword = crypto
    .createHmac('sha256', pepper)
    .update(plainPassword)
    .digest('hex');

  // Bcrypt ile doğrula
  return await bcrypt.compare(pepperedPassword, hashedPassword);
}

/**
 * Kullanıcının şifre geçmişini kontrol eder
 * @param {string} userId - User ID
 * @param {string} newPlainPassword - Yeni şifre (düz metin)
 * @param {number} checkLastN - Son kaç şifreyi kontrol et (varsayılan: 5)
 * @returns {Promise<{isReused: boolean, message: string}>}
 */
async function checkPasswordReuse(userId, newPlainPassword, checkLastN = 5) {
  try {
    // Son N şifreyi getir
    const passwordHistory = await prisma.userPasswordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: checkLastN,
      select: { passwordHash: true, createdAt: true }
    });

    // Her geçmiş şifre ile karşılaştır
    for (const record of passwordHistory) {
      const isReused = await verifyPasswordWithPepper(newPlainPassword, record.passwordHash);
      
      if (isReused) {
        return {
          isReused: true,
          message: `Bu şifre yakın zamanda kullanılmış. Son ${checkLastN} şifrenden farklı bir şifre seçin.`
        };
      }
    }

    return {
      isReused: false,
      message: 'Şifre yeniden kullanım kontrolü başarılı'
    };

  } catch (error) {
    console.error('Password reuse check error:', error);
    // Hata durumunda güvenli taraftan işlem yap
    return {
      isReused: false,
      message: 'Şifre kontrolü sırasında hata oluştu, işlem devam ediyor'
    };
  }
}

/**
 * Yeni şifreyi hash'leyip geçmişe ekler
 * @param {string} userId - User ID
 * @param {string} newPlainPassword - Yeni şifre (düz metin)
 * @param {number} keepLastN - Son kaç şifreyi sakla (varsayılan: 10)
 * @returns {Promise<{hash: string, success: boolean}>}
 */
async function setNewPasswordWithHistory(userId, newPlainPassword, keepLastN = 10) {
  try {
    // Şifre reuse kontrolü
    const reuseCheck = await checkPasswordReuse(userId, newPlainPassword);
    
    if (reuseCheck.isReused) {
      return {
        success: false,
        error: 'password_reused',
        message: reuseCheck.message
      };
    }

    // Yeni şifreyi hash'le
    const newHash = await hashPasswordWithPepper(newPlainPassword);

    // Transaction ile hem user güncellemesi hem history ekleme
    await prisma.$transaction(async (tx) => {
      // User'ın şifresini güncelle
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash }
      });

      // Geçmişe ekle
      await tx.userPasswordHistory.create({
        data: {
          userId,
          passwordHash: newHash
        }
      });

      // Eski kayıtları temizle (sadece son N tanesini tut)
      const toDelete = await tx.userPasswordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: keepLastN,
        select: { id: true }
      });

      if (toDelete.length > 0) {
        await tx.userPasswordHistory.deleteMany({
          where: {
            id: { in: toDelete.map(record => record.id) }
          }
        });
      }
    });

    return {
      success: true,
      hash: newHash,
      message: 'Şifre başarıyla güncellendi'
    };

  } catch (error) {
    console.error('Set new password error:', error);
    return {
      success: false,
      error: 'internal_error',
      message: 'Şifre güncelleme sırasında hata oluştu'
    };
  }
}

/**
 * Kullanıcı kaydı sırasında ilk şifreyi ayarlar
 * @param {string} userId - User ID
 * @param {string} plainPassword - Şifre (düz metin)
 * @returns {Promise<string>} - Hash'lenmiş şifre
 */
async function setInitialPassword(userId, plainPassword) {
  const hash = await hashPasswordWithPepper(plainPassword);
  
  // İlk şifreyi geçmişe de ekle
  await prisma.userPasswordHistory.create({
    data: {
      userId,
      passwordHash: hash
    }
  });

  return hash;
}

/**
 * Şifre güçlülük kontrolü
 * @param {string} password - Kontrol edilecek şifre
 * @returns {Object} - {isValid: boolean, errors: string[]}
 */
function validatePasswordStrength(password) {
  const errors = [];
  
  // Minimum uzunluk kontrolü (10 karakter)
  if (!password || password.length < 10) {
    errors.push('Şifre en az 10 karakter olmalıdır');
  }
  
  // Büyük harf kontrolü
  if (!/[A-Z]/.test(password)) {
    errors.push('Şifre en az 1 büyük harf içermelidir');
  }
  
  // Küçük harf kontrolü
  if (!/[a-z]/.test(password)) {
    errors.push('Şifre en az 1 küçük harf içermelidir');
  }
  
  // Rakam kontrolü
  if (!/[0-9]/.test(password)) {
    errors.push('Şifre en az 1 rakam içermelidir');
  }
  
  // Noktalama işareti kontrolü
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Şifre en az 1 noktalama işareti içermelidir (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Pepper güvenliğini test eder
 * @returns {boolean} - Pepper güvenli mi?
 */
function validatePepper() {
  const pepper = process.env.PEPPER;
  
  if (!pepper) {
    console.error('❌ PEPPER environment variable is missing');
    return false;
  }

  if (pepper.length < 32) {
    console.error('❌ PEPPER must be at least 32 characters long');
    return false;
  }

  // Entropi kontrolü (basit)
  const uniqueChars = new Set(pepper).size;
  if (uniqueChars < 16) {
    console.warn('⚠️  PEPPER has low entropy, consider using more diverse characters');
  }

  console.log('✅ PEPPER validation passed');
  return true;
}

module.exports = {
  hashPasswordWithPepper,
  verifyPasswordWithPepper,
  checkPasswordReuse,
  setNewPasswordWithHistory,
  setInitialPassword,
  validatePasswordStrength,
  validatePepper
};
