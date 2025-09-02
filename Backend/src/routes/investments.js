const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middlewares/auth');
const { parsePaging, parseSort } = require('../lib/paging');
const { z } = require('zod');

const router = express.Router();

const CreateSchema = z.object({
  assetType: z.string(),
  amount: z.number().finite(),
  unitPrice: z.number().finite(),
  currency: z.string().min(3).max(3),
  date: z.coerce.date(),
  notes: z.string().optional(),
});
const PatchSchema = CreateSchema.partial();

// GET /api/investments
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { skip, take } = parsePaging(req);
    const orderBy = parseSort(req, { date: 'desc' });
    const where = { userId: req.user.id };

    const [rows, total] = await Promise.all([
      prisma.investment.findMany({ where, orderBy, skip, take }),
      prisma.investment.count({ where })
    ]);
    res.json({ rows, total });
  } catch (e) { next(e); }
});

// POST /api/investments
router.post('/', authRequired, async (req, res, next) => {
  try {
    const body = CreateSchema.parse(req.body);
    const created = await prisma.investment.create({ data: { ...body, userId: req.user.id } });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

// PATCH /api/investments/:id
router.patch('/:id', authRequired, async (req, res, next) => {
  try {
    const data = PatchSchema.parse(req.body);
    const out = await prisma.investment.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data,
    });
    if (out.count === 0) return res.status(404).json({ error: 'not_found' });
    const row = await prisma.investment.findUnique({ where: { id: req.params.id } });
    res.json(row);
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
