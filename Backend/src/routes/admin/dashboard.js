const express = require('express');
const prisma = require('../../lib/prisma');
const { authRequired } = require('../../middlewares/auth');
const { requireAdmin } = require('../../middlewares/rbac');

const router = express.Router();

// Tüm admin route'ları korumalı
router.use(authRequired, requireAdmin);

/**
 * GET /api/admin/dashboard/stats
 * Admin dashboard istatistikleri
 */
router.get('/stats', async (req, res, next) => {
  try {
    // Parallel queries for better performance
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      totalRevenue,
      recentUsers,
      systemHealth
    ] = await Promise.all([
      // Toplam kullanıcı sayısı
      prisma.user.count(),
      
      // Son 24 saatte aktif kullanıcılar (transaction yapanlar)
      prisma.user.count({
        where: {
          transactions: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      }),
      
      // Toplam transaction sayısı
      prisma.transaction.count(),
      
      // Toplam gelir (income transaction'ların toplamı)
      prisma.transaction.aggregate({
        where: { type: 'income' },
        _sum: { amount: true }
      }),
      
      // Son 5 kayıt olan kullanıcı
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              transactions: true
            }
          }
        }
      }),
      
      // Sistem sağlık bilgileri
      getSystemHealth()
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active24h: activeUsers,
        growth: await getUserGrowth()
      },
      transactions: {
        total: totalTransactions,
        revenue: totalRevenue._sum.amount || 0,
        trends: await getTransactionTrends()
      },
      system: systemHealth,
      recent: {
        users: recentUsers
      }
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/user-growth
 * Son 30 günlük kullanıcı artışı
 */
router.get('/user-growth', async (req, res, next) => {
  try {
    const growth = await getUserGrowth(30);
    res.json(growth);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/transaction-trends
 * Transaction trendleri
 */
router.get('/transaction-trends', async (req, res, next) => {
  try {
    const trends = await getTransactionTrends(30);
    res.json(trends);
  } catch (error) {
    next(error);
  }
});

// Helper functions
async function getSystemHealth() {
  const start = Date.now();
  
  try {
    // Database response time test
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - start;
    
    // Active sessions count
    const activeSessions = await prisma.refreshToken.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    return {
      status: 'healthy',
      database: {
        status: 'connected',
        responseTime: dbResponseTime
      },
      sessions: {
        active: activeSessions
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    };
  }
}

async function getUserGrowth(days = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  
  const growth = await prisma.user.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: {
      id: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Günlük gruplayarak dönüştür
  const dailyGrowth = {};
  growth.forEach(item => {
    const date = item.createdAt.toISOString().split('T')[0];
    dailyGrowth[date] = (dailyGrowth[date] || 0) + item._count.id;
  });

  return Object.entries(dailyGrowth).map(([date, count]) => ({
    date,
    count
  }));
}

async function getTransactionTrends(days = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  
  const trends = await prisma.transaction.groupBy({
    by: ['type', 'createdAt'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _sum: {
      amount: true
    },
    _count: {
      id: true
    }
  });

  return trends.map(trend => ({
    type: trend.type,
    date: trend.createdAt.toISOString().split('T')[0],
    amount: trend._sum.amount,
    count: trend._count.id
  }));
}

module.exports = router;
