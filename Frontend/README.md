# Income Expenses Tracker

Modern gelir-gider takip uygulaması. React + Vite frontend, Node.js backend ve PostgreSQL veritabanı ile geliştirilmiştir.

## Özellikler

- 💰 Gelir ve gider takibi
- 📊 Görsel raporlar ve grafikler
- 🤖 Doğal dil ile işlem ekleme (Chatbot)
- 📱 Responsive tasarım
- 🔍 Fiş tarama ve OCR analizi
- 💹 Canlı döviz kurları
- 🏦 Yatırım takibi

## Teknolojiler

- **Frontend**: React 18, Vite, Material-UI
- **Backend**: Node.js, Express
- **Veritabanı**: PostgreSQL
- **Container**: Docker & Docker Compose
- **OCR**: Azure Form Recognizer

## Kurulum

### Gereksinimler

- Node.js 18+
- Docker & Docker Compose
- Azure Form Recognizer API Key (OCR için)

### 1. Projeyi Klonlayın

```bash
git clone <repository-url>
cd IncomeExpenses
```

### 2. Environment Dosyalarını Hazırlayın

#### Frontend (.env)
```bash
cd Frontend
cp env.example .env
```

`.env` dosyasını düzenleyin:
```env
# API Configuration
VITE_API_URL=/api

# Development Environment
# VITE_API_URL=http://localhost:5001

# Production Environment  
# VITE_API_URL=https://api.yourdomain.com
```

#### Backend (.env)
```bash
cd Backend
cp .env.example .env
```

`.env` dosyasını düzenleyin:
```env
AZURE_ENDPOINT=your_azure_endpoint
AZURE_API_KEY=your_azure_api_key
PORT=5001
```

### 3. Docker ile Çalıştırma

```bash
# Tüm servisleri başlat
docker-compose -f docker-compose.dev.yml up -d

# Sadece DB'yi ayağa kaldır
docker-compose -f docker-compose.dev.yml up -d postgres

# Sağlık durumu
docker-compose -f docker-compose.dev.yml ps

# Logları takip et
docker-compose -f docker-compose.dev.yml logs -f

# psql ile bağlanma (host makineden)
psql "postgresql://app:app@localhost:5432/income_expense?schema=public"
```

### 4. Geliştirme Modunda Çalıştırma

#### Frontend (Hot Reload)
```bash
cd Frontend
npm install
npm run dev
```

#### Backend
```bash
cd Backend
npm install
npm start
```

## API Yapısı

### Merkezi API Client

Tüm API çağrıları `src/services/apiClient.js` üzerinden yapılır:

```javascript
import apiClient from '../services/apiClient';

// GET request
const data = await apiClient.get('/endpoint');

// POST request
const result = await apiClient.post('/endpoint', { data });

// File upload
const formData = new FormData();
formData.append('file', file);
const uploadResult = await apiClient.postFormData('/upload', formData);
```

### Endpoints

- `POST /api/ocr/analyze` - Fiş analizi (Azure OCR)
- `GET /api/test` - Backend durum kontrolü

## Nginx Konfigürasyonu

Production ortamında Nginx reverse proxy kullanılır:

```nginx
server {
    listen 80;
    server_name localhost;

    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # API requests to backend
    location /api {
        proxy_pass http://backend:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Geliştirme

### Kod Yapısı

```
Frontend/
├── src/
│   ├── components/     # React bileşenleri
│   ├── services/       # API servisleri
│   ├── contexts/       # React Context'ler
│   ├── config/         # Konfigürasyon dosyaları
│   └── Utils/          # Yardımcı fonksiyonlar
├── services/
│   └── apiClient.js    # Merkezi API client
└── env.example         # Environment örneği
```

### Yeni API Endpoint Ekleme

1. Backend'de route tanımla
2. Frontend'de `apiClient` kullanarak çağır
3. Environment değişkenlerini kontrol et

## Production Deployment

### Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
