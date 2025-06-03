require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Environment variables kullan
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;

if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
  console.error('Azure Form Recognizer credentials eksik! Lütfen .env dosyasını kontrol edin.');
  process.exit(1);
}

// Azure Form Recognizer client'ı oluştur
const client = new DocumentAnalysisClient(AZURE_ENDPOINT, new AzureKeyCredential(AZURE_API_KEY));

app.use(cors());
app.use(express.json());

// Türkçe fiş formatlarını tanıma fonksiyonu
function extractReceiptData(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let total = 0;
  let merchant = '';
  let date = '';
  let time = '';
  const items = [];

  // Merchant adını bul (genellikle ilk satırlarda)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].length > 3 && !lines[i].match(/\d{2}\/\d{2}\/\d{4}/) && !lines[i].match(/\d{2}:\d{2}/)) {
      merchant = lines[i];
      break;
    }
  }

  // Tarih ve saat bul
  const dateRegex = /(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/;
  const timeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/;
  
  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    const timeMatch = line.match(timeRegex);
    
    if (dateMatch && !date) date = dateMatch[1];
    if (timeMatch && !time) time = timeMatch[1];
  }

  // Toplam tutarı bul - daha gelişmiş pattern'ler
  const totalPatterns = [
    /(?:GENEL\s*)?TOPLAM\s*:?\s*(\d+(?:[.,]\d{2})?)/i,
    /NET\s*(?:TUTAR|TOPLAM)\s*:?\s*(\d+(?:[.,]\d{2})?)/i,
    /ÖDENECEK\s*(?:TUTAR|TOPLAM)\s*:?\s*(\d+(?:[.,]\d{2})?)/i,
    /ARA\s*TOPLAM\s*:?\s*(\d+(?:[.,]\d{2})?)/i,
    /TUTAR\s*:?\s*(\d+(?:[.,]\d{2})?)/i,
    /TOTAL\s*:?\s*(\d+(?:[.,]\d{2})?)/i
  ];

  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value > total) {
          total = value;
          console.log(`Toplam bulundu: ${total} (satır: ${line})`);
        }
      }
    }
  }

  // Ürünleri çıkar
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Fiyat içeren satırları bul
    const priceMatch = line.match(/(\d+(?:[.,]\d{2})?)(?:\s*TL|\s*₺|\s*\*)?$/);
    if (priceMatch && i > 0) {
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      let productName = lines[i-1];
      
      // Ürün adını temizle
      if (productName && !productName.match(/TOPLAM|KDV|İADE|POSETI|NAKIT|KART/i)) {
        // Miktar bilgisini çıkar
        productName = productName.replace(/\d+\s*(?:X|x|\*)\s*\d+(?:[.,]\d{2})?/, '').trim();
        
        if (productName.length > 2 && price > 0 && price < total) {
          items.push({
            name: productName,
            price: price
          });
        }
      }
    }
  }

  return {
    merchant: merchant || 'Bilinmeyen Market',
    total,
    date,
    time,
    items,
    itemCount: items.length
  };
}

app.post('/analyze', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    console.log('Dosya alındı:', req.file.originalname);
    filePath = req.file.path;

    // Dosyayı stream olarak oku
    const fileStream = fs.createReadStream(filePath);

    console.log('Azure Form Recognizer analizi başlatılıyor...');

    // 1. Önce prebuilt-receipt modelini dene
    let poller;
    try {
      poller = await client.beginAnalyzeDocument("prebuilt-receipt", fileStream);
      console.log('Receipt modeli ile analiz başlatıldı');
    } catch (receiptError) {
      console.log('Receipt modeli başarısız, document modeli deneniyor...');
      // Receipt modeli başarısızsa, genel document modelini kullan
      const newFileStream = fs.createReadStream(filePath);
      poller = await client.beginAnalyzeDocument("prebuilt-document", newFileStream);
      console.log('Document modeli ile analiz başlatıldı');
    }

    // Sonucu bekle
    const result = await poller.pollUntilDone();
    console.log('Azure analizi tamamlandı');

    let processedResult = {};

    // Eğer receipt modeli kullanıldıysa structured data'yı çıkar
    if (result.documents && result.documents.length > 0) {
      const receiptDoc = result.documents[0];
      console.log('Structured receipt data bulundu');
      
      processedResult = {
        merchant: receiptDoc.fields?.MerchantName?.content || 'Bilinmeyen Market',
        total: receiptDoc.fields?.Total?.value || 0,
        date: receiptDoc.fields?.TransactionDate?.content || '',
        time: receiptDoc.fields?.TransactionTime?.content || '',
        items: receiptDoc.fields?.Items?.values?.map(item => ({
          name: item.properties?.Description?.content || 'Bilinmeyen Ürün',
          price: item.properties?.TotalPrice?.value || 0,
          quantity: item.properties?.Quantity?.value || 1
        })) || [],
        confidence: receiptDoc.confidence || 0
      };

      console.log('Structured data:', processedResult);
    }

    // Eğer structured data yoksa veya eksikse, content üzerinden parse et
    const content = result.content || '';
    console.log('Ham fiş içeriği:', content);

    if (!processedResult.total || processedResult.total === 0) {
      console.log('Structured data yetersiz, content parsing yapılıyor...');
      const parsedData = extractReceiptData(content);
      
      // Structured data ile parsed data'yı birleştir
      processedResult = {
        merchant: processedResult.merchant || parsedData.merchant,
        total: processedResult.total || parsedData.total,
        date: processedResult.date || parsedData.date,
        time: processedResult.time || parsedData.time,
        items: processedResult.items?.length > 0 ? processedResult.items : parsedData.items,
        confidence: processedResult.confidence || 0.5,
        method: 'content_parsing'
      };
    } else {
      processedResult.method = 'structured_data';
    }

    // Debug bilgisi
    processedResult.debug = {
      contentLength: content.length,
      linesCount: content.split('\n').length,
      hasStructuredData: result.documents && result.documents.length > 0
    };

    console.log('Final result:', processedResult);

    // Dosyayı temizle
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json(processedResult);

  } catch (error) {
    console.error('Analiz hatası:', error);
    
    // Dosyayı temizle
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({
      error: 'Fiş analizi başarısız',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint'i
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Azure Form Recognizer service çalışıyor',
    endpoint: AZURE_ENDPOINT,
    hasApiKey: !!AZURE_API_KEY 
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Azure Form Recognizer proxy server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/test`);
});