/**
 * Password Management Routes
 * Şifre değiştirme ve güvenlik işlemleri
 */

const express = require('express');
const { z } = require('zod');
const { authRequired } = require('../middlewares/auth');
const { setNewPasswordWithHistory, verifyPasswordWithPepper } = require('../lib/passwordUtils');
const { logSecurityEvent, SECURITY_LEVELS, EVENT_TYPES } = require('../middlewares/securityLogger');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * @openapi
 * /me/password:
 *   patch:
 *     summary: Şifre değiştir
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Mevcut şifre
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Yeni şifre (güçlü şifre gereksinimleri)
 *     responses:
 *       200:
 *         description: Şifre başarıyla değiştirildi
 *       400:
 *         description: Validation hatası veya şifre reuse
 *       401:
 *         description: Mevcut şifre yanlış
 */
router.patch('/password', authRequired, async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, 'Mevcut şifre gereklidir'),
      newPassword: z.string()
        .min(8, 'Yeni şifre en az 8 karakter olmalıdır')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
          'Yeni şifre en az bir küçük harf, büyük harf, rakam ve özel karakter içermelidir')
    });

    const { currentPassword, newPassword } = schema.parse(req.body);

    // Kullanıcı bilgilerini al
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true,
        email: true,
        passwordHash: true
      }
    });

    if (!user || !user.passwordHash) {
      return res.status(404).json({ 
        error: 'user_not_found',
        message: 'Kullanıcı bulunamadı veya şifre ayarlanmamış'
      });
    }

    // Mevcut şifreyi doğrula
    const isCurrentPasswordValid = await verifyPasswordWithPepper(currentPassword, user.passwordHash);
    
    if (!isCurrentPasswordValid) {
      // Security log - başarısız şifre değiştirme denemesi
      await logSecurityEvent({
        eventType: EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        level: SECURITY_LEVELS.MEDIUM,
        userId: req.user.id,
        ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        description: 'Başarısız şifre değiştirme denemesi - yanlış mevcut şifre',
        details: { action: 'password_change_failed' }
      });

      return res.status(401).json({ 
        error: 'invalid_current_password',
        message: 'Mevcut şifre yanlış'
      });
    }

    // Yeni şifreyi ayarla (reuse check dahil)
    const result = await setNewPasswordWithHistory(user.id, newPassword);

    if (!result.success) {
      if (result.error === 'password_reused') {
        return res.status(400).json({ 
          error: 'password_reused',
          message: result.message
        });
      }

      return res.status(500).json({ 
        error: 'password_update_failed',
        message: result.message || 'Şifre güncelleme başarısız'
      });
    }

    // Success security log
    await logSecurityEvent({
      eventType: 'PASSWORD_CHANGED',
      level: SECURITY_LEVELS.MEDIUM,
      userId: req.user.id,
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      description: 'Kullanıcı şifresini değiştirdi',
      details: { action: 'password_change_success' }
    });

    res.json({
      success: true,
      message: 'Şifre başarıyla güncellendi'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'validation_error',
        details: error.errors
      });
    }
    next(error);
  }
});

/**
 * @openapi
 * /me/password/history:
 *   get:
 *     summary: Şifre değiştirme geçmişi
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Şifre geçmişi (hash'ler olmadan)
 */
router.get('/password/history', authRequired, async (req, res, next) => {
  try {
    const history = await prisma.userPasswordHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { 
        id: true,
        createdAt: true
        // passwordHash'i security için dahil etme
      }
    });

    res.json({
      history: history.map(record => ({
        id: record.id,
        changedAt: record.createdAt
      })),
      totalChanges: history.length
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
