const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middlewares/auth');
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
    const list = await prisma.receipt.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
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
