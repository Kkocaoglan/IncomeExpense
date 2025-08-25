import axios from 'axios';

const FX_BASE = 'https://api.exchangerate.host/latest';
const CONVERT = 'https://api.exchangerate.host/convert';
const HISTORICAL = (dateStr) => `https://api.exchangerate.host/${dateStr}`;

// Basit bellek içi cache (anahtara göre)
const cache = new Map();
const setCache = (key, data, ttlMs) => cache.set(key, { data, until: Date.now() + ttlMs });
const getCache = (key) => {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() > v.until) { cache.delete(key); return null; }
  return v.data;
};

export async function getFxToTRY(symbol = 'USD', ttlSec = 60) {
  const key = `FX_${symbol}_TRY`;
  const c = getCache(key);
  if (c) return c;
  const url = `${FX_BASE}?base=${encodeURIComponent(symbol)}&symbols=TRY`;
  const { data } = await axios.get(url);
  const rate = data?.rates?.TRY;
  if (typeof rate !== 'number') throw new Error('FX rate missing');
  setCache(key, rate, ttlSec * 1000);
  return rate;
}

export async function getGoldGramTRY(ttlSec = 60) {
  const key = `XAU_TRY_GRAM`;
  const cached = getCache(key);
  if (cached) return cached;
  // Yöntem 1: TRY bazında XAU oranını al, tersini al → TRY per ounce, sonra gram
  try {
    const { data } = await axios.get(`${FX_BASE}?base=TRY&symbols=XAU`);
    const xauPerTry = data?.rates?.XAU;
    if (typeof xauPerTry === 'number' && xauPerTry > 0) {
      const tryPerOunce = 1 / xauPerTry;
      const gram = tryPerOunce / 31.1034768;
      setCache(key, gram, ttlSec * 1000);
      return gram;
    }
  } catch (_) {}
  // Yöntem 2: doğrudan XAU -> TRY
  try {
    const { data } = await axios.get(`${CONVERT}?from=XAU&to=TRY&amount=1`);
    const xauTryPerOunce = data?.result;
    if (typeof xauTryPerOunce === 'number' && xauTryPerOunce > 0) {
      const gram = xauTryPerOunce / 31.1034768;
      setCache(key, gram, ttlSec * 1000);
      return gram;
    }
  } catch (_) {}
  // Yöntem 3: XAU->USD ve USD->TRY ile hesapla
  const [{ data: conv }, usdTry] = await Promise.all([
    axios.get(`${CONVERT}?from=XAU&to=USD&amount=1`),
    getFxToTRY('USD', ttlSec)
  ]);
  const xauUsdPerOunce = conv?.result;
  if (typeof xauUsdPerOunce !== 'number' || xauUsdPerOunce <= 0) {
    throw new Error('XAU conversion missing');
  }
  const xauTryPerOunce = xauUsdPerOunce * usdTry;
  const gram = xauTryPerOunce / 31.1034768;
  setCache(key, gram, ttlSec * 1000);
  return gram;
}

export async function getFxToTRYOn(symbol = 'USD', dateStr, ttlSec = 3600) {
  const key = `FX_ON_${symbol}_TRY_${dateStr}`;
  const c = getCache(key);
  if (c) return c;
  const url = `${HISTORICAL(dateStr)}?base=${encodeURIComponent(symbol)}&symbols=TRY`;
  const { data } = await axios.get(url);
  const rate = data?.rates?.TRY;
  if (typeof rate !== 'number') throw new Error('FX historical rate missing');
  setCache(key, rate, ttlSec * 1000);
  return rate;
}

export async function getGoldGramTRYOn(dateStr, ttlSec = 3600) {
  const key = `XAU_TRY_GRAM_ON_${dateStr}`;
  const c = getCache(key);
  if (c) return c;
  // Yöntem 1: TRY bazında XAU oranını al (tarihli), tersini al
  try {
    const { data } = await axios.get(`${HISTORICAL(dateStr)}?base=TRY&symbols=XAU`);
    const xauPerTry = data?.rates?.XAU;
    if (typeof xauPerTry === 'number' && xauPerTry > 0) {
      const tryPerOunce = 1 / xauPerTry;
      const gram = tryPerOunce / 31.1034768;
      setCache(key, gram, ttlSec * 1000);
      return gram;
    }
  } catch (_) {}
  // Yöntem 2: XAU->USD (tarihli) * USD->TRY (tarihli)
  const [xauUsd, usdTry] = await Promise.all([
    axios.get(`${HISTORICAL(dateStr)}?base=XAU&symbols=USD`),
    getFxToTRYOn('USD', dateStr, ttlSec)
  ]);
  const xauUsdPerOunce = xauUsd?.data?.rates?.USD;
  if (typeof xauUsdPerOunce !== 'number' || xauUsdPerOunce <= 0) {
    throw new Error('XAU historical conversion missing');
  }
  const xauTryPerOunce = xauUsdPerOunce * usdTry;
  const gram = xauTryPerOunce / 31.1034768;
  setCache(key, gram, ttlSec * 1000);
  return gram;
} 