import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFxToTRY, getGoldGramTRY } from '../services/exchangeService';

const ExchangeRates = () => {
  const { data: usdTry, isLoading: usdLoading, error: usdError } = useQuery({
    queryKey: ['fx', 'USDTRY'],
    queryFn: () => getFxToTRY('USD'),
    refetchInterval: 60000,
  });

  const { data: eurTry, isLoading: eurLoading, error: eurError } = useQuery({
    queryKey: ['fx', 'EURTRY'],
    queryFn: () => getFxToTRY('EUR'),
    refetchInterval: 60000,
  });

  const { data: goldGramTry, isLoading: goldLoading, error: goldError } = useQuery({
    queryKey: ['gold', 'XAU_g_TRY'],
    queryFn: () => getGoldGramTRY(),
    refetchInterval: 60000,
  });

  if (usdLoading || eurLoading || goldLoading) return <div>Yükleniyor...</div>;
  if (usdError || eurError || goldError) return null;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Döviz ve Altın (Gram) - Canlı</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Döviz Kurları</h3>
          <div className="space-y-2">
            <p>USD/TRY: {usdTry?.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}</p>
            <p>EUR/TRY: {eurTry?.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}</p>
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Altın (Gram)</h3>
          <div className="space-y-2">
            <p>Gram Altın (TRY): ₺{(goldGramTry || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRates; 