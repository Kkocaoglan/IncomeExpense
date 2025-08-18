import { useState, useContext } from 'react';
import { Box, Paper, TextField, Button, Typography, Stack, Chip, Snackbar, Alert } from '@mui/material';
import { FinanceContext } from '../contexts/FinanceContext';
import categoriesConfig from '../config/categories.json';

const categories = categoriesConfig.categories;
const synonymToCategory = (() => {
  const map = new Map();
  for (const c of categories) {
    for (const s of c.synonyms) map.set(normalizeTr(s), c);
  }
  return map;
})();

function findCategory(text) {
  const t = normalizeTr(text);
  for (const [syn, cat] of synonymToCategory.entries()) {
    if (t.includes(syn)) return cat;
  }
  return null;
}

function inferTypeWithDict(text) {
  const cat = findCategory(text);
  if (cat) return cat.typeHint === 'income' ? 'income' : 'expense';
  return inferType(text);
}

function inferDescriptionWithDict(text) {
  const cat = findCategory(text);
  if (cat) return cat.label;
  return inferDescription(text);
}

// Basit sorgular: "bugün gider ne kadar", "mutfak ne kadar", "bugün mutfak ne kadar", "toplam gider ne kadar"
function tryAnswerQuery(text, incomes, expenses) {
  const t = normalizeTr(text);
  // Sadece açık sorgularda çalış (ne kadar/toplam/bakiye/net yoksa query değil)
  const isExplicitQuery = t.includes('ne kadar') || t.includes('toplam') || t.includes('bakiye') || t.includes('net');
  if (!isExplicitQuery) return null;

  const period = parsePeriod(text);
  const typeIsExpense = t.includes('gider');
  const typeIsIncome = t.includes('gelir');
  const cat = findCategory(text);
  const wantNet = t.includes('net') || t.includes('bakiye');

  const filterByPeriod = (arr) => arr.filter(x => withinPeriod(x.date, period));
  const sum = (arr) => arr.reduce((s, a) => s + a.amount, 0);

  if (wantNet) {
    const inc = sum(filterByPeriod(incomes));
    const exp = sum(filterByPeriod(expenses));
    return { kind: 'answer', type: 'net', total: inc - exp, period };
  }

  if (typeIsExpense || (cat && cat.typeHint === 'expense') || (!typeIsIncome && !typeIsExpense)) {
    let data = filterByPeriod(expenses);
    if (cat) data = data.filter(x => normalizeTr(x.description).includes(normalizeTr(cat.label)));
    return { kind: 'answer', type: 'expense', total: sum(data), period, category: cat?.label };
  }
  if (typeIsIncome || (cat && cat.typeHint === 'income')) {
    let data = filterByPeriod(incomes);
    if (cat) data = data.filter(x => normalizeTr(x.description).includes(normalizeTr(cat.label)));
    return { kind: 'answer', type: 'income', total: sum(data), period, category: cat?.label };
  }
  return null;
}

function normalizeTr(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function parseAmount(text) {
  // TL önek/sonek ve boşluklu binlik ayraçlarını destekle
  // Önce ayracı olmayan uzun biçimi yakala, sonra binlik ayraçlı biçim
  const regex = /(?:₺\s*)?(\d+(?:[.,]\d{1,2})?|\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?)(?:\s*(?:tl|₺))?/gi;
  let match;
  let best = null;
  let bestVal = 0;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1];
    const normalized = raw.replace(/[.\s]/g, '').replace(',', '.');
    const val = parseFloat(normalized);
    if (!isNaN(val) && val > bestVal) {
      bestVal = val;
      best = val;
    }
  }
  if (best !== null) return best;
  // Fallback: düz rakam yakala
  const simple = text.match(/\d+/g);
  if (simple && simple.length > 0) {
    const val = parseFloat(simple[0]);
    return isNaN(val) ? null : val;
  }
  return null;
}

function toISODate(d) {
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return dd.toISOString();
}

function parseDate(text) {
  const now = new Date();
  const lower = normalizeTr(text);
  if (lower.includes('bugun')) return toISODate(now);
  if (lower.includes('dun')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return toISODate(d);
  }
  if (lower.includes('yarin')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }
  // 'bu ayin 3\'u' veya 'ayin 3 u' gibi varyasyonlar
  const mBuAyin = lower.match(/bu\s+ayin\s*(\d{1,2})\s*(?:'?[a-z]*)?/);
  if (mBuAyin) {
    const day = parseInt(mBuAyin[1], 10);
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    return toISODate(d);
  }
  const mAyin = lower.match(/\bayin\s*(\d{1,2})\s*(?:'?[a-z]*)?/);
  if (mAyin) {
    const day = parseInt(mAyin[1], 10);
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    return toISODate(d);
  }
  const m1 = lower.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m1) {
    const dd = parseInt(m1[1], 10);
    const mm = parseInt(m1[2], 10) - 1;
    let yyyy = parseInt(m1[3], 10);
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(yyyy, mm, dd);
    return toISODate(d);
  }
  const m2 = lower.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    const d = new Date(`${m2[1]}-${m2[2]}-${m2[3]}T00:00:00`);
    return toISODate(d);
  }
  return toISODate(now);
}

function parsePeriod(text) {
  const t = normalizeTr(text);
  if (t.includes('bugun')) return 'today';
  if (t.includes('bu ay')) return 'thisMonth';
  if (t.includes('gecen ay')) return 'lastMonth';
  if (t.includes('bu yil')) return 'thisYear';
  if (t.includes('gecen yil')) return 'lastYear';
  return null;
}

function withinPeriod(iso, period) {
  if (!period) return true;
  const d = new Date(iso);
  const now = new Date();
  const startOfMonth = (y, m) => new Date(y, m, 1);
  const endOfMonth = (y, m) => new Date(y, m + 1, 0, 23, 59, 59, 999);
  const startOfYear = (y) => new Date(y, 0, 1);
  const endOfYear = (y) => new Date(y, 11, 31, 23, 59, 59, 999);
  switch (period) {
    case 'today':
      return d.toDateString() === now.toDateString();
    case 'thisMonth':
      return d >= startOfMonth(now.getFullYear(), now.getMonth()) && d <= endOfMonth(now.getFullYear(), now.getMonth());
    case 'lastMonth': {
      const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d >= startOfMonth(y, m) && d <= endOfMonth(y, m);
    }
    case 'thisYear':
      return d >= startOfYear(now.getFullYear()) && d <= endOfYear(now.getFullYear());
    case 'lastYear':
      return d >= startOfYear(now.getFullYear() - 1) && d <= endOfYear(now.getFullYear() - 1);
    default:
      return true;
  }
}

const incomeKeywords = ['gelir', 'ek gelir', 'ekgelir', 'maas', 'yatirim', 'prim', 'bahsis'];
const expenseKeywords = ['gider', 'kira', 'market', 'fatura', 'alisveris', 'yemek', 'ulasim', 'saglik', 'eglence', 'giyim', 'mutfak', 'beklenmeyen', 'diger'];

function inferType(text) {
  const t = normalizeTr(text);
  if (incomeKeywords.some(k => t.includes(k))) return 'income';
  if (expenseKeywords.some(k => t.includes(k))) return 'expense';
  if (t.includes('gelir')) return 'income';
  if (t.includes('gider')) return 'expense';
  return null;
}

function inferDescription(text) {
  const t = normalizeTr(text);
  const dict = [
    ['maas', 'Maaş'],
    ['kira', 'Kira'],
    ['market', 'Market'],
    ['fatura', 'Fatura'],
    ['ek gelir', 'Ek Gelir'],
    ['ekgelir', 'Ek Gelir'],
    ['yatirim', 'Yatırım'],
    ['yemek', 'Yemek'],
    ['ulasim', 'Ulaşım'],
    ['saglik', 'Sağlık'],
    ['eglence', 'Eğlence'],
    ['giyim', 'Giyim'],
    ['mutfak', 'Mutfak'],
    ['beklenmeyen', 'Beklenmeyen'],
    ['diger', 'Diğer']
  ];
  for (const [k, v] of dict) {
    if (t.includes(k)) return v;
  }
  // Bilinen kategori yoksa metinden sayıları ve tip/para kelimelerini temizle
  const cleaned = text
    .replace(/\d+[,.\s]?\d*/g, '') // sayıları kaldır
    .replace(/₺|\btl\b/gi, '') // para birimini kaldır
    .replace(/\b(gelir|gider|ek|yaz|ekle)\b/gi, '') // tip/fiil kelimeleri
    .replace(/\s+/g, ' ') // fazla boşlukları tek boşluk yap
    .trim();
  // Çok kısa veya boşsa boş döndür (üst akış varsayılan Gelir/Gider'i kullanır)
  if (!cleaned || cleaned.length < 2) return '';
  return cleaned.length <= 40 ? cleaned : cleaned.slice(0, 40);
}

function formatTRY(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
}

const Chatbot = () => {
  const { addIncome, addExpense, deleteIncome, deleteExpense, incomes, expenses } = useContext(FinanceContext);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  // Önizleme/slot-filling durumu
  const [preview, setPreview] = useState(null); // { amount, type, description, date }
  const [lastAction, setLastAction] = useState(null); // { type, id }
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

  const buildPreview = (text) => {
    const amount = parseAmount(text);
    const type = inferTypeWithDict(text);
    const date = parseDate(text);
    const description = inferDescriptionWithDict(text);
    return { amount, type, date, description };
  };

  const handleParse = () => {
    setError('');
    const text = input.trim();
    if (!text) return;
    // Negatif tutarları reddet
    if (/(^|\s)-\s*\d/.test(text)) {
      setError('Negatif tutar kabul edilmez');
      return;
    }
    // Önce sorgu mu diye bak
    const ans = tryAnswerQuery(text, incomes, expenses);
    if (ans) {
      setPreview(null);
      setInput('');
      const label = ans.type === 'expense' ? 'Gider' : ans.type === 'income' ? 'Gelir' : 'Net';
      setSnack({ open: true, message: `${label} toplam: ${formatTRY(ans.total)}`, severity: 'info' });
      return;
    }
    const p = buildPreview(text);
    if (!p.amount || p.amount <= 0) {
      setError('Tutar bulunamadı ya da geçersiz. Örn: 1250 TL');
      return;
    }
    setPreview(p);
  };

  // Hızlı ekleme: amount ve type varsa direkt kaydet, yoksa önizlemeye düş
  const handleQuickAdd = () => {
    setError('');
    const text = input.trim();
    if (!text) return;
    // Negatif tutarları reddet
    if (/(^|\s)-\s*\d/.test(text)) {
      setError('Negatif tutar kabul edilmez');
      return;
    }
    // Önce sorgu mu diye bak
    const ans = tryAnswerQuery(text, incomes, expenses);
    if (ans) {
      setPreview(null);
      setInput('');
      const label = ans.type === 'expense' ? 'Gider' : ans.type === 'income' ? 'Gelir' : 'Net';
      setSnack({ open: true, message: `${label} toplam: ${formatTRY(ans.total)}`, severity: 'info' });
      return;
    }
    const p = buildPreview(text);
    if (!p.amount || p.amount <= 0) {
      setError('Tutar bulunamadı ya da geçersiz. Örn: 1250 TL');
      return;
    }
    if (!p.type) {
      // Tür tespit edilemezse varsayılan: gelir
      p.type = 'income';
    }
    const id = Date.now();
    const tx = {
      id,
      description: (p.description || (p.type === 'income' ? 'Gelir' : 'Gider')).trim(),
      amount: p.amount,
      date: p.date || toISODate(new Date())
    };
    if (p.type === 'income') {
      addIncome(tx);
      setLastAction({ type: 'income', id });
    } else {
      addExpense(tx);
      setLastAction({ type: 'expense', id });
    }
    setInput('');
    setPreview(null);
  };

  const setTypeChip = (t) => setPreview(prev => ({ ...prev, type: t }));
  const setDateChip = (d) => {
    const now = new Date();
    if (d === 'today') return setPreview(prev => ({ ...prev, date: toISODate(now) }));
    if (d === 'yesterday') {
      const dd = new Date(now);
      dd.setDate(dd.getDate() - 1);
      return setPreview(prev => ({ ...prev, date: toISODate(dd) }));
    }
    if (d === 'tomorrow') {
      const dd = new Date(now);
      dd.setDate(dd.getDate() + 1);
      return setPreview(prev => ({ ...prev, date: toISODate(dd) }));
    }
  };

  const handleConfirm = () => {
    if (!preview || !preview.amount || !preview.type) {
      setError('Eksik bilgi: tür ve tutar gerekli');
      return;
    }
    const id = Date.now();
    const tx = {
      id,
      description: (preview.description || (preview.type === 'income' ? 'Gelir' : 'Gider')).trim(),
      amount: preview.amount,
      date: preview.date || toISODate(new Date())
    };
    if (preview.type === 'income') {
      addIncome(tx);
      setLastAction({ type: 'income', id });
    } else {
      addExpense(tx);
      setLastAction({ type: 'expense', id });
    }
    setPreview(null);
    setInput('');
  };

  const handleUndo = () => {
    if (!lastAction) return;
    if (lastAction.type === 'income') deleteIncome(lastAction.id);
    else deleteExpense(lastAction.id);
    setLastAction(null);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
      >
        <Alert onClose={() => setSnack(prev => ({ ...prev, open: false }))} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
      <Typography variant="h6" sx={{ mb: 1 }}>Sohbet ile Ekle (Beta)</Typography>
      {/* Örnek komut çipleri kaldırıldı */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder={'Örn: "50 tl gelir ekle maaş" veya "12500 kira gider yaz dün"'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
        />
        <Button variant="contained" onClick={handleQuickAdd}>Ekle</Button>
      </Box>
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>
      )}

      {preview && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Önizleme</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
            <Chip label={`Tutar: ${formatTRY(preview.amount)}`} />
            <Chip label={`Tarih: ${new Date(preview.date || toISODate(new Date())).toLocaleDateString('tr-TR')}`} />
            <Chip label={`Tür: ${preview.type ? (preview.type === 'income' ? 'Gelir' : 'Gider') : 'Seçilmedi'}`} />
          </Stack>
          {!preview.type && (
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip color="success" variant="outlined" label="Gelir" onClick={() => setTypeChip('income')} />
              <Chip color="error" variant="outlined" label="Gider" onClick={() => setTypeChip('expense')} />
            </Stack>
          )}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip label="Bugün" onClick={() => setDateChip('today')} />
            <Chip label="Dün" onClick={() => setDateChip('yesterday')} />
            <Chip label="Yarın" onClick={() => setDateChip('tomorrow')} />
          </Stack>
          <TextField
            fullWidth
            label="Açıklama"
            value={preview.description || ''}
            onChange={(e) => setPreview(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="Örnek: Maaş, Kira, Market..."
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={!preview.type} onClick={handleConfirm}>Onayla</Button>
            <Button variant="text" onClick={() => setPreview(null)}>İptal</Button>
          </Stack>
        </Box>
      )}

      {lastAction && !preview && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
            Eklendi: {lastAction.type === 'income' ? 'Gelir' : 'Gider'} (Geri alabilirsiniz)
          </Typography>
          <Button size="small" variant="outlined" onClick={handleUndo}>Geri Al</Button>
        </Box>
      )}
    </Paper>
  );
};

export default Chatbot; 