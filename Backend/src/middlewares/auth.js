const { verifyAccess, verifyRefresh } = require('../lib/jwt');
const prisma = require('../lib/prisma');

async function authRequired(req, res, next) {
	try {
		// Önce Bearer token kontrol et
		const auth = req.headers.authorization || '';
		let token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
		
		// Bearer token yoksa, refresh cookie'den access token üret
		if (!token) {
			const refreshToken = req.cookies?.rt;
			if (!refreshToken) {
				return res.status(401).json({ error: 'unauthorized', message: 'No access token or refresh cookie' });
			}
			
			try {
				const decoded = verifyRefresh(refreshToken);
				
				// User'ın role'unu database'den al (await kullan)
				const user = await prisma.user.findUnique({ 
					where: { id: decoded.sub }, 
					select: { role: true, email: true } 
				});
				
				if (!user) {
					return res.status(401).json({ error: 'unauthorized', message: 'User not found' });
				}
				
				req.user = { 
					id: decoded.sub, 
					email: user.email, 
					role: user.role,
					mfaVerified: false // Refresh token'dan geldiğinde MFA re-verification gerekir
				};
				return next();
			} catch (refreshError) {
				return res.status(401).json({ error: 'unauthorized', message: 'Invalid refresh token' });
			}
		}

		// Bearer token varsa normal doğrulama
		const decoded = verifyAccess(token);
		
		// Access token'da role yoksa database'den al
		if (!decoded.role) {
			const user = await prisma.user.findUnique({ 
				where: { id: decoded.sub }, 
				select: { role: true, email: true } 
			});
			
			if (!user) {
				return res.status(401).json({ error: 'unauthorized', message: 'User not found' });
			}
			
			req.user = { id: decoded.sub, email: user.email, role: user.role };
		} else {
			req.user = { 
				id: decoded.sub, 
				email: decoded.email, 
				role: decoded.role,
				mfaVerified: decoded.mfaVerified || false
			};
		}
		
		return next();
	} catch (e) {
		return res.status(401).json({ error: 'unauthorized', message: 'Invalid access token' });
	}
}

module.exports = { authRequired };
