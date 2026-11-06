import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken, requireAdmin);

function parseJsonValue(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const action = String(req.query.action || '').trim();
    const entityType = String(req.query.entity_type || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const requestedLimit = Number(req.query.limit || 150);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 250)
      : 150;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(
        al.summary LIKE ? OR
        al.action LIKE ? OR
        al.entity_type LIKE ? OR
        al.entity_id LIKE ? OR
        CONCAT_WS(' ', u.first_name, u.last_name) LIKE ? OR
        u.username LIKE ?
      )`);
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    if (action) {
      conditions.push('al.action = ?');
      params.push(action);
    }

    if (entityType) {
      conditions.push('al.entity_type = ?');
      params.push(entityType);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      conditions.push('al.created_at >= ?');
      params.push(`${from} 00:00:00`);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      conditions.push('al.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(`${to} 00:00:00`);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
        al.audit_id,
        al.admin_id,
        u.username AS admin_username,
        CONCAT_WS(' ', u.first_name, u.last_name) AS admin_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.summary,
        al.before_data,
        al.after_data,
        al.reason,
        al.created_at
      FROM audit_logs al
      INNER JOIN users u ON u.id = al.admin_id
      ${whereSql}
      ORDER BY al.created_at DESC, al.audit_id DESC
      LIMIT ?`,
      [...params, limit]
    );

    const logs = rows.map((row) => ({
      ...row,
      before_data: parseJsonValue(row.before_data),
      after_data: parseJsonValue(row.after_data),
    }));

    res.json({ logs, count: logs.length, limit });
  } catch (error) {
    console.error('Audit log history error:', error);
    res.status(500).json({ error: 'Unable to load audit logs.' });
  }
});

export default router;
