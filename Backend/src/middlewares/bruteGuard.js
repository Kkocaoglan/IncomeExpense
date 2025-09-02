// Basit IP+email brute force guard. Production için Redis önerilir.
const misses = new Map(); // key -> { count, until }

function keyFrom(req) {
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0] || req.socket.remoteAddress || 'ip';
  const email = (req.body?.email || '').toLowerCase() || 'anon';
  return `${ip}:${email}`;
}

exports.bruteGuard = function bruteGuard() {
  return (req, res, next) => {
    const key = keyFrom(req);
    const st = misses.get(key);
    const now = Date.now();
    if (st?.until && st.until > now) {
      const sec = Math.ceil((st.until - now) / 1000);
      return res.status(429).json({ error: 'too_many_attempts', retryInSec: sec });
    }
    req._bruteKey = key;
    next();
  };
}

exports.onLoginFail = function onLoginFail(req) {
  const key = req._bruteKey;
  if (!key) return;
  const st = misses.get(key) || { count: 0, until: 0 };
  st.count += 1;
  if (st.count >= 5) {
    st.until = Date.now() + 5 * 60 * 1000; // 5 dk
    st.count = 0;
  }
  misses.set(key, st);
}

exports.onLoginSuccess = function onLoginSuccess(req) {
  const key = req._bruteKey;
  if (!key) return;
  misses.delete(key);
}


