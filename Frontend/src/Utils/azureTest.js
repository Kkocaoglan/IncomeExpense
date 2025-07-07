export async function analyzeReceiptWithProxy(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:5001/analyze', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Proxy API hatası');
  const result = await response.json();

  console.log('Document Intelligence Response:', result); // Debug için

  // Fiş içeriğini al
  const content = result.analyzeResult?.content || '';
  console.log('Fiş içeriği:', content);

  // Toplam tutarı bul
  let toplam = 0;

  // Farklı toplam formatlarını kontrol et
  const totalPatterns = [
    /TOPLAM\s*:?\s*(\d+[.,]\d+)/i,
    /GENEL\s*TOPLAM\s*:?\s*(\d+[.,]\d+)/i,
    /NET\s*TUTAR\s*:?\s*(\d+[.,]\d+)/i,
    /ÖDENECEK\s*TUTAR\s*:?\s*(\d+[.,]\d+)/i,
    /TUTAR\s*:?\s*(\d+[.,]\d+)/i,
    /\*(\d+[.,]\d+)\s*$/, // Satır sonundaki yıldızlı sayılar
  ];

  // Tüm satırları kontrol et
  const lines = content.split('\n');
  for (const line of lines) {
    // Toplam tutarı bul
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value > toplam) {
          toplam = value;
        }
      }
    }
  }

  // Eğer backend'den gelen total değeri varsa ve bizim bulduğumuzdan farklıysa, backend'deki değeri kullan
  if (result.total && result.total !== toplam) {
    console.log('Backend total değeri kullanılıyor:', result.total);
    toplam = result.total;
  }

  console.log('Hesaplanan değerler:', { toplam });

  return {
    toplam,
    raw: result
  };
}
