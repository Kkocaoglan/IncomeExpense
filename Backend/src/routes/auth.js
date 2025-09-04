const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { signAccess, signRefresh, verifyRefresh, verifyAccess, signTmp } = require('../lib/jwt');
const { bruteGuard, onLoginFail, onLoginSuccess } = require('../middlewares/bruteGuard');
const { z } = require('zod');

const router = express.Router();

function setRefreshCookie(res, token) {
	res.cookie('rt', token, {
		httpOnly: true,
		secure: String(process.env.COOKIE_SECURE) === 'true',
		sameSite: 'strict', // CSRF koruması için Strict
		// Development'ta domain belirtme - aynı localhost için geçerli olsun
		domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
		path: '/', // Tüm path'lere erişebilsin
		maxAge: 1000 * 60 * 60 * 24 * 7,
	});
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 email: { type: string }
 *                 name: { type: string, nullable: true }
 */
// POST /api/auth/register
const RegisterSchema = z.object({
	email: z.string().email(),
	password: z.string()
		.min(8, 'Şifre en az 8 karakter olmalıdır')
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
			'Şifre en az bir küçük harf, büyük harf, rakam ve özel karakter içermelidir'),
	name: z.string().trim().min(1).optional(),
});

router.post('/register', async (req, res, next) => {
	try {
		// Şifreyi loglamadan güvenli request log
		const { password: reqPassword, ...safeBody } = req.body;
		console.log('📝 REGISTER REQUEST:', { ...safeBody, password: '[REDACTED]' });
		const parsed = RegisterSchema.safeParse(req.body);
		if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
		const { email, password, name } = parsed.data;

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) return res.status(409).json({ error: 'email_exists' });

		const passwordHash = await bcrypt.hash(password, 14); // Güvenlik için cost 14
		const user = await prisma.user.create({
			data: { email, name, passwordHash },
			select: { id: true, email: true, name: true }
		});

		console.log('✅ USER CREATED:', user);
		res.status(201).json(user);
	} catch (e) { 
		console.log('❌ REGISTER ERROR:', e);
		next(e); 
	}
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               remember: { type: boolean }
 *     responses:
 *       '200':
 *         description: Success or MFA required
 *         content:
 *           application/json:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   accessToken: { type: string }
 *                   user:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       email: { type: string }
 *                       name: { type: string, nullable: true }
 *               - type: object
 *                 properties:
 *                   mfa_required: { type: boolean, example: true }
 *                   tmpToken: { type: string }
 */
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional(),
});

// POST /api/auth/login
router.post('/login', bruteGuard(), async (req, res, next) => {
	try {
		// Şifreyi loglamadan güvenli request log
		const { password: reqPassword, ...safeBody } = req.body;
		console.log('📝 LOGIN REQUEST:', { ...safeBody, password: '[REDACTED]' });
		const parsed = LoginSchema.safeParse(req.body);
		if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
		const { email, password, remember = true } = parsed.data;
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user || !user.passwordHash) {
			console.log('❌ LOGIN FAILED: User not found or no password hash');
			onLoginFail(req);
			return res.status(401).json({ error: 'invalid_credentials' });
		}

		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) {
			console.log('❌ LOGIN FAILED: Password mismatch');
			onLoginFail(req);
			return res.status(401).json({ error: 'invalid_credentials' });
		}

		onLoginSuccess(req);

		// Eğer 2FA açıksa access/refresh vermek yerine mfa_required dön
		if (user.twoFAEnabled && user.totpSecret) {
			const tmpToken = signTmp({ sub: user.id, email: user.email });
			return res.json({ mfa_required: true, tmpToken });
		}

		// 2FA kapalıysa normal akış (access + refresh cookie)
		const accessToken = signAccess({ sub: user.id, email: user.email });
		const jti = uuidv4();
		const refreshToken = signRefresh({ sub: user.id, jti, remember });
		const exp = new Date(Date.now() + 7*24*60*60*1000);
		
		// User agent ve IP bilgilerini al
		const ua = req.headers['user-agent'] || '';
		const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0] || req.socket.remoteAddress;
		
		await prisma.refreshToken.create({
			data: { userId: user.id, token: refreshToken, jti, expiresAt: exp, userAgent: ua, ip }
		});

		setRefreshCookie(res, refreshToken);
		console.log('✅ LOGIN SUCCESS:', { 
			id: user.id, 
			email: user.email, 
			name: user.name,
			accessToken: accessToken.substring(0, 20) + '...' // İlk 20 karakter göster
		});
		res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
	} catch (e) { next(e); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
	try {
		const token = req.cookies?.rt;
		if (!token) return res.status(401).json({ error: 'no_refresh' });

		const decoded = verifyRefresh(token);
		const stored = await prisma.refreshToken.findUnique({ where: { token } });
		if (!stored || stored.revokedAt) return res.status(401).json({ error: 'refresh_revoked' });

		await prisma.refreshToken.update({ where: { token }, data: { revokedAt: new Date() } });

		const jti = uuidv4();
		const newRefresh = signRefresh({ sub: decoded.sub, jti });
		const exp = new Date(Date.now() + 7*24*60*60*1000);
		
		// User agent ve IP bilgilerini al
		const ua = req.headers['user-agent'] || '';
		const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0] || req.socket.remoteAddress;
		
		await prisma.refreshToken.create({ 
			data: { userId: decoded.sub, token: newRefresh, jti, expiresAt: exp, userAgent: ua, ip } 
		});

		setRefreshCookie(res, newRefresh);
		const accessToken = signAccess({ sub: decoded.sub, email: decoded.email });
		res.json({ accessToken });
	} catch (e) { return res.status(401).json({ error: 'invalid_refresh' }); }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
	try {
		const auth = req.headers.authorization || '';
		const access = auth.startsWith('Bearer ') ? auth.slice(7) : null;
		if (!access) return res.status(401).json({ error: 'unauthorized' });

		const decoded = verifyAccess(access);
		const me = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { id: true, email: true, name: true, createdAt: true } });
		if (!me) return res.status(404).json({ error: 'not_found' });
		res.json(me);
	} catch (e) { next(e); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
	try {
		const token = req.cookies?.rt;
		if (token) {
			await prisma.refreshToken.updateMany({ where: { token }, data: { revokedAt: new Date() } });
		}
		res.clearCookie('rt', { path: '/api/auth/refresh', domain: process.env.COOKIE_DOMAIN || undefined });
		res.status(204).end();
	} catch (e) { next(e); }
});

// POST /api/auth/logout-all — revoke all refresh tokens for current user
router.post('/logout-all', async (req, res, next) => {
	try {
		const token = req.cookies?.rt;
		if (!token) return res.status(204).end();
		const decoded = verifyRefresh(token);
		await prisma.refreshToken.updateMany({ where: { userId: decoded.sub, revokedAt: null }, data: { revokedAt: new Date() } });
		res.clearCookie('rt', { path: '/api/auth/refresh', domain: process.env.COOKIE_DOMAIN || undefined });
		res.status(204).end();
	} catch (e) { next(e); }
});

module.exports = router;
