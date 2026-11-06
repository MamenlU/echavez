import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { getReorderSuggestions } from '../lib/reorderService.js';

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/', async (_req, res) => {
  try {
    const result = await getReorderSuggestions(pool);
    res.json(result);
  } catch (error) {
    console.error('Reorder suggestions error:', error);
    res.status(500).json({
      error: 'Unable to calculate reorder suggestions right now.',
    });
  }
});

export default router;
