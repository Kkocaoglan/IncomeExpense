require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const transactions = require('./routes/transactions');
const investments = require('./routes/investments');
const receipts = require('./routes/receipts');
const auth = require('./routes/auth');

const app = express();
app.set('trust proxy', 1);

// CORS allowlist
const origins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  },
  credentials: true
}));

app.use(helmet());
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
app.get(['/healtz', '/health'], (req, res) => res.json({ ok: true, ts: Date.now(), alias: true }));

app.use('/api/auth', auth);
app.use('/api/transactions', transactions);
app.use('/api/investments', investments);
app.use('/api/receipts', receipts);

app.use((err, req, res, next) => {
  const code = err.status || 500;
  const msg = err.message || 'internal_error';
  if (process.env.NODE_ENV !== 'production') console.error(err);
  res.status(code).json({ error: 'error', message: msg });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
