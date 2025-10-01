# 💰 IncomeExpenses - Gelir Gider Takip Uygulaması

Modern ve güvenli gelir-gider takip uygulaması. React frontend, Node.js backend, PostgreSQL veritabanı ile geliştirilmiş tam stack web uygulaması.

## ✨ Özellikler

### 🔐 Güvenlik & Kimlik Doğrulama
- JWT tabanlı kimlik doğrulama (Access & Refresh Tokens)
- 2FA (Two-Factor Authentication) desteği
- E-posta doğrulama sistemi
- Güçlü şifre politikaları (min 10 karakter, büyük harf, rakam, özel karakter)
- Pepper tabanlı şifre hash'leme
- Rate limiting & brute force koruması
- Session yönetimi ve Sudo mode

### 💰 Finans Yönetimi
- Gelir/gider ekleme, düzenleme, silme
- Kategori bazlı takip (20+ hazır kategori)
- Dashboard özet görünümü
- Tarih bazlı filtreleme
- Grafik ve analizler

### 🏆 Yatırım Takibi (BETA)
- Altın, gümüş, döviz yatırım kayıtları
- Portföy değer hesaplama
- Kar/zarar analizi
- ⚠️ **Not:** Bu özellik aktif geliştirme aşamasındadır

### 📄 Fatura/Fiş Yönetimi (OCR)
- Azure Form Recognizer ile fatura/fiş okuma
- Otomatik veri çıkarma (tutar, tarih, kategori)
- ⚠️ **Not:** OCR modeli LinkedIn'de detaylandırıldığı gibi eğitilmiş olup test aşamasındadır. Model bende olduğu için şu an API paylaşılamıyor.

### 👑 Admin Paneli
- Kullanıcı yönetimi ve rol değiştirme
- Güvenlik logları (filtreleme, export)
- Dashboard istatistikleri
- API dokümantasyonu (Swagger UI)

### 🎨 Diğer Özellikler
- Dark mode / Light mode
- Responsive tasarım
- Health check endpoints
- Prometheus metrics
- Comprehensive logging

## 🛠️ Teknolojiler

### Backend
- Node.js + Express.js
- PostgreSQL + Prisma ORM
- Redis (cache & sessions)
- JWT + bcrypt + pepper
- Swagger/OpenAPI

### Frontend
- React 18 + Vite
- Material-UI (MUI)
- Context API
- React Router
- Axios

### DevOps
- Docker & Docker Compose
- Kubernetes manifests
- Health checks & monitoring

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- PostgreSQL 16+
- Redis 7+
- Docker Desktop (önerilen)

### 📦 Kurulum

#### 1. Repository'yi Klonlayın
```bash
git clone https://github.com/Kkocaoglan/IncomeExpenses.git
cd IncomeExpenses
```

#### 2. Docker ile PostgreSQL ve Redis Başlatın
```bash
# PostgreSQL
docker run -d \
  --name income-expense-db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=app \
  -e POSTGRES_DB=income_expense \
  -p 5432:5432 \
  postgres:16-alpine

# Redis
docker run -d \
  --name ie-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Alternatif (Docker Compose):**
```bash
docker-compose -f docker-compose.dev.yml up -d postgres redis
```

#### 3. Backend Kurulumu
```bash
cd Backend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp env.example .env

# .env dosyasını düzenle
# - DATABASE_URL, REDIS_URL kontrol edin
# - JWT secretları değiştirin (production için)
# - PEPPER değerini değiştirin (production için)

# Veritabanı migration'larını çalıştır
npx prisma migrate dev

# Seed data (test kullanıcıları ve örnek veriler)
npm run prisma:seed

# Backend'i başlat
npm start
```

Backend: `http://localhost:5001`

#### 4. Frontend Kurulumu
Yeni terminal:
```bash
cd Frontend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp env.example .env

# .env içeriği (varsayılan):
# VITE_API_URL=http://localhost:5001/api

# Frontend'i başlat
npm run dev
```

Frontend: `http://localhost:5173`

## 🧪 Test Hesapları

### 👑 Admin Hesabı
```
Email: admin@example.com
Şifre: Admin123456!
```

### 👤 Demo Kullanıcı
```
Email: demo@example.com
Şifre: P@ssw0rd12!
```

### 📧 E-posta Doğrulama (Development)
Development ortamında gerçek e-posta gönderilmez. E-posta doğrulama kodu **backend terminal'inde** görünür:

```bash
# Backend log'larında arayın:
📧 CONSOLE MAIL >> HTML: <strong>123456</strong>
```

## 📖 Kullanım

### Kullanıcı İşlemleri

1. **Kayıt Olma**
   - "Kayıt Ol" → Bilgileri girin → Şifre kurallarına uyun
   - E-posta doğrulama kodu backend terminal'inde görünür
   - Kodu girerek hesabınızı doğrulayın

2. **Gelir/Gider Ekleme**
   - Dashboard → "Yeni İşlem"
   - Tip, miktar, kategori, tarih girin → "Kaydet"

3. **Yatırım Ekleme (BETA)**
   - "Yatırımlar" → "Yeni Yatırım"
   - Tip (Altın, Döviz), miktar, tarih → "Kaydet"

### Admin İşlemleri

1. **Admin Paneline Erişim**
   - Admin hesabıyla giriş → "ADMIN MODE" toggle'ı aktif et

2. **Kullanıcı Yönetimi**
   - Kullanıcı listesi, rol değiştirme, oturum sonlandırma

3. **Güvenlik Logları**
   - Filtreleme, CSV export, log temizleme

## 📊 API Dokümantasyonu

### Swagger UI
Backend başlatıldıktan sonra:
```
http://localhost:5001/docs
```
**Not:** Sadece Admin kullanıcılar erişebilir.

### Health Checks
```bash
# Temel health check
curl http://localhost:5001/healthz

# Readiness probe
curl http://localhost:5001/readyz

# Prometheus metrics
curl http://localhost:5001/metrics
```

## 🔧 Geliştirme

### Backend Scripts
```bash
npm start                 # Production server
npm run dev               # Development server
npm run prisma:studio     # Database GUI
npm run prisma:seed       # Seed database
npm run health            # Health check
```

### Frontend Scripts
```bash
npm run dev               # Development server
npm run build             # Production build
npm run preview           # Preview build
npm run lint              # ESLint check
```

### Veritabanı Yönetimi

**Prisma Studio** (Database GUI):
```bash
cd Backend
npm run prisma:studio
# Browser: http://localhost:5555
```

**Migration oluşturma:**
```bash
npx prisma migrate dev --name migration_name
```

**Database reset** (⚠️ Tüm veriler silinir):
```bash
npx prisma migrate reset
npm run prisma:seed
```

## 🚀 Deployment

### Docker Compose (Production)
```bash
# Build ve başlat
docker-compose -f docker-compose.prod.yml up -d

# Logları görüntüle
docker-compose -f docker-compose.prod.yml logs -f

# Durdur
docker-compose -f docker-compose.prod.yml down
```

### Kubernetes
```bash
# Deploy
kubectl apply -f k8s/

# Durum kontrolü
kubectl get deployments
kubectl get pods
kubectl get services

# Logs
kubectl logs -f deployment/backend
```

### Production Ortam Değişkenleri

**Backend (.env):**
```env
# PRODUCTION İÇİN MUTLAKA DEĞİŞTİRİN!
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
PEPPER=your_pepper_secret_min_32_chars

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# CORS
ALLOWED_ORIGINS=https://yourdomain.com
FRONTEND_ORIGIN=https://yourdomain.com

# Cookie
COOKIE_SECURE=true
COOKIE_DOMAIN=yourdomain.com

# Email (Production)
CONSOLE_MAILER=false
MAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key
```

**Frontend (.env):**
```env
VITE_API_URL=https://api.yourdomain.com/api
```

## 📁 Proje Yapısı

```
IncomeExpenses/
├── Backend/                 # Node.js API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middlewares/    # Security & validation
│   │   ├── lib/            # Utilities
│   │   └── server.js       # Main server
│   ├── prisma/             # Database schema & migrations
│   └── package.json
├── Frontend/                # React App
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # State management
│   │   └── services/       # API client
│   └── package.json
├── Docker/                  # Dockerfiles
├── k8s/                     # Kubernetes manifests
└── README.md
```

## 🐛 Troubleshooting

### Backend başlamıyor
```bash
# PostgreSQL & Redis çalışıyor mu?
docker ps | grep -E "postgres|redis"

# .env var mı?
ls -la Backend/.env

# Migration yapıldı mı?
cd Backend && npx prisma migrate dev
```

### Frontend API'ye bağlanamıyor
```bash
# Backend çalışıyor mu?
curl http://localhost:5001/healthz

# CORS hatası: Backend/.env'de ALLOWED_ORIGINS kontrol et
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 License

Bu proje MIT lisansı altında lisanslanmıştır.

## 👨‍💻 İletişim

- **GitHub:** [github.com/Kkocaoglan](https://github.com/Kkocaoglan)
- **LinkedIn:** [Kayahan Kocaoğlan](https://www.linkedin.com/in/kayahan-kocao%C4%9Flan-9892a51b4/)
- **Email:** kayahankocaoglan@gmail.com

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!

**Son Güncelleme:** Ekim 2025
