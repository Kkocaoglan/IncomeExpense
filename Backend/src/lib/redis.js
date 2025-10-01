const IORedis = require('ioredis');

// Redis bağlantısını oluştur
const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { 
  enableOfflineQueue: false,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000
});

redis.on('connect', () => {
  console.log('Redis bağlantısı kuruldu');
});

redis.on('error', (err) => {
  console.error('Redis bağlantı hatası:', err);
});

redis.on('ready', () => {
  console.log('Redis hazır');
});

redis.on('close', () => {
  console.log('Redis bağlantısı kapatıldı');
});

module.exports = { redis };
