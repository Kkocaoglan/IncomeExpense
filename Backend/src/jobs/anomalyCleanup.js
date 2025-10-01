/**
 * Anomaly Detection Cleanup Job
 * Periyodik olarak eski session verilerini temizler
 */

const { cleanupSuspiciousSessions } = require('../lib/anomalyDetection');
const { redis } = require('../lib/redis');
const prisma = require('../lib/prisma');

/**
 * Tüm kullanıcılar için session cleanup yapar
 */
async function runAnomalyCleanup() {
  try {
    console.log('🧹 Anomaly cleanup job başlatıldı...');
    
    // Aktif kullanıcıları al (son 30 gün içinde giriş yapmış)
    const activeUsers = await prisma.user.findMany({
      where: {
        refreshTokens: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Son 30 gün
            }
          }
        }
      },
      select: { id: true }
    });

    let cleanedSessions = 0;
    
    for (const user of activeUsers) {
      try {
        await cleanupSuspiciousSessions(user.id);
        cleanedSessions++;
      } catch (error) {
        console.error(`User ${user.id} session cleanup hatası:`, error);
      }
    }

    // Eski Redis session key'lerini temizle
    const pattern = 'session:*';
    const sessionKeys = await redis.keys(pattern);
    
    let expiredKeys = 0;
    for (const key of sessionKeys) {
      try {
        const ttl = await redis.ttl(key);
        if (ttl <= 0) { // Expire olmuş key'ler
          await redis.del(key);
          expiredKeys++;
        }
      } catch (error) {
        console.error(`Redis key ${key} cleanup hatası:`, error);
      }
    }

    console.log(`✅ Anomaly cleanup tamamlandı: ${cleanedSessions} kullanıcı, ${expiredKeys} expired key temizlendi`);
    
    return {
      success: true,
      cleanedUsers: cleanedSessions,
      expiredKeys: expiredKeys
    };

  } catch (error) {
    console.error('❌ Anomaly cleanup job hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Security log temizleme (90+ gün eski kayıtlar)
 */
async function cleanupSecurityLogs() {
  try {
    console.log('🗂️  Security log cleanup başlatıldı...');
    
    const retentionDays = Number(process.env.SECURITY_LOG_RETENTION_DAYS) || 90;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const result = await prisma.securityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    console.log(`✅ Security log cleanup tamamlandı: ${result.count} eski kayıt silindi`);
    
    return {
      success: true,
      deletedRecords: result.count
    };

  } catch (error) {
    console.error('❌ Security log cleanup hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tüm cleanup işlemlerini çalıştırır
 */
async function runAllCleanupJobs() {
  console.log('🚀 Tüm cleanup jobları başlatılıyor...');
  
  const anomalyResult = await runAnomalyCleanup();
  const securityLogResult = await cleanupSecurityLogs();
  
  return {
    anomalyCleanup: anomalyResult,
    securityLogCleanup: securityLogResult,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  runAnomalyCleanup,
  cleanupSecurityLogs,
  runAllCleanupJobs
};
