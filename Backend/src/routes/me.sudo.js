/**
 * Sudo-mode routes
 * Kritik admin işlemleri için ek doğrulama
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middlewares/auth');
const { requireAdminOnly } = require('../middlewares/requireAdminMFA');
const { createSudoSession, revokeSudoSession, getSudoStatus } = require('../middlewares/requireSudo');

const router = express.Router();

// TOTP tolerance: allow ±1 step (±30s)
try { authenticator.options = { window: 1 }; } catch {}

/**
 * @openapi
 * /me/sudo/status:
 *   get:
 *     summary: Sudo session durumunu kontrol et
 *     tags: [Sudo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sudo session durumu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active:
 *                   type: boolean
 *                 expiresIn:
 *                   type: number
 *                 expiresAt:
 *                   type: string
 */
router.get('/sudo/status', authRequired, requireAdminOnly, async (req, res, next) => {
  try {
    const sessionId = req.user.id;
    const status = await getSudoStatus(sessionId);
    
    res.json({
      active: status.active,
      expiresIn: status.expiresIn,
      expiresAt: status.session?.expiresAt || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /me/sudo:
 *   post:
 *     summary: Sudo session başlat
 *     tags: [Sudo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method]
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [password, totp]
 *               password:
 *                 type: string
 *                 description: Required if method is password
 *               totp:
 *                 type: string
 *                 description: Required if method is totp
 *               duration:
 *                 type: number
 *                 description: Sudo session duration in seconds (default 300)
 */
router.post('/sudo', authRequired, requireAdminOnly, async (req, res, next) => {
  try {
    const schema = z.object({
      method: z.enum(['password', 'totp']),
      password: z.string().optional(),
      totp: z.string().length(6).optional(),
      duration: z.number().min(60).max(3600).optional().default(300)
    });

    const { method, password, totp, duration } = schema.parse(req.body);

    // User bilgilerini al
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true,
        email: true,
        passwordHash: true,
        twoFAEnabled: true,
        totpSecret: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'user_not_found',
        message: 'Kullanıcı bulunamadı'
      });
    }

    let authSuccess = false;

    if (method === 'password') {
      if (!password) {
        return res.status(400).json({ 
          error: 'password_required',
          message: 'Parola gereklidir'
        });
      }

      if (!user.passwordHash) {
        return res.status(400).json({ 
          error: 'no_password_set',
          message: 'Kullanıcı parolası ayarlanmamış'
        });
      }

      authSuccess = await bcrypt.compare(password, user.passwordHash);
      
      if (!authSuccess) {
        return res.status(401).json({ 
          error: 'invalid_password',
          message: 'Geçersiz parola'
        });
      }
    }

    if (method === 'totp') {
      if (!totp) {
        return res.status(400).json({ 
          error: 'totp_required',
          message: 'TOTP kodu gereklidir'
        });
      }

      if (!user.twoFAEnabled || !user.totpSecret) {
        return res.status(400).json({ 
          error: 'totp_not_enabled',
          message: '2FA etkinleştirilmemiş'
        });
      }

      authSuccess = authenticator.verify({
        token: totp,
        secret: user.totpSecret
      });

      if (!authSuccess) {
        return res.status(401).json({ 
          error: 'invalid_totp',
          message: 'Geçersiz TOTP kodu'
        });
      }
    }

    if (!authSuccess) {
      return res.status(401).json({ 
        error: 'authentication_failed',
        message: 'Sudo doğrulaması başarısız'
      });
    }

    // Sudo session oluştur
    const sessionId = user.id;
    const result = await createSudoSession(sessionId, duration);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'sudo_session_failed',
        message: 'Sudo oturumu oluşturulamadı'
      });
    }

    // Security log
    // TODO: Security logging middleware ile

    res.json({
      success: true,
      message: 'Sudo oturumu başarıyla oluşturuldu',
      expiresIn: result.expiresIn,
      expiresAt: result.expiresAt
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
 * /me/sudo:
 *   delete:
 *     summary: Sudo session sonlandır
 *     tags: [Sudo]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/sudo', authRequired, requireAdminOnly, async (req, res, next) => {
  try {
    const sessionId = req.user.id;
    const result = await revokeSudoSession(sessionId);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'sudo_revoke_failed',
        message: 'Sudo oturumu sonlandırılamadı'
      });
    }

    res.json({
      success: true,
      message: 'Sudo oturumu sonlandırıldı'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
