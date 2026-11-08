import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getAdminAnalytics,
  getPublicPopularProducts,
} from '../lib/analyticsService.js';

export function createAnalyticsRouter({ database = pool } = {}) {
  const router = express.Router();

  router.get('/popular', async (req, res) => {
    try {
      const payload = await getPublicPopularProducts(database, {
        period: req.query.period === 'today' ? 'today' : 'week',
        limit: req.query.limit,
      });
      res.json(payload);
    } catch (error) {
      console.error('Popular products analytics error:', error?.code || error?.name || 'Error');
      res.status(503).json({
        error: 'Popular products are temporarily unavailable.',
        products: [],
      });
    }
  });

  router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
    try {
      res.json(await getAdminAnalytics(database, { adminId: Number(req.user.id) }));
    } catch (error) {
      console.error('Admin analytics error:', error?.code || error?.name || 'Error');
      res.status(503).json({ error: 'Dashboard analytics are temporarily unavailable.' });
    }
  });

  return router;
}

export default createAnalyticsRouter();
