/**
 * Feature Flags Configuration
 * Riskli yayınları bayrakla aç/kapat
 */

const flags = {
  // Security Features
  ENABLE_TURNSTILE: process.env.ENABLE_TURNSTILE === '1',
  ENABLE_CSRF_STRICT: process.env.ENABLE_CSRF_STRICT === '1',
  ENABLE_ADVANCED_RATE_LIMITING: process.env.ENABLE_ADVANCED_RATE_LIMITING === '1',
  
  // OCR & File Processing
  ENABLE_AZURE_OCR: process.env.ENABLE_AZURE_OCR === '1',
  ENABLE_FILE_SCANNING: process.env.ENABLE_FILE_SCANNING === '1',
  ENABLE_OCR_CIRCUIT_BREAKER: process.env.ENABLE_OCR_CIRCUIT_BREAKER === '1',
  
  // Reporting & Analytics
  USE_NEW_REPORTS: process.env.USE_NEW_REPORTS === '1',
  ENABLE_ADVANCED_ANALYTICS: process.env.ENABLE_ADVANCED_ANALYTICS === '1',
  
  // Admin Features
  ENABLE_ADMIN_DASHBOARD: process.env.ENABLE_ADMIN_DASHBOARD === '1',
  ENABLE_SUDO_MODE: process.env.ENABLE_SUDO_MODE === '1',
  ENABLE_ADMIN_MFA: process.env.ENABLE_ADMIN_MFA === '1',
  
  // Performance & Monitoring
  ENABLE_PROMETHEUS_METRICS: process.env.ENABLE_PROMETHEUS_METRICS === '1',
  ENABLE_DETAILED_LOGGING: process.env.ENABLE_DETAILED_LOGGING === '1',
  ENABLE_PERFORMANCE_TRACKING: process.env.ENABLE_PERFORMANCE_TRACKING === '1',
  
  // Development & Testing
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG_MODE === '1',
  ENABLE_API_DOCS: process.env.ENABLE_API_DOCS === '1',
  ENABLE_TEST_ENDPOINTS: process.env.ENABLE_TEST_ENDPOINTS === '1',
  
  // Email & Notifications
  ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS === '1',
  ENABLE_SENDGRID: process.env.ENABLE_SENDGRID === '1',
  ENABLE_MAILGUN: process.env.ENABLE_MAILGUN === '1',
  
  // Database & Caching
  ENABLE_REDIS_CACHING: process.env.ENABLE_REDIS_CACHING === '1',
  ENABLE_DB_QUERY_LOGGING: process.env.ENABLE_DB_QUERY_LOGGING === '1',
  ENABLE_CONNECTION_POOLING: process.env.ENABLE_CONNECTION_POOLING === '1'
};

/**
 * Feature flag kontrolü için helper fonksiyonlar
 */
const isEnabled = (flagName) => {
  if (!(flagName in flags)) {
    console.warn(`Unknown feature flag: ${flagName}`);
    return false;
  }
  return flags[flagName];
};

const isDisabled = (flagName) => {
  return !isEnabled(flagName);
};

/**
 * Feature flag'leri logla (startup'ta)
 */
const logFeatureFlags = () => {
  const enabledFlags = Object.entries(flags)
    .filter(([_, enabled]) => enabled)
    .map(([name, _]) => name);
  
  const disabledFlags = Object.entries(flags)
    .filter(([_, enabled]) => !enabled)
    .map(([name, _]) => name);
  
  console.log('🚩 Feature Flags Status:');
  console.log(`✅ Enabled: ${enabledFlags.join(', ') || 'None'}`);
  console.log(`❌ Disabled: ${disabledFlags.join(', ') || 'None'}`);
};

/**
 * Feature flag middleware - request'lerde flag kontrolü
 */
const featureFlagMiddleware = (flagName, fallbackHandler = null) => {
  return (req, res, next) => {
    if (isEnabled(flagName)) {
      next();
    } else if (fallbackHandler) {
      fallbackHandler(req, res, next);
    } else {
      res.status(503).json({
        error: 'feature_disabled',
        message: `Feature '${flagName}' is currently disabled`,
        flag: flagName
      });
    }
  };
};

/**
 * Conditional feature execution
 */
const withFeatureFlag = (flagName, enabledFn, disabledFn = null) => {
  return (...args) => {
    if (isEnabled(flagName)) {
      return enabledFn(...args);
    } else if (disabledFn) {
      return disabledFn(...args);
    }
    return null;
  };
};

module.exports = {
  flags,
  isEnabled,
  isDisabled,
  logFeatureFlags,
  featureFlagMiddleware,
  withFeatureFlag
};
