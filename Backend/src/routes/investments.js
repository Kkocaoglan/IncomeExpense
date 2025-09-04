const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middlewares/auth');
const { parsePaging, parseSort } = require('../lib/paging');
const { z } = require('zod');

const router = express.Router();

const CreateSchema = z.object({
  type: z.string(), // Altın, Gümüş, Dolar, Euro, Sterlin
  amount: z.number().finite().positive(),
  price: z.number().finite().positive(), // Birim fiyat
  purchaseDate: z.coerce.date().optional(),
  date: z.coerce.date().optional(), // Geriye uyumluluk için
  notes: z.string().optional(),
});

const PatchSchema = CreateSchema.partial();

// GET /api/investments
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { skip, take } = parsePaging(req);
    const orderBy = parseSort(req, { purchaseDate: 'desc', date: 'desc' });
    const where = { userId: req.user.id };

    const [rows, total] = await Promise.all([
      prisma.investment.findMany({ where, orderBy, skip, take }),
      prisma.investment.count({ where })
    ]);

    // Veri formatını normalize et
    const normalizedRows = rows.map(row => ({
      id: row.id,
      type: row.assetType || row.type || 'Altın',
      amount: row.amount,
      price: row.unitPrice || row.price || 0,
      purchaseDate: row.purchaseDate || row.date,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    res.json({ rows: normalizedRows, total });
  } catch (e) { next(e); }
});

// POST /api/investments
router.post('/', authRequired, async (req, res, next) => {
  try {
    const body = CreateSchema.parse(req.body);
    
    // Veri formatını normalize et
    const investmentData = {
      assetType: body.type,
      amount: body.amount,
      unitPrice: body.price,
      currency: 'TRY', // Varsayılan TRY
      date: body.purchaseDate || body.date || new Date(),
      notes: body.notes,
      userId: req.user.id
    };

    const created = await prisma.investment.create({ data: investmentData });
    
    // Response'u normalize et
    const normalizedResponse = {
      id: created.id,
      type: created.assetType,
      amount: created.amount,
      price: created.unitPrice,
      purchaseDate: created.date,
      notes: created.notes,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };

    res.status(201).json(normalizedResponse);
  } catch (e) { next(e); }
});

// PATCH /api/investments/:id
router.patch('/:id', authRequired, async (req, res, next) => {
  try {
    const data = PatchSchema.parse(req.body);
    
    // Veri formatını normalize et
    const updateData = {};
    if (data.type) updateData.assetType = data.type;
    if (data.amount) updateData.amount = data.amount;
    if (data.price) updateData.unitPrice = data.price;
    if (data.purchaseDate) updateData.date = data.purchaseDate;
    if (data.date) updateData.date = data.date;
    if (data.notes) updateData.notes = data.notes;

    const out = await prisma.investment.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: updateData,
    });
    
    if (out.count === 0) return res.status(404).json({ error: 'not_found' });
    
    const row = await prisma.investment.findUnique({ where: { id: req.params.id } });
    
    // Response'u normalize et
    const normalizedResponse = {
      id: row.id,
      type: row.assetType,
      amount: row.amount,
      price: row.unitPrice,
      purchaseDate: row.date,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    res.json(normalizedResponse);
  } catch (e) { next(e); }
});

// DELETE /api/investments/:id
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const out = await prisma.investment.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    if (out.count === 0) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
