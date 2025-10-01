// Same Origin kontrolü için middleware
function requireSameOrigin() {
  return (req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    
    // Origin header kontrolü
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // Eğer Origin var ise kontrol et
    if (origin) {
      if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ 
          error: 'forbidden_origin',
          message: 'Request origin not allowed' 
        });
      }
    } 
    // Origin yoksa Referer kontrolü yap
    else if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
        
        if (!allowedOrigins.includes(refererOrigin)) {
          return res.status(403).json({ 
            error: 'forbidden_referer',
            message: 'Request referer not allowed' 
          });
        }
      } catch (error) {
        return res.status(403).json({ 
          error: 'invalid_referer',
          message: 'Invalid referer header' 
        });
      }
    }
    // Ne Origin ne de Referer var - şüpheli istek
    else {
      return res.status(403).json({ 
        error: 'missing_origin',
        message: 'Origin or Referer header required' 
      });
    }
    
    next();
  };
}

module.exports = { requireSameOrigin };
