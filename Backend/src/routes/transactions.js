const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middlewares/auth');
const { parsePaging, parseSort } = require('../lib/paging');

/**
 * @openapi
 * /transactions:
 *   get:
 *     summary: List my transactions
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: date:desc
 *     responses:
 *       '200':
 *         description: Paginated list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rows:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 total:
 *                   type: integer
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [income, expense]
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *           example: TRY
 *         category:
 *           type: string
 *           nullable: true
 *         date:
 *           type: string
 *           format: date-time
 *         merchant:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 */
const router = express.Router();

const TransactionCreateSchema = z.object({
  type: z.enum(['income','expense']),
  amount: z.number().finite(),
  currency: z.string().min(3).max(3),
  category: z.string().optional(),
  date: z.coerce.date(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
const TransactionPatchSchema = TransactionCreateSchema.partial();

// GET /api/transactions
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { from, to, type, category } = req.query;
    const { skip, take } = parsePaging(req);
    const orderBy = parseSort(req, { date: 'desc' });
    const where = { userId: req.user.id };
    if (type) where.type = String(type);
    if (category) where.category = String(category);
    if (from || to) where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({ where, orderBy, skip, take }),
      prisma.transaction.count({ where })
    ]);
    res.json({ rows, total });
  } catch (e) { next(e); }
});

// POST /api/transactions
router.post('/', authRequired, async (req, res, next) => {
  try {
    const bodyWithDefaults = {
      currency: 'TRY',
      date: new Date().toISOString(),
      tags: [],
      ...req.body,
    };
    const parsed = TransactionCreateSchema.parse(bodyWithDefaults);
    const created = await prisma.transaction.create({ data: { ...parsed, userId: req.user.id } });
    res.status(201).json(created);
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: 'validation_error', details: e.issues });
    next(e);
  }
});

// PUT /api/transactions/:id (id+owner guarded)
router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const data = TransactionPatchSchema.parse({ ...req.body });
    const result = await prisma.transaction.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'not_found' });
    const row = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    res.json(row);
  } catch (e) { next(e); }
});

// DELETE /api/transactions/:id (id+owner guarded)
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const out = await prisma.transaction.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    if (out.count === 0) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
