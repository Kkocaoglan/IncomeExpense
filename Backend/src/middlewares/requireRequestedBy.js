// X-Requested-By header kontrolü için middleware
function requireRequestedBy() {
  return (req, res, next) => {
    const requiredHeader = process.env.CSRF_REQUIRED_HEADER || 'X-Requested-By';
    const requiredValue = process.env.CSRF_REQUIRED_VALUE || 'app';
    
    const headerValue = req.headers[requiredHeader.toLowerCase()];
    
    if (!headerValue) {
      return res.status(403).json({ 
        error: 'missing_required_header',
        message: `${requiredHeader} header is required`,
        requiredHeader: requiredHeader
      });
    }
    
    if (headerValue !== requiredValue) {
      return res.status(403).json({ 
        error: 'invalid_header_value',
        message: `Invalid ${requiredHeader} header value`,
        requiredHeader: requiredHeader
      });
    }
    
    next();
  };
}

module.exports = { requireRequestedBy };
