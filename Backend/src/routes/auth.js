const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { signAccess, signRefresh, verifyRefresh, verifyAccess } = require('../lib/jwt');

const router = express.Router();

function setRefreshCookie(res, token) {
	res.cookie('rt', token, {
		httpOnly: true,
		secure: String(process.env.COOKIE_SECURE) === 'true',
		sameSite: 'lax',
		domain: process.env.COOKIE_DOMAIN || undefined,
		path: '/api/auth/refresh',
		maxAge: 1000 * 60 * 60 * 24 * 7,
	});
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
	try {
		const { email, password, name } = req.body || {};
		if (!email || !password) return res.status(400).json({ error: 'email_password_required' });

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) return res.status(409).json({ error: 'email_exists' });

		const passwordHash = await bcrypt.hash(password, 12);
		const user = await prisma.user.create({
			data: { email, name, passwordHash },
			select: { id: true, email: true, name: true }
		});

		res.status(201).json(user);
	} catch (e) { next(e); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
	try {
		const { email, password } = req.body || {};
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user || !user.passwordHash) return res.status(401).json({ error: 'invalid_credentials' });

		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

		const accessToken = signAccess({ sub: user.id, email: user.email });
		const jti = uuidv4();
		const refreshToken = signRefresh({ sub: user.id, jti });

		const exp = new Date(Date.now() + 7*24*60*60*1000);
		await prisma.refreshToken.create({
			data: { userId: user.id, token: refreshToken, jti, expiresAt: exp }
		});

		setRefreshCookie(res, refreshToken);
		res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
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
		await prisma.refreshToken.create({ data: { userId: decoded.sub, token: newRefresh, jti, expiresAt: exp } });

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

module.exports = router;
