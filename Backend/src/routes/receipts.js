const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middlewares/auth');
const { parsePaging, parseSort } = require('../lib/paging');
const { z } = require('zod');

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

module.exports = router;
