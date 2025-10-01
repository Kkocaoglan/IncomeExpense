# 🧪 Güvenlik Testleri Rehberi

Bu dokümantasyon P0 güvenlik iyileştirmelerinin test edilmesi için adım adım rehber içerir.

## 🚀 Ön Hazırlık

### 1. Redis'i Başlatın
```bash
# Standalone Redis (test için)
docker run -d --name test-redis -p 6379:6379 redis:7-alpine

# Redis çalışıyor mu kontrol edin
docker exec test-redis redis-cli ping
# Beklenen çıktı: PONG
```

### 2. Backend'i Başlatın
```bash
cd Backend
npm start
```

### 3. Environment Değişkenleri
Backend/.env dosyasında şunları ayarlayın:
```env
REDIS_URL=redis://localhost:6379
BRUTE_TTL_SEC=300
BRUTE_MAX=10
IDEMPOTENCY_TTL_SEC=60
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_REQUIRED_HEADER=X-Requested-By
CSRF_REQUIRED_VALUE=app
```

## 🔍 Test Senaryoları

### 1. Brute Force Koruması (Redis)

**Hedef:** IP bazında rate limiting çalışıyor mu?

```bash
# 11 başarısız login denemesi (limit: 10)
for i in {1..11}; do
  echo "Deneme $i:"
  curl -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nHTTP: %{http_code}\n\n"
done
```

**Beklenen Sonuç:**
- İlk 10 istek: `401 Unauthorized`
- 11. istek: `429 Too Many Requests`

**Redis'te kontrol:**
```bash
docker exec test-redis redis-cli keys "bf:*"
docker exec test-redis redis-cli get "bf:127.0.0.1:/api/auth/login"
```

---

### 2. Idempotency Koruması (Redis)

**Hedef:** Aynı idempotency key ile duplicate request engelleniyor mu?

```bash
# İlk istek
curl -X POST http://localhost:5001/api/transactions \
  -H "Idempotency-Key: test-123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid" \
  -d '{"amount":100}' \
  -w "\nHTTP: %{http_code}\n"

# Aynı key ile ikinci istek
curl -X POST http://localhost:5001/api/transactions \
  -H "Idempotency-Key: test-123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid" \
  -d '{"amount":100}' \
  -w "\nHTTP: %{http_code}\n"
```

**Beklenen Sonuç:**
- İlk istek: `401 Unauthorized` (auth hatası normal)
- İkinci istek: `409 Conflict` (duplicate request)

**Redis'te kontrol:**
```bash
docker exec test-redis redis-cli keys "idem:*"
```

---

### 3. CSRF Koruması (/api/auth/refresh)

**Hedef:** Sadece allowed origin'lerden ve gerekli header'larla istek kabul ediliyor mu?

#### A) Yanlış Origin
```bash
curl -X POST http://localhost:5001/api/auth/refresh \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -w "\nHTTP: %{http_code}\n"
```
**Beklenen:** `403 Forbidden`

#### B) Origin OK, Header Eksik
```bash
curl -X POST http://localhost:5001/api/auth/refresh \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -w "\nHTTP: %{http_code}\n"
```
**Beklenen:** `403 Forbidden` (X-Requested-By eksik)

#### C) Doğru Origin + Header
```bash
curl -X POST http://localhost:5001/api/auth/refresh \
  -H "Origin: http://localhost:5173" \
  -H "X-Requested-By: app" \
  -H "Content-Type: application/json" \
  -w "\nHTTP: %{http_code}\n"
```
**Beklenen:** `401 Unauthorized` (refresh token eksik, ama CSRF geçti)

---

### 4. CSP (Content Security Policy)

**Hedef:** Nonce tabanlı CSP header'ları düzgün set ediliyor mu?

```bash
# CSP header'ını kontrol et
curl -I http://localhost:5001/api/auth/login | grep -i "content-security-policy"
```

**Beklenen Çıktı Örnegi:**
```
content-security-policy: default-src 'self'; script-src 'self' 'nonce-ABC123...'; style-src 'self' 'nonce-ABC123...'; img-src 'self' data: blob:
```

**Frontend'te Test:**
1. Frontend'i başlatın: `cd Frontend && npm run dev`
2. Browser'da `http://localhost:5173` açın
3. DevTools → Network → Response Headers kontrol edin
4. Console'da CSP violation hatası olmamalı

---

### 5. Mailer Konfigürasyonu

**Test Email Gönderme:**
```bash
# Email verification gönderme testi
curl -X POST http://localhost:5001/api/auth/email/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  -w "\nHTTP: %{http_code}\n"
```

**Console Mailer Test:**
`.env` dosyasında `CONSOLE_MAILER=true` ayarlayıp backend loglarında email çıktısını kontrol edin.

---

## 🤖 Otomatik Test Çalıştırma

### PowerShell (Windows):
```powershell
.\test-security.ps1
```

### Bash (Linux/Mac):
```bash
chmod +x test-security.sh
./test-security.sh
```

## 🐛 Troubleshooting

### Redis Bağlantı Hatası
```bash
# Redis container'ını yeniden başlat
docker stop test-redis
docker rm test-redis
docker run -d --name test-redis -p 6379:6379 redis:7-alpine
```

### Backend Başlamıyor
```bash
# Port kullanımını kontrol et
netstat -an | findstr :5001  # Windows
lsof -i :5001               # Mac/Linux

# Process'i öldür ve yeniden başlat
taskkill /F /IM node.exe    # Windows
pkill -f node               # Mac/Linux
```

### Frontend CSP Hataları
1. Browser cache'i temizle
2. Hard refresh yap (Ctrl+Shift+R)
3. DevTools → Application → Storage → Clear All

## ✅ Test Başarı Kriterleri

- [ ] Brute force: 11. denemede 429 alındı
- [ ] Idempotency: 2. aynı key ile 409 alındı  
- [ ] CSRF: Yanlış origin'de 403 alındı
- [ ] CSRF: Header eksikliğinde 403 alındı
- [ ] CSP: Header'lar nonce ile set ediliyor
- [ ] Redis: Bağlantı çalışıyor ve key'ler oluşuyor
- [ ] Mailer: Provider-based config çalışıyor

Tüm testler geçerse P0 güvenlik iyileştirmeleri başarıyla uygulanmıştır! 🎉
