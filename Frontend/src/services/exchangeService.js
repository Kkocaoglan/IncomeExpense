import axios from 'axios';

const API_KEY = 'YOUR_API_KEY'; // API anahtarınızı buraya ekleyin
const BASE_URL = 'https://api.collectapi.com/economy';

export const getExchangeRates = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/allGold`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `apikey ${API_KEY}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Döviz kurları alınırken hata oluştu:', error);
    throw error;
  }
};

export const getGoldPrice = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/allGold`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `apikey ${API_KEY}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Altın fiyatları alınırken hata oluştu:', error);
    throw error;
  }
}; 