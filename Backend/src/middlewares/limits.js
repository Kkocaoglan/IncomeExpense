const rateLimit = require('express-rate-limit');

const mk = ({ windowMin, max }) => rateLimit({
  windowMs: Number(windowMin) * 60 * 1000,
  max: Number(max),
  standardHeaders: true,
  legacyHeaders: false,
});

exports.loginLimiter = mk({
  windowMin: process.env.LOGIN_WINDOW_MIN || 15,
  max: process.env.LOGIN_MAX || 20,
});

exports.mfaLimiter = mk({
  windowMin: process.env.MFA_WINDOW_MIN || 15,
  max: process.env.MFA_MAX || 20,
});

exports.passwordLimiter = mk({
  windowMin: process.env.PASSWORD_WINDOW_MIN || 15,
  max: process.env.PASSWORD_MAX || 10,
});

exports.adminLimiter = mk({
  windowMin: process.env.ADMIN_WINDOW_MIN || 15,
  max: process.env.ADMIN_MAX || 300,
});

// Refresh token rotation limiter
exports.refreshLimiter = mk({
  windowMin: process.env.REFRESH_WINDOW_MIN || 5,
  max: process.env.REFRESH_MAX || 120,
});

// Email verification send limiter (IP/email spam guard)
exports.emailSendLimiter = mk({
  windowMin: process.env.EMAIL_SEND_WINDOW_MIN || 15,
  max: process.env.EMAIL_SEND_MAX || 5,
});


