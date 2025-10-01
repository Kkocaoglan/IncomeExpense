/**
 * Scheduled Health Check
 * Cron job ile düzenli çalışacak health check
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ScheduledHealthCheck {
  constructor() {
    this.isRunning = false;
    this.lastCheck = null;
    this.alertThreshold = 3; // 3 başarısız kontrolden sonra alert
    this.failureCount = 0;
  }

  async runHealthCheck() {
    if (this.isRunning) {
      console.log('⏳ Health check zaten çalışıyor, atlanıyor...');
      return;
    }

    this.isRunning = true;
    console.log(`🏥 Scheduled health check başlatılıyor: ${new Date().toISOString()}`);

    try {
      const result = await this.executeHealthCheck();
      this.lastCheck = {
        timestamp: new Date().toISOString(),
        success: result.success,
        output: result.output
      };

      if (result.success) {
        this.failureCount = 0;
        console.log('✅ Health check başarılı');
      } else {
        this.failureCount++;
        console.error(`❌ Health check başarısız (${this.failureCount}/${this.alertThreshold})`);
        
        if (this.failureCount >= this.alertThreshold) {
          await this.sendAlert(result.output);
        }
      }

      await this.logResult(this.lastCheck);

    } catch (error) {
      console.error('💥 Health check hatası:', error.message);
      this.failureCount++;
    } finally {
      this.isRunning = false;
    }
  }

  executeHealthCheck() {
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, 'health-check.js');
      exec(`node "${scriptPath}" --json`, (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            output: stderr || error.message
          });
        } else {
          try {
            const result = JSON.parse(stdout);
            resolve({
              success: result.overall === 'healthy',
              output: result
            });
          } catch (parseError) {
            resolve({
              success: false,
              output: `Parse error: ${parseError.message}`
            });
          }
        }
      });
    });
  }

  async logResult(result) {
    try {
      const logsDir = path.join(__dirname, '../logs');
      await fs.mkdir(logsDir, { recursive: true });
      
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(logsDir, `scheduled-health-${date}.jsonl`);
      
      const logEntry = JSON.stringify(result) + '\n';
      await fs.appendFile(logFile, logEntry);
      
    } catch (error) {
      console.error('Log yazma hatası:', error.message);
    }
  }

  async sendAlert(failureData) {
    console.log('🚨 HEALTH CHECK ALERT! 🚨');
    console.log(`Sistem ${this.failureCount} kez health check'te başarısız oldu`);
    console.log('Failure details:', JSON.stringify(failureData, null, 2));
    
    // Burada email/Slack/Discord bildirimi gönderilebilir
    // await this.sendEmailAlert(failureData);
    // await this.sendSlackAlert(failureData);
  }

  start() {
    console.log('📅 Scheduled health check başlatılıyor...');
    
    // Her 5 dakikada bir kontrol et
    cron.schedule('*/5 * * * *', () => {
      this.runHealthCheck();
    }, {
      timezone: 'UTC'
    });

    // Günlük özet rapor (her gün 09:00)
    cron.schedule('0 9 * * *', () => {
      this.generateDailyReport();
    }, {
      timezone: 'UTC'
    });

    console.log('✅ Health check scheduler aktif:');
    console.log('   - Health check: Her 5 dakika');
    console.log('   - Daily report: Her gün 09:00 UTC');

    // İlk kontrolü hemen çalıştır
    setTimeout(() => this.runHealthCheck(), 1000);
  }

  async generateDailyReport() {
    try {
      console.log('📊 Günlük health check raporu oluşturuluyor...');
      
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(__dirname, '../logs', `scheduled-health-${date}.jsonl`);
      
      try {
        const logContent = await fs.readFile(logFile, 'utf8');
        const entries = logContent.trim().split('\n').map(line => JSON.parse(line));
        
        const total = entries.length;
        const successful = entries.filter(entry => entry.success).length;
        const failed = total - successful;
        const uptime = total > 0 ? ((successful / total) * 100).toFixed(2) : 0;
        
        const report = {
          date,
          total_checks: total,
          successful_checks: successful,
          failed_checks: failed,
          uptime_percentage: parseFloat(uptime),
          last_failure: entries.filter(e => !e.success).pop()?.timestamp || null
        };
        
        console.log('📈 Günlük Health Report:', JSON.stringify(report, null, 2));
        
        // Raporu kaydet
        const reportFile = path.join(__dirname, '../logs', `daily-report-${date}.json`);
        await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
        
      } catch (error) {
        console.log('⚠️ Bugün için health check logu bulunamadı');
      }
      
    } catch (error) {
      console.error('Günlük rapor oluşturma hatası:', error.message);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      failureCount: this.failureCount,
      alertThreshold: this.alertThreshold
    };
  }
}

// Eğer direkt çalıştırılıyorsa scheduler'ı başlat
if (require.main === module) {
  const scheduler = new ScheduledHealthCheck();
  scheduler.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Scheduled health check kapatılıyor...');
    process.exit(0);
  });
}

module.exports = ScheduledHealthCheck;
