// Redis tabanlı brute force guard
const { redis } = require('../lib/redis.js');

function keyFrom(req) {
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0] || req.socket.remoteAddress || 'ip';
  const route = req.route?.path || req.path || 'unknown';
  return `bf:${ip}:${route}`;
}

function bruteGuard() {
  const maxAttempts = Number(process.env.BRUTE_MAX) || 10;
  const ttlSec = Number(process.env.BRUTE_TTL_SEC) || 300;

  return async (req, res, next) => {
    try {
      const key = keyFrom(req);
      const attempts = await redis.get(key);
      
      if (attempts && Number(attempts) >= maxAttempts) {
        const ttl = await redis.ttl(key);
        return res.status(429).json({ 
          error: 'too_many_attempts', 
          retryInSec: ttl > 0 ? ttl : ttlSec 
        });
      }
      
      req._bruteKey = key;
      next();
    } catch (error) {
      console.error('Brute guard Redis hatası:', error);
      // Redis hatası durumunda middleware'i geç
      next();
    }
  };
}

async function onLoginFail(req) {
  try {
    const key = req._bruteKey;
    if (!key) return;
    
    const ttlSec = Number(process.env.BRUTE_TTL_SEC) || 300;
    const current = await redis.incr(key);
    
    if (current === 1) {
      // İlk başarısız deneme, TTL belirle
      await redis.expire(key, ttlSec);
    }
  } catch (error) {
    console.error('onLoginFail Redis hatası:', error);
  }
}

async function onLoginSuccess(req) {
  try {
    const key = req._bruteKey;
    if (!key) return;
    
    await redis.del(key);
  } catch (error) {
    console.error('onLoginSuccess Redis hatası:', error);
  }
}

module.exports = { bruteGuard, onLoginFail, onLoginSuccess };


