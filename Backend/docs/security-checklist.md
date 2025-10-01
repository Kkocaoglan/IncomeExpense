# Güvenlik Kontrol Listesi

Bu dokümantasyon, IncomeExpenses uygulamasında uygulanan güvenlik önlemlerini ve test adımlarını içerir.

## 🔒 Uygulanan Güvenlik Önlemleri

### 1. Content Security Policy (CSP)
- **Durum**: ✅ Uygulandı
- **Açıklama**: Helmet.js ile CSP header'ları eklendi
- **Özellikler**:
  - `unsafe-inline` kaldırıldı
  - Nonce-based script/style execution
  - Strict source directives
  - Frame ancestors protection

**Test Adımları**:
```bash
# CSP header'ını kontrol et
curl -I http://localhost:5001/healthz

# Beklenen çıktı: content-security-policy header'ı mevcut olmalı
```

### 2. CSRF Koruması
- **Durum**: ✅ Uygulandı
- **Açıklama**: `/auth/refresh` endpoint'i için CSRF koruması
- **Özellikler**:
  - Origin header kontrolü
  - X-Requested-By header zorunluluğu
  - Same-site cookie policy

**Test Adımları**:
```bash
# CSRF koruması testi
curl -X POST http://localhost:5001/api/auth/refresh \
  -H "Origin: http://malicious-site.com" \
  -H "X-Requested-By: malicious"

# Beklenen çıktı: 403 Forbidden
```

### 3. Brute Force Koruması
- **Durum**: ✅ Uygulandı
- **Açıklama**: Redis tabanlı brute force koruması
- **Özellikler**:
  - IP bazlı rate limiting
  - Exponential backoff
  - Account lockout

**Test Adımları**:
```bash
# Brute force testi
for i in {1..6}; do
  curl -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# Beklenen çıktı: 6. denemeden sonra 429 Too Many Requests
```

### 4. Idempotency Koruması
- **Durum**: ✅ Uygulandı
- **Açıklama**: Redis tabanlı idempotency key kontrolü
- **Özellikler**:
  - Duplicate request detection
  - 409 Conflict response
  - TTL-based cleanup

**Test Adımları**:
```bash
# Idempotency testi
IDEMPOTENCY_KEY="test-key-123"
curl -X POST http://localhost:5001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"type":"expense","amount":100,"currency":"TRY"}'

# Aynı key ile tekrar istek
curl -X POST http://localhost:5001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"type":"expense","amount":100,"currency":"TRY"}'

# Beklenen çıktı: 409 Conflict
```

### 5. Admin Güvenliği
- **Durum**: ✅ Uygulandı
- **Açıklama**: Admin rotaları için MFA ve sudo mode
- **Özellikler**:
  - MFA zorunluluğu
  - Sudo mode kritik işlemler için
  - Role-based access control

**Test Adımları**:
```bash
# Admin endpoint'e erişim testi
curl -X GET http://localhost:5001/api/admin/dashboard/stats \
  -H "Authorization: Bearer $USER_TOKEN"

# Beklenen çıktı: 403 Forbidden (admin olmayan kullanıcı)

# Admin token ile erişim
curl -X GET http://localhost:5001/api/admin/dashboard/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Beklenen çıktı: 200 OK
```

### 6. Dosya Yükleme Güvenliği
- **Durum**: ✅ Uygulandı
- **Açıklama**: File upload güvenlik önlemleri
- **Özellikler**:
  - MIME type allowlist
  - File size limits
  - Temporary file cleanup
  - Virus scanning (ClamAV)

**Test Adımları**:
```bash
# Geçersiz dosya türü testi
curl -X POST http://localhost:5001/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@malicious.exe"

# Beklenen çıktı: 400 Bad Request

# Büyük dosya testi
curl -X POST http://localhost:5001/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@large-file.jpg"

# Beklenen çıktı: 413 Payload Too Large
```

### 7. Email Güvenliği
- **Durum**: ✅ Uygulandı
- **Açıklama**: SendGrid/Mailgun entegrasyonu
- **Özellikler**:
  - SPF/DKIM/DMARC records
  - Rate limiting
  - Template-based emails

**Test Adımları**:
```bash
# Email gönderme testi
curl -X POST http://localhost:5001/api/auth/email/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"verification"}'

# Beklenen çıktı: 200 OK veya rate limit
```

### 8. Rate Limiting
- **Durum**: ✅ Uygulandı
- **Açıklama**: Environment-based rate limiting
- **Özellikler**:
  - Endpoint-specific limits
  - Configurable via .env
  - Prometheus metrics

**Test Adımları**:
```bash
# Rate limit testi
for i in {1..10}; do
  curl -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done

# Beklenen çıktı: Rate limit headers ve 429 response
```

### 9. Logging ve Monitoring
- **Durum**: ✅ Uygulandı
- **Açıklama**: Comprehensive logging ve monitoring
- **Özellikler**:
  - Structured logging (Pino)
  - Security event logging
  - Prometheus metrics
  - Request ID tracking

**Test Adımları**:
```bash
# Metrics endpoint testi
curl http://localhost:5001/metrics

# Beklenen çıktı: Prometheus format metrics

# Log dosyalarını kontrol et
ls -la logs/
```

### 10. Database Güvenliği
- **Durum**: ✅ Uygulandı
- **Açıklama**: Database güvenlik önlemleri
- **Özellikler**:
  - Connection pooling
  - Query logging
  - Data encryption
  - Backup encryption

**Test Adımları**:
```bash
# Database connection testi
curl http://localhost:5001/readyz

# Beklenen çıktı: READY
```

## 🧪 Güvenlik Test Senaryoları

### 1. Penetration Testing
```bash
# OWASP ZAP ile otomatik test
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:5001 \
  -r zap-report.html
```

### 2. Load Testing
```bash
# Artillery ile load test
artillery quick --count 100 --num 10 http://localhost:5001/healthz
```

### 3. Security Headers Test
```bash
# Security headers kontrolü
curl -I http://localhost:5001/healthz | grep -E "(x-frame-options|x-content-type|x-xss-protection)"
```

## 📊 Güvenlik Metrikleri

### Prometheus Metrics
- `http_requests_total{status}` - HTTP request sayıları
- `http_request_duration_seconds_bucket` - Response time dağılımı
- `auth_failure_total{type,reason}` - Authentication failure sayıları
- `security_events_total{event_type,severity}` - Security event sayıları

### Log Monitoring
- Failed login attempts
- Suspicious activity patterns
- Rate limit violations
- Admin action logs

## 🔄 Güvenlik Güncellemeleri

### Dependency Updates
```bash
# Güvenlik güncellemelerini kontrol et
npm audit

# Otomatik düzeltme
npm audit fix
```

### Security Patches
- Düzenli dependency güncellemeleri
- Security advisory takibi
- Vulnerability scanning

## 🚨 Incident Response

### Güvenlik Olayı Prosedürü
1. **Tespit**: Monitoring alerts
2. **Değerlendirme**: Severity assessment
3. **Müdahale**: Immediate response
4. **Analiz**: Root cause analysis
5. **İyileştirme**: Prevention measures

### Rollback Prosedürü
```bash
# Son stable version'a dönüş
git checkout stable-release
npm ci
pm2 restart all
```

## ✅ Güvenlik Checklist

- [ ] CSP headers aktif ve doğru yapılandırılmış
- [ ] CSRF koruması çalışıyor
- [ ] Brute force koruması aktif
- [ ] Idempotency kontrolü çalışıyor
- [ ] Admin güvenliği (MFA + sudo) aktif
- [ ] File upload güvenliği çalışıyor
- [ ] Email güvenliği yapılandırılmış
- [ ] Rate limiting aktif
- [ ] Logging ve monitoring çalışıyor
- [ ] Database güvenliği sağlanmış
- [ ] Security headers mevcut
- [ ] Dependency vulnerabilities kontrol edilmiş
- [ ] Backup ve recovery prosedürleri hazır
- [ ] Incident response planı mevcut

## 📞 Güvenlik İletişim

- **Security Team**: security@company.com
- **Emergency**: +90 XXX XXX XX XX
- **Bug Bounty**: security@company.com

---

**Son Güncelleme**: $(date)
**Versiyon**: 1.0.0
**Güvenlik Seviyesi**: High
