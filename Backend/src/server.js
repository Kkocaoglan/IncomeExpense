require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { loginLimiter, mfaLimiter, passwordLimiter, adminLimiter, refreshLimiter, emailSendLimiter, specificLoginLimiter, specificRefreshLimiter, ocrLimiter } = require('./middlewares/limits');
const { idempotency } = require('./middlewares/idempotency');
const { authRequired } = require('./middlewares/auth');
const { requireAdmin } = require('./middlewares/rbac');
const { validatePepper } = require('./lib/passwordUtils');
const { runAllCleanupJobs } = require('./jobs/anomalyCleanup');
const { httpMetricsMiddleware, metricsHandler } = require('./lib/metrics');
const { logFeatureFlags } = require('./config/flags');
// const { getCircuitBreakerStatus } = require('./lib/circuitBreaker');
const ScheduledHealthCheck = require('../scripts/scheduled-health-check');
const { initializeSecurityPolicies, enforceAdmin2FA, enforceUser2FA, enforceSessionSecurity } = require('./lib/securityPolicies');
const cron = require('node-cron');

const transactions = require('./routes/transactions');
const investments = require('./routes/investments');
const receipts = require('./routes/receipts');
const auth = require('./routes/auth');
const emailRoutes = require('./routes/auth.email');
const auth2fa = require('./routes/auth.2fa');
const meSessions = require('./routes/me.sessions');
const meSudo = require('./routes/me.sudo');
const mePassword = require('./routes/me.password');

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

// Pepper validation on startup
if (!validatePepper()) {
  console.error('❌ PEPPER validation failed. Server cannot start safely.');
  process.exit(1);
}

app.set('trust proxy', 1);
app.use(requestId);
app.use(httpMetricsMiddleware); // Prometheus metrics collection
app.use(pinoHttp({
  logger,
  genReqId: req => req.id,
  customProps: (req) => ({ userId: req.user?.id || null, env: process.env.NODE_ENV || 'development' }),
}));
app.use((req,res,next)=>{ res.setHeader('Vary','Origin'); next(); });

// Nonce middleware - her istekte benzersiz nonce oluştur
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// CORS allowlist with dev tolerance (no origin => allow)
const origins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Production'da strict CORS
    if (isProd) {
      // Origin yoksa reddet (Postman/curl vs. sadece dev'te)
      if (!origin) {
        return cb(new Error('Origin header required in production'), false);
      }
      
      // Sadece ALLOWED_ORIGINS'te olan origin'lere izin ver
      try {
        const u = new URL(origin);
        const key = `${u.protocol}//${u.host}`;
        const isAllowed = origins.includes(key);
        
        if (!isAllowed) {
          console.warn(`🚫 CORS blocked origin: ${origin}`);
          return cb(new Error(`Origin ${origin} not allowed`), false);
        }
        
        return cb(null, true);
      } catch (error) {
        console.warn(`🚫 CORS invalid origin: ${origin}`);
        return cb(new Error('Invalid origin format'), false);
      }
    }
    
    // Development'ta daha esnek (ama yine de kontrollü)
    if (!origin) return cb(null, true); // Postman, curl vs.
    
    const allowedDevOrigins = [
      'http://localhost:5173', // Frontend Vite
      'http://localhost:5001', // Backend
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5001'
    ];
    
    const isDevAllowed = allowedDevOrigins.includes(origin);
    if (!isDevAllowed) {
      console.warn(`🚫 DEV CORS blocked origin: ${origin}`);
    }
    
    return cb(null, isDevAllowed);
  },
  credentials: true, // Cookie paylaşımı için kritik
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-By', 'Idempotency-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID']
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      "style-src": ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      "img-src": ["'self'", "data:", "blob:"],
      "font-src": ["'self'", "data:"],
      "connect-src": ["'self'", process.env.FRONTEND_ORIGIN || "", process.env.API_ORIGIN || ""],
      "frame-ancestors": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "upgrade-insecure-requests": isProd ? [] : null
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

// CORS test endpoint
app.get('/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS test başarılı',
    origin: req.headers.origin || 'No origin',
    userAgent: req.headers['user-agent'] || 'No UA',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Prometheus metrics endpoint (no auth required)
app.get('/metrics', metricsHandler);

// Circuit breaker status endpoint (admin only) - temporarily disabled
// app.get('/api/admin/circuit-breakers', authRequired, requireAdmin, (req, res) => {
//   try {
//     const status = getCircuitBreakerStatus();
//     res.json({
//       status: 'ok',
//       circuitBreakers: status,
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: 'failed_to_get_status',
//       message: error.message
//     });
//   }
// });

// Rate limiters - original (broader) limits
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/mfa', mfaLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/auth/password', passwordLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/auth/email/send', emailSendLimiter);

// P2 - Specific endpoint rate limiters (stricter)
app.use('/api/auth/login', specificLoginLimiter);
app.use('/api/auth/refresh', specificRefreshLimiter);
app.use('/api/receipts/ocr', ocrLimiter);

app.use('/api/transactions', authRequired, idempotency());
app.use('/api/investments', authRequired, idempotency());
app.use('/api/receipts', authRequired, idempotency());

// Debug middleware
app.use('/api/auth', (req, res, next) => {
  console.log('🔍 AUTH MIDDLEWARE HIT:', req.method, req.url);
  next();
});

app.use('/api/auth', auth);
app.use('/api/auth', emailRoutes);
app.use('/api/auth', auth2fa);
app.use('/api', meSessions);
app.use('/api/me', meSudo);
app.use('/api/me', mePassword);
app.use('/api/transactions', transactions);
app.use('/api/investments', investments);

// OCR endpoint için özel JSON limit (10mb)
app.use('/api/receipts/ocr', express.json({ limit: '10mb' }));
app.use('/api/receipts', receipts);

app.use('/api/admin/dashboard', authRequired, requireAdmin, enforceAdmin2FA, adminDashboard);
app.use('/api/admin/users', authRequired, requireAdmin, enforceAdmin2FA, adminUsers);
app.use('/api/admin/system', authRequired, requireAdmin, enforceAdmin2FA, adminSystem);

// Admin security route - 2FA setup exception için özel handling
app.use('/api/admin/security', authRequired, requireAdmin, adminSecurity);

// OpenAPI docs - Admin only
app.use('/docs', authRequired, requireAdmin, swaggerUiMiddleware, swaggerUiHandler);

app.use((err, req, res, next) => {
  req.log?.error({ err, requestId: req.id }, 'unhandled_error');
  const code = err.status || 500;
  const msg = err.message || 'internal_error';
  res.status(code).json({ error: 'error', message: msg, requestId: req.id });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Backend listening');
  
  // Feature flags durumunu logla
  logFeatureFlags();
  
  // Güvenlik politikalarını başlat
  initializeSecurityPolicies();
  
  // Cron job'ları başlat
  if (process.env.NODE_ENV === 'production') {
    // Security log cleanup - Her gün 03:00'da
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Starting scheduled cleanup jobs...');
        const result = await runAllCleanupJobs();
        logger.info({ result }, 'Scheduled cleanup jobs completed');
      } catch (error) {
        logger.error({ error }, 'Scheduled cleanup jobs failed');
      }
    }, {
      timezone: 'UTC'
    });
    
    // Health check scheduler başlat
    const healthChecker = new ScheduledHealthCheck();
    healthChecker.start();
    
    logger.info('Cron jobs scheduled for production environment');
    logger.info('Health check scheduler started');
  } else {
    // Development'ta manuel test için
    logger.info('Development mode: Cron jobs disabled');
    logger.info('Health check available via: npm run health');
  }
});

function shutdown(signal) {
  logger.warn({ signal }, 'shutting down...');
  server.close(() => { logger.info('http server closed'); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
