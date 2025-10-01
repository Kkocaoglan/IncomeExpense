const express = require('express');
const { authRequired } = require('../../middlewares/auth.js');
const { requireAdmin } = require('../../middlewares/rbac.js');
const { requireAdminMFA } = require('../../middlewares/requireAdminMFA.js');
const { requireSudo } = require('../../middlewares/requireSudo.js');
const { autoSecurityLog } = require('../../middlewares/securityLogger.js');
const { z } = require('zod');
const prisma = require('../../lib/prisma.js');

const router = express.Router();

// Validation schemas
const RoleUpdateSchema = z.object({
  role: z.enum(['USER', 'ADMIN'], {
    errorMap: () => ({ message: 'Role must be either USER or ADMIN' })
  })
});

const SessionRevokeSchema = z.object({
  reason: z.string().optional() // Opsiyonel sebep
});

// Tüm kullanıcıları listele (sayfalama ve filtreleme ile)
router.get('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Filtreleme koşulları
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) {
      where.role = role;
    }
    
    // Kullanıcıları getir
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true,
          twoFAEnabled: true,
          _count: {
            select: {
              transactions: true,
              refreshTokens: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);
    
    // Online durumu kontrol et (son 5 dakika içinde refresh token'ı olan)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = await prisma.refreshToken.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      select: { userId: true }
    });
    
    const onlineUserIds = new Set(onlineUsers.map(u => u.userId));
    
    // Kullanıcı verilerini zenginleştir
    const enrichedUsers = users.map(user => ({
      ...user,
      isOnline: onlineUserIds.has(user.id),
      transactionCount: user._count.transactions,
      activeSessions: user._count.refreshTokens
    }));
    
    const pages = Math.ceil(total / parseInt(limit));
    
    res.json({
      users: enrichedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    next(error);
  }
});

// Kullanıcı rolünü güncelle (Kritik işlem - Sudo gerekli)
router.patch('/:id/role', authRequired, requireAdminMFA, requireSudo, autoSecurityLog, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = RoleUpdateSchema.parse(req.body);
    
    // Kendi rolünü değiştirmeye çalışıyorsa engelle
    if (id === req.user.id) {
      return res.status(400).json({ error: 'cannot_change_own_role' });
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true }
    });
    
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Kullanıcının tüm oturumlarını sonlandır (Kritik işlem - Sudo gerekli)
router.post('/:id/revoke-sessions', authRequired, requireAdminMFA, requireSudo, autoSecurityLog, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = SessionRevokeSchema.parse(req.body);
    
    await prisma.refreshToken.updateMany({
      where: { 
        userId: id,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      data: { revokedAt: new Date() }
    });
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Kullanıcı detaylarını getir
router.get('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        transactions: {
          select: {
            id: true,
            amount: true,
            type: true,
            category: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        refreshTokens: {
          where: {
            revokedAt: null,
            expiresAt: { gt: new Date() }
          },
          select: {
            id: true,
            userAgent: true,
            ip: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            transactions: true,
            refreshTokens: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
