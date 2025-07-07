import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExchangeRates, getGoldPrice } from '../services/exchangeService';

const ExchangeRates = () => {
  const { data: exchangeData, isLoading: exchangeLoading, error: exchangeError } = useQuery({
    queryKey: ['exchangeRates'],
    queryFn: getExchangeRates,
    refetchInterval: 60000, // Her dakika güncelle
  });

  const { data: goldData, isLoading: goldLoading, error: goldError } = useQuery({
    queryKey: ['goldPrice'],
    queryFn: getGoldPrice,
    refetchInterval: 60000, // Her dakika güncelle
  });

  if (exchangeLoading || goldLoading) return <div>Yükleniyor...</div>;
  if (exchangeError || goldError) return null;

  // Altın fiyatlarını gram cinsinden hesapla (1 troy ounce = 31.1034768 gram)
  const calculateGoldPricePerGram = (price) => {
    return (price / 31.1034768).toFixed(2);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Döviz ve Altın Kurları</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Döviz Kurları</h3>
          {exchangeData && (
            <div className="space-y-2">
              <p>USD/TRY: {exchangeData.rates?.TRY / exchangeData.rates?.USD}</p>
              <p>EUR/TRY: {exchangeData.rates?.TRY}</p>
              <p>Son Güncelleme: {new Date(exchangeData.timestamp * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Altın Fiyatları (Gram)</h3>
          {goldData && (
            <div className="space-y-2">
              <p>Altın/USD: ${calculateGoldPricePerGram(goldData.rates?.USD)}</p>
              <p>Altın/EUR: €{calculateGoldPricePerGram(goldData.rates?.EUR)}</p>
              <p>Altın/TRY: ₺{calculateGoldPricePerGram(goldData.rates?.TRY)}</p>
              <p>Son Güncelleme: {new Date(goldData.timestamp * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExchangeRates; 