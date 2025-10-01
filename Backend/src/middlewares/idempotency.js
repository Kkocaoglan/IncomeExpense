// Redis tabanlı idempotency middleware
const { redis } = require('../lib/redis.js');
const { createHash } = require('crypto');

function idempotency(requiredOn = ['POST', 'PUT', 'PATCH', 'DELETE']) {
  const ttlSec = Number(process.env.IDEMPOTENCY_TTL_SEC) || 60;
  
  return async (req, res, next) => {
    try {
      if (!requiredOn.includes(req.method)) return next();

      const idempotencyKey = req.headers['idempotency-key'];
      if (!idempotencyKey) return next(); // zorunlu istenirse 400 döndürülebilir

      const userId = req.user?.id || 'anon';
      const route = req.route?.path || req.originalUrl;
      
      // Body hash ile beraber key oluştur
      const bodyHash = req.body ? createHash('sha256').update(JSON.stringify(req.body)).digest('hex').substring(0, 16) : 'nobody';
      const cacheKey = `idem:${userId}:${route}:${createHash('sha256').update(idempotencyKey + bodyHash).digest('hex')}`;

      // Redis SET NX EX kullanarak atomic check-and-set
      const result = await redis.set(cacheKey, '1', 'EX', ttlSec, 'NX');
      
      if (!result) {
        // Key zaten var, duplicate request
        return res.status(409).json({ error: 'duplicate_request' });
      }
      
      next();
    } catch (error) {
      console.error('Idempotency Redis hatası:', error);
      // Redis hatası durumunda middleware'i geç
      next();
    }
  };
}

module.exports = { idempotency };


