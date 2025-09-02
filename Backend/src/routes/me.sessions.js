const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middlewares/auth');

const r = express.Router();

r.get('/me/sessions', authRequired, async (req, res, next) => {
  try {
    const rows = await prisma.refreshToken.findMany({
      where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, jti: true, userAgent: true, ip: true, createdAt: true, expiresAt: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
});

r.delete('/me/sessions/:id', authRequired, async (req, res, next) => {
  try {
    await prisma.refreshToken.updateMany({
      where: { id: req.params.id, userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    res.status(204).end();
  } catch (e) { next(e); }
});

r.post('/me/sessions/revoke-all', authRequired, async (req, res, next) => {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    res.status(204).end();
  } catch (e) { next(e); }
});

r.get('/me/sessions/current', authRequired, async (req, res, next) => {
  try {
    // refresh cookie'yi okuyamasak da, istersen access token oluştururken "sid" claim'i ekleyebilirsin.
    // alternatif: son oluşturulan (revoked değil, yakın zamanda yaratılmış) oturumu current say.
    const row = await prisma.refreshToken.findFirst({
      where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });
    res.json(row || {});
  } catch(e){ next(e); }
});

module.exports = r;
