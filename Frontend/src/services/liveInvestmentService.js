import axios from 'axios';

// Canlı fiyat API'leri
const GOLD_API = 'https://api.metals.live/v1/spot/gold';
const SILVER_API = 'https://api.metals.live/v1/spot/silver';
const FOREX_API = 'https://api.exchangerate.host/latest';

// Cache sistemi
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 saniye

const getCachedPrice = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }
  return null;
};

const setCachedPrice = (key, price) => {
  cache.set(key, { price, timestamp: Date.now() });
};

// Canlı altın fiyatı (gram başına TRY)
export async function getLiveGoldPriceTRY() {
  try {
    const cached = getCachedPrice('gold_try');
    if (cached) return cached;

    console.log('Altın fiyatı alınıyor...');
    
    // Altın fiyatını USD/ounce olarak al
    const response = await axios.get(GOLD_API);
    console.log('Altın API yanıtı:', response.data);
    
    const goldPriceUSD = response.data[0]?.price;
    
    if (!goldPriceUSD) {
      throw new Error('Altın API\'den fiyat alınamadı');
    }

    console.log('USD/TRY kuru alınıyor...');
    
    // USD/TRY kuru
    const usdTryResponse = await axios.get(`${FOREX_API}?base=USD&symbols=TRY`);
    console.log('Döviz API yanıtı:', usdTryResponse.data);
    
    const usdTryRate = usdTryResponse.data.rates.TRY;

    // Gram başına TRY hesapla (1 ounce = 31.1034768 gram)
    const goldPriceTRY = (goldPriceUSD * usdTryRate) / 31.1034768;
    console.log('Hesaplanan altın fiyatı:', goldPriceTRY, 'TRY/gr');
    
    setCachedPrice('gold_try', goldPriceTRY);
    return goldPriceTRY;
  } catch (error) {
    console.error('Altın fiyatı alınamadı:', error);
    if (error.response) {
      console.error('API yanıt hatası:', error.response.status, error.response.data);
    }
    // Fallback: API çalışmadığında hata fırlat
    throw new Error(`Canlı altın fiyatı alınamadı: ${error.message}`);
  }
}

// Canlı gümüş fiyatı (gram başına TRY)
export async function getLiveSilverPriceTRY() {
  try {
    const cached = getCachedPrice('silver_try');
    if (cached) return cached;

    console.log('Gümüş fiyatı alınıyor...');
    
    const response = await axios.get(SILVER_API);
    console.log('Gümüş API yanıtı:', response.data);
    
    const silverPriceUSD = response.data[0]?.price;
    
    if (!silverPriceUSD) {
      throw new Error('Gümüş API\'den fiyat alınamadı');
    }

    console.log('USD/TRY kuru alınıyor (gümüş için)...');
    
    const usdTryResponse = await axios.get(`${FOREX_API}?base=USD&symbols=TRY`);
    const usdTryRate = usdTryResponse.data.rates.TRY;

    const silverPriceTRY = (silverPriceUSD * usdTryRate) / 31.1034768;
    console.log('Hesaplanan gümüş fiyatı:', silverPriceTRY, 'TRY/gr');
    
    setCachedPrice('silver_try', silverPriceTRY);
    return silverPriceTRY;
  } catch (error) {
    console.error('Gümüş fiyatı alınamadı:', error);
    if (error.response) {
      console.error('API yanıt hatası:', error.response.status, error.response.data);
    }
    // Fallback: API çalışmadığında hata fırlat
    throw new Error(`Canlı gümüş fiyatı alınamadı: ${error.message}`);
  }
}

// Canlı döviz kurları
export async function getLiveForexRates() {
  try {
    const cached = getCachedPrice('forex_rates');
    if (cached) return cached;

    console.log('Döviz kurları alınıyor...');
    
    const response = await axios.get(`${FOREX_API}?base=TRY&symbols=USD,EUR,GBP`);
    console.log('Döviz API yanıtı:', response.data);
    
    const rates = response.data.rates;
    
    // TRY bazlı olduğu için tersini al
    const forexRates = {
      USD: 1 / rates.USD,
      EUR: 1 / rates.EUR,
      GBP: 1 / rates.GBP
    };
    
    console.log('Hesaplanan döviz kurları:', forexRates);
    
    setCachedPrice('forex_rates', forexRates);
    return forexRates;
  } catch (error) {
    console.error('Döviz kurları alınamadı:', error);
    if (error.response) {
      console.error('API yanıt hatası:', error.response.status, error.response.data);
    }
    // Fallback: API çalışmadığında hata fırlat
    throw new Error(`Canlı döviz kurları alınamadı: ${error.message}`);
  }
}

// Tüm canlı fiyatları tek seferde al
export async function getAllLivePrices() {
  try {
    const [goldPrice, silverPrice, forexRates] = await Promise.all([
      getLiveGoldPriceTRY(),
      getLiveSilverPriceTRY(),
      getLiveForexRates()
    ]);

    return {
      gold: goldPrice,
      silver: silverPrice,
      forex: forexRates,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Canlı fiyatlar alınamadı:', error);
    
    // API çalışmadığında yaklaşık değerler döndür
    console.log('Fallback değerler kullanılıyor...');
    return {
      gold: 4676, // Yaklaşık altın fiyatı
      silver: 47,  // Yaklaşık gümüş fiyatı
      forex: {
        USD: 41.0,
        EUR: 44.5,
        GBP: 52.0
      },
      timestamp: new Date().toISOString(),
      isFallback: true // Fallback olduğunu belirt
    };
  }
}

// Yatırım değerini hesapla
export function calculateInvestmentValue(investment, livePrices) {
  if (!livePrices) return investment.currentValue || 0;

  let currentPrice = 0;
  
  switch (investment.type) {
    case 'Altın':
      currentPrice = livePrices.gold;
      break;
    case 'Gümüş':
      currentPrice = livePrices.silver;
      break;
    case 'Dolar':
      currentPrice = livePrices.forex.USD;
      break;
    case 'Euro':
      currentPrice = livePrices.forex.EUR;
      break;
    case 'Sterlin':
      currentPrice = livePrices.forex.GBP;
      break;
    default:
      currentPrice = investment.price || 0;
  }

  return investment.amount * currentPrice;
}

// Kar/zarar hesapla
export function calculateProfitLoss(investment, livePrices) {
  const currentValue = calculateInvestmentValue(investment, livePrices);
  const initialValue = investment.amount * (investment.price || 0);
  const profitLoss = currentValue - initialValue;
  const profitLossPercentage = initialValue > 0 ? (profitLoss / initialValue) * 100 : 0;
  
  return {
    profitLoss,
    profitLossPercentage,
    currentValue,
    initialValue
  };
}
