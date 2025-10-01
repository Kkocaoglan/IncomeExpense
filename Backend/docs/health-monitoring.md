# Sistem Health Monitoring

Bu dokümantasyon, sistemin sağlığını düzenli olarak kontrol etmek için oluşturulan health monitoring sistemini açıklar.

## 🏥 Health Check Sistemi

### Manuel Health Check

```bash
# Basit health check
npm run health

# Detaylı çıktı ile
npm run health:verbose

# JSON formatında
npm run health:json

# JSON formatında kaydet
npm run health:save
```

### Otomatik Health Monitoring

```bash
# Sürekli monitoring başlat (production'da otomatik)
npm run health:schedule

# veya
npm run health:monitor
```

## 📊 Kontrol Edilen Bileşenler

### 1. Database (PostgreSQL)
- **Kontrol**: Bağlantı testi + test query
- **Beklenen**: Başarılı bağlantı ve query sonucu
- **Hata Durumu**: Bağlantı hatası, timeout

### 2. Redis
- **Kontrol**: PING + SET/GET test
- **Beklenen**: PONG response ve başarılı operasyon
- **Hata Durumu**: Bağlantı hatası, timeout

### 3. API Endpoints
- **Kontrol**: `/healthz`, `/readyz`, `/metrics`, `/cors-test`
- **Beklenen**: 200 OK status
- **Hata Durumu**: 4xx/5xx status, timeout

### 4. Security Headers
- **Kontrol**: Gerekli güvenlik header'ları
- **Beklenen**: CSP, X-Frame-Options, X-Content-Type-Options, HSTS
- **Hata Durumu**: Eksik header'lar

### 5. Feature Flags
- **Kontrol**: Feature flag sistemi çalışıyor mu
- **Beklenen**: Flag listesi ve durumları
- **Hata Durumu**: Config yüklenemiyorsa

## ⏰ Otomatik Monitoring

### Production Mode
Sistem production'da çalıştığında otomatik olarak:

- **Her 5 dakikada**: Health check
- **Her gün 09:00**: Günlük özet rapor
- **3 başarısız kontrolden sonra**: Alert

### Development Mode
Development'ta sadece manuel health check mevcut.

## 📈 Raporlama

### Log Dosyaları
```
Backend/logs/
├── health-check-2024-01-15.json         # Günlük health check sonuçları
├── scheduled-health-2024-01-15.jsonl    # Otomatik kontrol logları
└── daily-report-2024-01-15.json         # Günlük özet rapor
```

### Rapor Formatı
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "overall": "healthy",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "details": {}
    },
    "redis": {
      "status": "healthy", 
      "responseTime": 12,
      "details": {}
    }
  },
  "summary": {
    "total_checks": 5,
    "healthy_checks": 5,
    "unhealthy_checks": 0,
    "health_percentage": 100
  }
}
```

### Günlük Rapor
```json
{
  "date": "2024-01-15",
  "total_checks": 288,
  "successful_checks": 287,
  "failed_checks": 1,
  "uptime_percentage": 99.65,
  "last_failure": "2024-01-15T14:25:00.000Z"
}
```

## 🚨 Alert Sistemi

### Alert Koşulları
1. **3 consecutive failures**: Üst üste 3 başarısız health check
2. **Critical component down**: Database/Redis çalışmıyor
3. **Security issue**: Güvenlik header'ları eksik

### Alert Türleri
- **Console Log**: Immediate console output
- **File Log**: JSON log dosyası
- **Email** (gelecek): SMTP ile email bildirimi
- **Slack/Discord** (gelecek): Webhook ile team bildirimi

## 🔧 Konfigürasyon

### Environment Variables
```env
# Health check interval (dakika)
HEALTH_CHECK_INTERVAL=5

# Alert threshold (başarısız kontrol sayısı)
HEALTH_ALERT_THRESHOLD=3

# Log retention (gün)
HEALTH_LOG_RETENTION_DAYS=30

# Email alerts (gelecek)
HEALTH_ALERT_EMAIL=admin@example.com
HEALTH_SMTP_URL=smtp://...

# Slack alerts (gelecek)
HEALTH_SLACK_WEBHOOK=https://hooks.slack.com/...
```

## 📋 Troubleshooting

### Yaygın Sorunlar

#### 1. Database Connection Error
```bash
# Database çalışıyor mu kontrol et
docker ps | grep postgres

# Manual bağlantı testi
npm run health:verbose
```

#### 2. Redis Connection Error
```bash
# Redis çalışıyor mu kontrol et
docker ps | grep redis

# Redis ping testi
docker exec redis-container redis-cli ping
```

#### 3. API Endpoints Unreachable
```bash
# Server çalışıyor mu
curl http://localhost:5001/healthz

# Port açık mı kontrol et
netstat -an | grep 5001
```

### Exit Codes
- **0**: Tüm kontroller başarılı
- **1**: Bir veya daha fazla kontrol başarısız

## 🎯 Best Practices

### 1. Regular Monitoring
- Production'da otomatik monitoring aktif et
- Günlük raporları incele
- Alert'lere hızlı müdahale et

### 2. Log Management
- Log dosyalarını düzenli temizle
- Kritik event'leri backup'la
- Log rotation uygula

### 3. Alert Management
- False positive'leri minimize et
- Alert fatigue'den kaçın
- Escalation prosedürü oluştur

### 4. Performance
- Health check'lerin overhead'ini minimize et
- Timeout değerlerini optimize et
- Critical path'leri öncelikle

## 📞 Emergency Response

### Immediate Actions
1. **Check server status**: `npm run health:verbose`
2. **Review recent logs**: `tail -f logs/scheduled-health-*.jsonl`
3. **Restart services**: Docker containers
4. **Escalate if needed**: Team notification

### Recovery Steps
1. Identify failed component
2. Check component-specific logs
3. Restart/recover component
4. Verify recovery with health check
5. Monitor for stability

---

**Son Güncelleme**: $(date)
**Versiyon**: 1.0.0
**Monitoring Level**: Production Ready
