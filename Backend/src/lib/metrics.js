/**
 * Prometheus Metrics for Node.js Application
 * HTTP request duration, request count ve system metrics
 */

const client = require('prom-client');

// Default metric'leri etkinleştir (CPU, memory, event loop lag vs.)
client.collectDefaultMetrics({
  prefix: 'nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// HTTP Request Duration Histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// HTTP Request Count Counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Authentication Success/Failure Counters
const authSuccessTotal = new client.Counter({
  name: 'auth_success_total',
  help: 'Total number of successful authentications',
  labelNames: ['type'] // login, refresh, 2fa
});

const authFailureTotal = new client.Counter({
  name: 'auth_failure_total',
  help: 'Total number of failed authentications',
  labelNames: ['type', 'reason'] // brute_force, invalid_credentials, etc.
});

// Database Query Duration
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

// Redis Operation Duration
const redisOpDuration = new client.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'], // get, set, del, incr
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.3, 0.5]
});

// Security Events Counter
const securityEventsTotal = new client.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'severity'] // login_failed, anomaly_detected, etc.
});

// File Upload Metrics
const fileUploadsTotal = new client.Counter({
  name: 'file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['status', 'file_type'] // success/failed, image/pdf
});

const fileUploadSize = new client.Histogram({
  name: 'file_upload_size_bytes',
  help: 'Size of uploaded files in bytes',
  buckets: [1024, 10240, 102400, 1048576, 10485760] // 1KB, 10KB, 100KB, 1MB, 10MB
});

/**
 * HTTP request duration tracking middleware
 */
function httpMetricsMiddleware(req, res, next) {
  const start = Date.now();
  
  // Response finished event'ini dinle
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // seconds
    const route = getRoutePattern(req);
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });
  
  next();
}

/**
 * Route pattern'ini temizle (ID'leri mask'le)
 */
function getRoutePattern(req) {
  let route = req.route?.path || req.path || 'unknown';
  
  // ID pattern'lerini mask'le
  route = route.replace(/\/[a-f0-9-]{36}/g, '/:id'); // UUID
  route = route.replace(/\/[a-zA-Z0-9]{8,}/g, '/:id'); // Random ID
  route = route.replace(/\/\d+/g, '/:id'); // Numeric ID
  
  return route;
}

/**
 * Auth metrics helpers
 */
function recordAuthSuccess(type) {
  authSuccessTotal.inc({ type });
}

function recordAuthFailure(type, reason) {
  authFailureTotal.inc({ type, reason });
}

/**
 * Database query tracking
 */
function recordDbQuery(operation, table, duration) {
  dbQueryDuration.observe({ operation, table }, duration);
}

/**
 * Redis operation tracking
 */
function recordRedisOp(operation, duration) {
  redisOpDuration.observe({ operation }, duration);
}

/**
 * Security event tracking
 */
function recordSecurityEvent(eventType, severity) {
  securityEventsTotal.inc({ event_type: eventType, severity });
}

/**
 * File upload tracking
 */
function recordFileUpload(status, fileType, sizeBytes) {
  fileUploadsTotal.inc({ status, file_type: fileType });
  if (sizeBytes) {
    fileUploadSize.observe(sizeBytes);
  }
}

/**
 * /metrics endpoint handler
 */
async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Metrics collection error:', error);
    res.status(500).end('Error collecting metrics');
  }
}

/**
 * Özel gauge metric'ler (runtime stats)
 */
const activeConnections = new client.Gauge({
  name: 'active_connections_total',
  help: 'Number of active connections'
});

const activeSessions = new client.Gauge({
  name: 'active_sessions_total',
  help: 'Number of active user sessions'
});

module.exports = {
  httpMetricsMiddleware,
  metricsHandler,
  recordAuthSuccess,
  recordAuthFailure,
  recordDbQuery,
  recordRedisOp,
  recordSecurityEvent,
  recordFileUpload,
  activeConnections,
  activeSessions,
  // Prometheus client'ı export et
  promClient: client
};
