/**
 * Circuit Breaker & Retry Implementation
 * Azure OCR ve diğer external servisler için
 */

const CircuitBreaker = require('opossum');
const axios = require('axios');
let axiosRetry = require('axios-retry');
// Compatibility layer for different axios-retry versions (CommonJS vs ESM default export)
axiosRetry = axiosRetry && axiosRetry.default ? axiosRetry.default : axiosRetry;

// Retry konfigürasyonu (güvenli yükleme)
try {
  axiosRetry(axios, {
    retries: Number(process.env.RETRY_ATTEMPTS) || 3,
    retryDelay: (retryCount) => {
      const base = Math.pow(2, retryCount) * (Number(process.env.RETRY_BASE_DELAY) || 1000);
      const jitter = Math.random() * (Number(process.env.RETRY_JITTER) || 1000);
      return Math.min(base + jitter, Number(process.env.RETRY_MAX_DELAY) || 10000);
    },
    retryCondition: (error) => {
      const ar = require('axios-retry');
      const isNet = ar.isNetworkError || ar.isNetworkOrIdempotentRequestError;
      const isRetryable = ar.isRetryableError;
      const netFail = typeof isNet === 'function' ? isNet(error) : false;
      const retriable = typeof isRetryable === 'function' ? isRetryable(error) : false;
      const serverError = error?.response && error.response.status >= 500;
      const throttled = error?.response && [408, 429].includes(error.response.status);
      return netFail || retriable || serverError || throttled;
    }
  });
} catch (e) {
  console.warn('⚠️ axios-retry yüklenemedi, retry devre dışı. Nedeni:', e.message);
}

/**
 * Circuit Breaker konfigürasyonu
 */
const circuitBreakerOptions = {
  timeout: 8000, // 8 saniye timeout
  errorThresholdPercentage: 50, // %50 hata oranında aç
  resetTimeout: 30000, // 30 saniye sonra tekrar dene
  rollingCountTimeout: 10000, // 10 saniye rolling window
  rollingCountBuckets: 10, // 10 bucket
  name: 'azure-ocr-breaker',
  group: 'external-services'
};

/**
 * Azure OCR için circuit breaker
 */
const azureOCRBreaker = new CircuitBreaker(async (imageData, options = {}) => {
  const endpoint = process.env.AZURE_ENDPOINT;
  const apiKey = process.env.AZURE_API_KEY;
  
  if (!endpoint || !apiKey) {
    throw new Error('Azure OCR credentials not configured');
  }

  const response = await axios.post(
    `${endpoint}/formrecognizer/documentModels/prebuilt-receipt:analyze`,
    {
      base64Source: imageData
    },
    {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 saniye timeout
    }
  );

  return response.data;
}, circuitBreakerOptions);

/**
 * Fallback fonksiyonu - OCR servisi çalışmadığında
 */
azureOCRBreaker.fallback((error, imageData, options) => {
  console.warn('Azure OCR fallback triggered:', error.message);
  
  return {
    success: false,
    error: 'ocr_service_unavailable',
    message: 'OCR servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    fallback: true,
    timestamp: new Date().toISOString()
  };
});

/**
 * Circuit breaker event listeners
 */
azureOCRBreaker.on('open', () => {
  console.warn('🔴 Azure OCR Circuit Breaker OPEN - Service unavailable');
});

azureOCRBreaker.on('halfOpen', () => {
  console.log('🟡 Azure OCR Circuit Breaker HALF-OPEN - Testing service');
});

azureOCRBreaker.on('close', () => {
  console.log('🟢 Azure OCR Circuit Breaker CLOSED - Service recovered');
});

azureOCRBreaker.on('failure', (error) => {
  console.error('❌ Azure OCR Circuit Breaker FAILURE:', error.message);
});

azureOCRBreaker.on('success', () => {
  console.log('✅ Azure OCR Circuit Breaker SUCCESS');
});

/**
 * Generic circuit breaker factory
 */
function createCircuitBreaker(serviceName, serviceFunction, options = {}) {
  const defaultOptions = {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    name: serviceName,
    group: 'external-services'
  };

  const breaker = new CircuitBreaker(serviceFunction, { ...defaultOptions, ...options });
  
  // Generic event listeners
  breaker.on('open', () => {
    console.warn(`🔴 ${serviceName} Circuit Breaker OPEN`);
  });
  
  breaker.on('close', () => {
    console.log(`🟢 ${serviceName} Circuit Breaker CLOSED`);
  });

  return breaker;
}

/**
 * Email servisi için circuit breaker
 */
const emailServiceBreaker = createCircuitBreaker('email-service', async (emailData) => {
  // Email gönderme logic'i buraya gelecek
  const response = await axios.post('/api/send-email', emailData, {
    timeout: 5000
  });
  return response.data;
});

/**
 * Database işlemleri için circuit breaker
 */
const databaseBreaker = createCircuitBreaker('database', async (queryFunction) => {
  return await queryFunction();
}, {
  timeout: 10000,
  errorThresholdPercentage: 30
});

/**
 * Health check için circuit breaker durumları
 */
function getCircuitBreakerStatus() {
  return {
    azureOCR: {
      state: azureOCRBreaker.stats.state,
      failures: azureOCRBreaker.stats.failures,
      successes: azureOCRBreaker.stats.successes,
      fallbacks: azureOCRBreaker.stats.fallbacks,
      errorRate: azureOCRBreaker.stats.errorRate
    },
    emailService: {
      state: emailServiceBreaker.stats.state,
      failures: emailServiceBreaker.stats.failures,
      successes: emailServiceBreaker.stats.successes,
      errorRate: emailServiceBreaker.stats.errorRate
    },
    database: {
      state: databaseBreaker.stats.state,
      failures: databaseBreaker.stats.failures,
      successes: databaseBreaker.stats.successes,
      errorRate: databaseBreaker.stats.errorRate
    }
  };
}

/**
 * Circuit breaker middleware
 */
function circuitBreakerMiddleware(breaker) {
  return (req, res, next) => {
    if (breaker.stats.state === 'OPEN') {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Servis şu anda kullanılamıyor',
        circuitBreakerState: breaker.stats.state
      });
    }
    next();
  };
}

module.exports = {
  azureOCRBreaker,
  emailServiceBreaker,
  databaseBreaker,
  createCircuitBreaker,
  getCircuitBreakerStatus,
  circuitBreakerMiddleware
};
