const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const TMP_SECRET = process.env.JWT_TMP_SECRET;
const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
const TMP_EXPIRES = process.env.MFA_TMP_EXPIRES_IN || '5m';

function signAccess(payload) {
	return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function signRefresh(payload) {
	return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

function verifyAccess(token) {
	return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefresh(token) {
	return jwt.verify(token, REFRESH_SECRET);
}

function signTmp(payload) {
	return jwt.sign(payload, TMP_SECRET, { expiresIn: TMP_EXPIRES });
}

function verifyTmp(token) {
	return jwt.verify(token, TMP_SECRET);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh, signTmp, verifyTmp };
