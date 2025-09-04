// Minimal, memory-based idempotency. Production için Redis önerilir.
const seen = new Map(); // key -> expireAt (ms)

function idempotency(requiredOn = ['POST', 'PUT', 'PATCH', 'DELETE']) {
  const ttl = (Number(process.env.IDEMPOTENCY_TTL_SEC) || 86400) * 1000;
  return (req, res, next) => {
    if (!requiredOn.includes(req.method)) return next();

    const key = req.headers['idempotency-key'];
    if (!key) return next(); // zorunlu istenirse 400 döndürülebilir

    const userId = req.user?.id || 'anon';
    const cacheKey = `${userId}:${req.method}:${req.originalUrl}:${key}`;

    const now = Date.now();
    const expireAt = seen.get(cacheKey);
    if (expireAt && expireAt > now) {
      return res.status(409).json({ error: 'duplicate_request' });
    }
    seen.set(cacheKey, now + ttl);
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of seen.entries()) if (v <= now) seen.delete(k);
}, 60_000).unref();

module.exports = { idempotency };


