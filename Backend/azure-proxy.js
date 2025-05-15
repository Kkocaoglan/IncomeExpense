const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');

const app = express();
const upload = multer({ dest: 'uploads/' });

const AZURE_ENDPOINT = 'https://reactocr.cognitiveservices.azure.com/';
const AZURE_API_KEY = '9qd1oZKopZUGpi6SIVo909gIPrRJztPmSwvLPqXj1JMhdKTktMOWJQQJ99BEACYeBjFXJ3w3AAALACOGXt3N';

app.use(cors());

app.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    console.log('Dosya alındı:', req.file);
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);

    console.log("Azure'a gönderilen dosya:", req.file);

    const azureRes = await fetch(
      `${AZURE_ENDPOINT}formrecognizer/documentModels/prebuilt-receipt:analyze?api-version=2023-07-31`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: fileStream,
        duplex: 'half',
      }
    );

    if (!azureRes.ok) {
      console.error('Azure API yanıt hatası:', await azureRes.text());
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: 'Azure API hatası' });
    }

    const operationLocation = azureRes.headers.get('operation-location');
    fs.unlinkSync(filePath);

    // Sonucu almak için poll et
    let result;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': AZURE_API_KEY },
      });
      result = await pollRes.json();
      console.log(`Poll denemesi ${i + 1}:`, result.status);
      if (result.status === 'succeeded') break;
    }

    if (!result || result.status !== 'succeeded') {
      return res.status(500).json({ error: 'Fiş analizi tamamlanamadı' });
    }

    // Ham sonucu logla
    console.log("Azure'dan gelen ham sonuç:", JSON.stringify(result, null, 2));

    // Fiş içeriğini al
    const content = result.analyzeResult?.content || '';
    
    // Toplam tutarı bul
    let total = 0;
    const totalMatch = content.match(/TOPLAM\s*(\d+[.,]\d+)/i);
    if (totalMatch) {
      total = parseFloat(totalMatch[1].replace(',', '.'));
    }

    // Tarih ve saat bilgisini bul
    const dateMatch = content.match(/TARİH:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const timeMatch = content.match(/SAAT\s*:\s*(\d{2}:\d{2}:\d{2})/i);
    
    // Ürünleri bul
    const items = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/\*\d+[.,]\d+$/)) {
        const price = parseFloat(line.replace('*', '').replace(',', '.'));
        const name = lines[i-1]?.trim() || '';
        if (name && !name.match(/TOPLAM|KDV|POSETI/i)) {
          items.push({ name, price });
        }
      }
    }

    const processedResult = {
      total,
      items,
      merchant: 'Grosper Market',
      date: dateMatch ? dateMatch[1] : '',
      time: timeMatch ? timeMatch[1] : '',
      rawResult: result
    };

    console.log("İşlenmiş sonuç:", processedResult);
    res.json(processedResult);
  } catch (err) {
    console.error("Azure API Hatası:", err);
    res.status(500).json({ 
      error: err.message, 
      details: err.response ? err.response.data : null,
      stack: err.stack 
    });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Azure proxy server running on port ${PORT}`));