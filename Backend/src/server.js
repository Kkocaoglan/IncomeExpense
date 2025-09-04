require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { loginLimiter, mfaLimiter, passwordLimiter, adminLimiter, refreshLimiter, emailSendLimiter } = require('./middlewares/limits');
const { idempotency } = require('./middlewares/idempotency');
const { authRequired } = require('./middlewares/auth');
const { requireAdmin } = require('./middlewares/rbac');

const transactions = require('./routes/transactions');
const investments = require('./routes/investments');
const receipts = require('./routes/receipts');
const auth = require('./routes/auth');
const emailRoutes = require('./routes/auth.email');
const auth2fa = require('./routes/auth.2fa');
const meSessions = require('./routes/me.sessions');

// Admin routes
const adminDashboard = require('./routes/admin/dashboard');
const adminUsers = require('./routes/admin/users');
const adminSystem = require('./routes/admin/system');
const adminSecurity = require('./routes/admin/security');
const pinoHttp = require('pino-http');
const logger = require('./lib/logger');
const { requestId } = require('./middlewares/requestId');
const { swaggerUiMiddleware, swaggerUiHandler } = require('./lib/swagger');

const app = express();
const isProd = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
app.use(requestId);
app.use(pinoHttp({
  logger,
  genReqId: req => req.id,
  customProps: (req) => ({ userId: req.user?.id || null, env: process.env.NODE_ENV || 'development' }),
}));
app.use((req,res,next)=>{ res.setHeader('Vary','Origin'); next(); });

// CORS allowlist with dev tolerance (no origin => allow)
const origins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Development'ta cookie paylaşımı için daha esnek CORS
    if (!origin) return cb(null, true); // Postman, curl vs.
    if (!isProd) {
      // Development'ta localhost'un farklı portlarına izin ver
      const allowedDevOrigins = [
        'http://localhost:5173', // Frontend Vite
        'http://localhost:5001', // Backend
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5001'
      ];
      return cb(null, allowedDevOrigins.includes(origin));
    }
    // Production'da sadece belirtilen origin'ler
    try {
      const u = new URL(origin);
      const key = `${u.protocol}//${u.host}`;
      return cb(null, origins.includes(key));
    } catch { return cb(null, false); }
  },
  credentials: true // Cookie paylaşımı için kritik
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // MUI için gerekli
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  }
}));
app.use(hpp());

const limiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(cookieParser());
app.use(compression());

app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/livez', (_req, res) => res.status(200).send('OK'));
app.get('/readyz', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    await p.$queryRaw`SELECT 1`;
    await p.$disconnect();
    res.status(200).send('READY');
  } catch { res.status(503).send('NOT_READY'); }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/mfa', mfaLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/auth/password', passwordLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/auth/email/send', emailSendLimiter);

app.use('/api/transactions', authRequired, idempotency());
app.use('/api/investments', authRequired, idempotency());
app.use('/api/receipts', authRequired, idempotency());

app.use('/api/auth', auth);
app.use('/api/auth', emailRoutes);
app.use('/api/auth', auth2fa);
app.use('/api', meSessions);
app.use('/api/transactions', transactions);
app.use('/api/investments', investments);
app.use('/api/receipts', receipts);

// Admin routes - Protected with requireAdmin middleware
app.use('/api/admin/dashboard', adminDashboard);
app.use('/api/admin/users', adminUsers);
app.use('/api/admin/system', adminSystem);
app.use('/api/admin/security', adminSecurity);

// OpenAPI docs - Admin only
app.use('/docs', authRequired, requireAdmin, swaggerUiMiddleware, swaggerUiHandler);

app.use((err, req, res, next) => {
  req.log?.error({ err, requestId: req.id }, 'unhandled_error');
  const code = err.status || 500;
  const msg = err.message || 'internal_error';
  res.status(code).json({ error: 'error', message: msg, requestId: req.id });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => logger.info({ port: PORT }, 'Backend listening'));

function shutdown(signal) {
  logger.warn({ signal }, 'shutting down...');
  server.close(() => { logger.info('http server closed'); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
