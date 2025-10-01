const { Router } = require('express');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma.js');
const { authRequired } = require('../middlewares/auth.js');
const { signAccess, signRefresh, verifyTmp } = require('../lib/jwt.js');
const { z } = require('zod');

const r = Router();

// 0) 2FA Durum Kontrolü
r.get('/2fa/status', authRequired, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: { twoFAEnabled: true, totpSecret: true }
    });
    res.json({ 
      enabled: user?.twoFAEnabled || false,
      hasSecret: !!user?.totpSecret
    });
  } catch (e) { next(e); }
});

// 1) Kurulum: secret üret + QR döndür (henüz DB'ye yazma)
r.post('/2fa/setup', authRequired, async (req, res, next) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'IncomeExpense', secret);
    const qr = await QRCode.toDataURL(otpauth);
    res.json({ secret, otpauth, qr });
  } catch (e) { next(e); }
});

// 2) Etkinleştir: kullanıcı uygulamadaki 6 haneli kodu girer
r.post('/2fa/enable', authRequired, async (req, res, next) => {
  try {
    const EnableSchema = z.object({
      secret: z.string().min(10),
      code: z.string().regex(/^\d{6}$/),
    });
    const parsed = EnableSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
    const { secret, code } = parsed.data;
    const valid = authenticator.verify({ token: code, secret });
    if (!valid) return res.status(400).json({ error: 'invalid_code' });

    // 10 adet yedek kod oluştur
    const rawCodes = Array.from({ length: 10 }, () => Math.random().toString(36).slice(-10));
    const hashes = await Promise.all(rawCodes.map(c => bcrypt.hash(c, 12)));

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { twoFAEnabled: true, totpSecret: secret } }),
      prisma.twoFABackup.deleteMany({ where: { userId: req.user.id } }),
      prisma.twoFABackup.createMany({ data: hashes.map(codeHash => ({ userId: req.user.id, codeHash })) })
    ]);

    res.json({ ok: true, backupCodes: rawCodes }); // FE bu listeyi bir defa gösterir
  } catch (e) { next(e); }
});

// 3) Devre dışı bırak (kod zorunlu)
r.post('/2fa/disable', authRequired, async (req, res, next) => {
  try {
    const DisableSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
    const parsed = DisableSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
    const { code } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.twoFAEnabled || !user.totpSecret) return res.status(400).json({ error: 'not_enabled' });

    const ok = authenticator.verify({ token: code, secret: user.totpSecret });
    if (!ok) return res.status(400).json({ error: 'invalid_code' });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { twoFAEnabled: false, totpSecret: null } }),
      prisma.twoFABackup.deleteMany({ where: { userId: req.user.id } })
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// 4) MFA doğrulama (login sonrası adım): tmpToken + TOTP code -> access/refresh
r.post('/mfa/verify', async (req, res, next) => {
  try {
    const MfaVerifySchema = z.object({ tmpToken: z.string().min(10), code: z.string().regex(/^\d{6}$/) });
    const parsed = MfaVerifySchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
    const { tmpToken, code } = parsed.data;
    const dec = verifyTmp(tmpToken);
    const user = await prisma.user.findUnique({ where: { id: dec.sub } });
    if (!user?.twoFAEnabled || !user.totpSecret) return res.status(400).json({ error: 'not_enabled' });

    const ok = authenticator.verify({ token: code, secret: user.totpSecret });
    if (!ok) return res.status(401).json({ error: 'invalid_code' });

    const accessToken = signAccess({ 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      mfaVerified: true // 2FA başarıyla geçildi
    });
    const jti = uuidv4();
    const refreshToken = signRefresh({ sub: user.id, jti, remember: true });
    const exp = new Date(Date.now() + 7*24*60*60*1000);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, jti, expiresAt: exp } });
    // refresh cookie ayarlama (login'deki setRefreshCookie ile)
    res.cookie('rt', refreshToken, {
      httpOnly: true, secure: String(process.env.COOKIE_SECURE) === 'true',
      sameSite: 'lax', domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/api/auth/refresh', maxAge: 7*24*60*60*1000
    });
    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    return res.status(401).json({ error: 'invalid_tmp' });
  }
});

// 5) MFA yedek kod ile doğrulama (kullanımda tek seferlik)
r.post('/mfa/verify-backup', async (req, res, next) => {
  try {
    const MfaBackupSchema = z.object({ tmpToken: z.string().min(10), backupCode: z.string().min(6) });
    const parsed = MfaBackupSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
    const { tmpToken, backupCode } = parsed.data;
    const dec = verifyTmp(tmpToken);
    const user = await prisma.user.findUnique({ where: { id: dec.sub } });
    if (!user) return res.status(404).json({ error: 'not_found' });

    const codes = await prisma.twoFABackup.findMany({ where: { userId: user.id, usedAt: null } });
    const hit = await (async () => {
      for (const c of codes) if (await bcrypt.compare(backupCode, c.codeHash)) return c;
      return null;
    })();
    if (!hit) return res.status(401).json({ error: 'invalid_backup' });

    await prisma.twoFABackup.update({ where: { id: hit.id }, data: { usedAt: new Date() } });

    const accessToken = signAccess({ 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      mfaVerified: true // 2FA backup code ile geçildi
    });
    const jti = uuidv4();
    const refreshToken = signRefresh({ sub: user.id, jti, remember: true });
    const exp = new Date(Date.now() + 7*24*60*60*1000);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, jti, expiresAt: exp } });
    res.cookie('rt', refreshToken, {
      httpOnly: true, secure: String(process.env.COOKIE_SECURE) === 'true',
      sameSite: 'lax', domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/api/auth/refresh', maxAge: 7*24*60*60*1000
    });
    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) { next(e); }
});

module.exports = r;
