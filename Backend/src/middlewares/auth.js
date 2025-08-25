const { verifyAccess } = require('../lib/jwt');

function authRequired(req, res, next) {
	try {
		const auth = req.headers.authorization || '';
		const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
		if (!token) return res.status(401).json({ error: 'unauthorized' });

		const decoded = verifyAccess(token);
		req.user = { id: decoded.sub, email: decoded.email };
		return next();
	} catch (e) {
		return res.status(401).json({ error: 'unauthorized' });
	}
}

module.exports = { authRequired };
