# Gelir-Gider Takip Uygulaması (Income & Expense Tracker)

Bu proje, kullanıcıların kişisel gelir ve giderlerini kolayca takip etmelerini sağlayan, React ve Node.js ile geliştirilmiş tam kapsamlı (full-stack) bir web uygulamasıdır.

![Proje Ekran Görüntüsü](https://github.com/user-attachments/assets/41155b6e-9042-4506-a560-c6022248ad0a)

## ✨ Özellikler

- **Güvenli Kimlik Doğrulama:** JWT (JSON Web Token) tabanlı güvenli kullanıcı kayıt ve giriş sistemi.
- **İşlem Yönetimi:** Yeni gelir veya gider işlemleri ekleme, listeleme ve silme.
- **Anlık Bakiye:** Toplam gelir, toplam gider ve anlık bakiye gösterimi.
- **Veri Görselleştirme:** `recharts` kütüphanesi ile finansal durumun grafiksel özeti.
- **RESTful API:** Node.js/Express ile oluşturulmuş, iyi yapılandırılmış bir backend API'si.

## 🛠️ Kullanılan Teknolojiler

### **Frontend (Client)**

- [React.js](https://reactjs.org/)
- [React Router](https://reactrouter.com/) - Sayfa yönlendirmeleri için
- [Axios](https://axios-http.com/) - API istekleri için
- [Recharts](https://recharts.org/) - Grafikler için

### **Backend (Server)**

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/) - API framework'ü
- [MongoDB](https://www.mongodb.com/) - NoSQL Veritabanı
- [Mongoose](https://mongoosejs.com/) - MongoDB için nesne modelleme
- [JSON Web Token (JWT)](https://jwt.io/) - Yetkilendirme için
- [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js) - Parola şifreleme için
- [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) - Çapraz kaynak istekleri için
- [Dotenv](https://github.com/motdotla/dotenv) - Ortam değişkenleri için

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

### **Gereksinimler**

- [Node.js](https://nodejs.org/en/download/) (v14 veya üstü)
- [MongoDB](https://www.mongodb.com/try/download/community) kurulu ve çalışır durumda olmalı.

### **Kurulum Adımları**

1.  **Depoyu klonlayın:**
    ```bash
    git clone [https://github.com/Kkocaoglan/IncomeExpense.git](https://github.com/Kkocaoglan/IncomeExpense.git)
    cd IncomeExpense
    ```

2.  **Backend'i kurun ve çalıştırın:**
    ```bash
    # Sunucu klasörüne gidin
    cd server

    # Gerekli paketleri yükleyin
    npm install

    # .env dosyasını oluşturun
    # Ana dizinde .env adında bir dosya oluşturun ve aşağıdaki içeriği ekleyin:
    ```
    **.env Dosyası İçeriği:**
    ```
    MONGO_URI=sizin_mongodb_connection_stringiniz
    JWT_SECRET=gizli_bir_anahtar_kelime_yazin
    ```
    ```bash
    # Sunucuyu başlatın
    npm start
    ```
    Sunucu varsayılan olarak `http://localhost:5000` adresinde çalışacaktır.

3.  **Frontend'i kurun ve çalıştırın:**
    ```bash
    # Ayrı bir terminal açın ve projenin ana dizinine gidin
    cd ../client

    # Gerekli paketleri yükleyin
    npm install

    # React uygulamasını başlatın
    npm start
    ```
    Uygulama varsayılan olarak tarayıcınızda `http://localhost:3000` adresinde açılacaktır.

## 📝 Gelecek Planları ve İyileştirmeler

- [ ] İşlemler için kategori ekleme (Fatura, Maaş, Alışveriş vb.).
- [ ] Daha detaylı raporlama ve veri filtreleme özellikleri.
- [ ] ...
