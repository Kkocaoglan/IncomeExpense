const pino = require('pino');

const redact = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.oldPassword',
    'req.body.newPassword',
    'req.body.code',
    'req.body.token',
    'res.headers["set-cookie"]',
  ],
  censor: '[REDACTED]',
};

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
    : undefined,
  base: null,
  redact,
});

module.exports = logger;


