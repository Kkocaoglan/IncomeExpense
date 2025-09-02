const express = require('express');
const { authRequired } = require('../../middlewares/auth.js');
const { requireAdmin } = require('../../middlewares/rbac.js');
const prisma = require('../../lib/prisma.js');

const router = express.Router();

// Güvenlik loglarını listele
router.get('/logs', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', level = '', type = '', dateFrom = '', dateTo = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Filtreleme koşulları
    const where = {};
    
    if (search) {
      where.OR = [
        { event: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (level) {
      where.level = level.toUpperCase();
    }
    
    if (type) {
      where.type = type;
    }
    
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.timestamp.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }
    
    // Güvenlik loglarını getir
    const [logs, total] = await Promise.all([
      prisma.securityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.securityLog.count({ where })
    ]);
    
    const pages = Math.ceil(total / parseInt(limit));
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    next(error);
  }
});

// Güvenlik istatistikleri
router.get('/stats', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [criticalCount, highCount, todayCount, totalCount] = await Promise.all([
      prisma.securityLog.count({
        where: { level: 'CRITICAL' }
      }),
      prisma.securityLog.count({
        where: { level: 'HIGH' }
      }),
      prisma.securityLog.count({
        where: { timestamp: { gte: today } }
      }),
      prisma.securityLog.count()
    ]);
    
    res.json({
      criticalCount,
      highCount,
      todayCount,
      totalCount,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Logları dışa aktar
router.post('/export', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { search = '', level = '', type = '', dateFrom = '', dateTo = '' } = req.body;
    
    // Filtreleme koşulları
    const where = {};
    
    if (search) {
      where.OR = [
        { event: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (level) {
      where.level = level.toUpperCase();
    }
    
    if (type) {
      where.type = type;
    }
    
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.timestamp.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }
    
    const logs = await prisma.securityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    });
    
    // CSV formatında dışa aktar
    const csvHeaders = 'Tarih,Seviye,Tip,Kullanıcı,IP Adresi,Olay,Detay\n';
    const csvRows = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('tr-TR');
      const userEmail = log.userEmail || 'Anonim';
      const ipAddress = log.ipAddress || 'N/A';
      const event = log.event || '';
      const details = (log.details || '').replace(/"/g, '""');
      
      return `"${timestamp}","${log.level}","${log.type}","${userEmail}","${ipAddress}","${event}","${details}"`;
    }).join('\n');
    
    const csv = csvHeaders + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="security-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// Logları temizle
router.delete('/clear', authRequired, requireAdmin, async (req, res, next) => {
  try {
    await prisma.securityLog.deleteMany({});
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
