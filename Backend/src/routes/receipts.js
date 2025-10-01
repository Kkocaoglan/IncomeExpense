const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middlewares/auth');
const { parsePaging, parseSort } = require('../lib/paging');
const { z } = require('zod');
const { azureOCRBreaker } = require('../lib/circuitBreaker');
const { isEnabled } = require('../config/flags');

const router = express.Router();

const CreateSchema = z.object({
  fileRef: z.string(),
  ocrJson: z.any(),
  total: z.number().optional(),
  tax: z.number().optional(),
  merchant: z.string().optional(),
  date: z.coerce.date().optional(),
});

// GET /api/receipts
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { skip, take } = parsePaging(req);
    const orderBy = parseSort(req, { createdAt: 'desc' });
    const where = { userId: req.user.id };

    const [rows, total] = await Promise.all([
      prisma.receipt.findMany({ where, orderBy, skip, take }),
      prisma.receipt.count({ where })
    ]);
    res.json({ rows, total });
  } catch (e) { next(e); }
});

// POST /api/receipts (OCR entegrasyonu sonraki adımda)
router.post('/', authRequired, async (req, res, next) => {
  try {
    const body = CreateSchema.parse(req.body);
    const created = await prisma.receipt.create({ data: { ...body, userId: req.user.id } });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

// POST /api/receipts/ocr - OCR endpoint with larger payload limit
router.post('/ocr', authRequired, async (req, res, next) => {
  try {
    const ocrSchema = z.object({
      fileRef: z.string(),
      imageData: z.string().optional(), // Base64 image data
      ocrData: z.any().optional(), // Pre-processed OCR sonuçları
      confidence: z.number().min(0).max(1).optional(),
      processingTime: z.number().optional(),
    });
    
    const body = ocrSchema.parse(req.body);
    
    let ocrResult = body.ocrData;
    
    // Eğer imageData varsa ve Azure OCR etkinse, OCR işlemi yap
    if (body.imageData && isEnabled('ENABLE_AZURE_OCR') && isEnabled('ENABLE_OCR_CIRCUIT_BREAKER')) {
      try {
        // Circuit breaker ile OCR işlemi
        ocrResult = await azureOCRBreaker.fire(body.imageData);
      } catch (error) {
        console.error('OCR processing error:', error);
        return res.status(500).json({
          error: 'ocr_processing_failed',
          message: 'OCR işlemi başarısız oldu'
        });
      }
    }
    
    // OCR verilerini işle ve receipt oluştur
    const receiptData = {
      fileRef: body.fileRef,
      ocrJson: ocrResult,
      total: ocrResult?.total || null,
      tax: ocrResult?.tax || null,
      merchant: ocrResult?.merchant || null,
      date: ocrResult?.date ? new Date(ocrResult.date) : null,
      userId: req.user.id
    };
    
    const created = await prisma.receipt.create({ data: receiptData });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

module.exports = router;
