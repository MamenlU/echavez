import express from 'express';
import pool from '../db.js';
import { authenticateToken, requirePosStaff, requireAdmin, requireActionApproval } from '../middleware/auth.js';
import { recordAuditLog } from '../lib/auditService.js';
import { enrichShiftApprovals } from '../lib/staffActivity.js';
import {
  calculateCashReconciliation,
  getOpenShiftForAdmin,
  getShiftMetrics,
  normalizeCashAmount,
  normalizeShiftNotes,
} from '../lib/cashierShiftService.js';

const router = express.Router();
router.use(authenticateToken, requirePosStaff);

router.get('/current', async (req, res) => {
  try {
    const open = await getOpenShiftForAdmin(pool, req.user.id);
    if (!open) return res.json({ has_open_shift: false, shift: null });
    const shift = await getShiftMetrics(pool, open.shift_id);
    const [identified] = await enrichShiftApprovals(pool, [shift]);
    res.json({ has_open_shift: true, shift: identified });
  } catch (error) {
    console.error('Current cashier shift error:', error);
    res.status(500).json({ error: 'Unable to load the current Cashier Shift.' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit || 50);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const [rows] = await pool.query(
      `SELECT
        cs.shift_id, cs.admin_id, cs.opening_cash, cs.status,
        cs.opened_at, cs.closed_at, cs.pos_transaction_count,
        cs.cash_sales_amount, cs.card_sales_amount, cs.cash_refunds_amount,
        cs.expected_cash, cs.actual_cash, cs.discrepancy, cs.notes,
        CONCAT_WS(' ', u.first_name, u.last_name) AS admin_name,
        u.username AS admin_username,
        u.role AS admin_role
       FROM cashier_shifts cs
       INNER JOIN users u ON u.id = cs.admin_id
       WHERE cs.admin_id = ?
       ORDER BY cs.opened_at DESC, cs.shift_id DESC
       LIMIT ?`,
      [req.user.id, limit]
    );
    const shifts = await enrichShiftApprovals(pool, rows.map(row => ({
      ...row,
      shift_owner_id: Number(row.admin_id),
      shift_owner_name: row.admin_name || row.admin_username || `Staff #${row.admin_id}`,
      shift_owner_role: row.admin_role,
    })));
    res.json({ shifts, count: shifts.length, limit });
  } catch (error) {
    console.error('Cashier shift history error:', error);
    res.status(500).json({ error: 'Unable to load Cashier Shift history.' });
  }
});

// Read-only monitoring for Admin and Super Admin. A Cashier cannot use this API.
// The operator's own current/history/close endpoints remain strictly owner-scoped.
router.get('/staff', requireAdmin, async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit || 50);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const [rows] = await pool.query(
      `SELECT cs.*, u.username AS admin_username,
              CONCAT_WS(' ', u.first_name, u.last_name) AS admin_name,
              u.role AS admin_role,
              COALESCE(s.pos_transaction_count, 0) AS live_pos_count,
              COALESCE(s.cash_sales_amount, 0) AS live_cash_sales,
              COALESCE(s.card_sales_amount, 0) AS live_card_sales,
              COALESCE(r.cash_refunds_amount, 0) AS live_cash_refunds,
              COALESCE(e.cash_expenses_amount, 0) AS live_cash_expenses
       FROM cashier_shifts cs
       INNER JOIN users u ON u.id = cs.admin_id
       LEFT JOIN (
         SELECT shift_id, COUNT(*) AS pos_transaction_count,
           SUM(CASE WHEN LOWER(COALESCE(payment_method, '')) = 'cash' THEN total_amount ELSE 0 END) AS cash_sales_amount,
           SUM(CASE WHEN LOWER(COALESCE(payment_method, '')) = 'card' THEN total_amount ELSE 0 END) AS card_sales_amount
         FROM sales WHERE shift_id IS NOT NULL
           AND sales_source IN ('Onsite POS', 'Online Order') GROUP BY shift_id
       ) s ON s.shift_id = cs.shift_id
       LEFT JOIN (
         SELECT shift_id, SUM(CASE WHEN refund_method = 'Cash' THEN total_refund_amount ELSE 0 END) AS cash_refunds_amount
         FROM sale_adjustments WHERE shift_id IS NOT NULL GROUP BY shift_id
       ) r ON r.shift_id = cs.shift_id
       LEFT JOIN (
         SELECT shift_id, SUM(amount) AS cash_expenses_amount FROM expenses
         WHERE shift_id IS NOT NULL AND status = 'Recorded' AND payment_method = 'Cash Drawer'
         GROUP BY shift_id
       ) e ON e.shift_id = cs.shift_id
       ORDER BY cs.opened_at DESC, cs.shift_id DESC LIMIT ?`,
      [limit]
    );
    const shifts = rows.map(row => {
      const closed = row.status === 'Closed';
      const opening = Number(row.opening_cash || 0);
      const cashSales = Number(closed ? row.cash_sales_amount : row.live_cash_sales) || 0;
      const cardSales = Number(closed ? row.card_sales_amount : row.live_card_sales) || 0;
      const cashRefunds = Number(closed ? row.cash_refunds_amount : row.live_cash_refunds) || 0;
      const cashExpenses = Number(closed ? row.cash_expenses_amount : row.live_cash_expenses) || 0;
      return {
        shift_id: Number(row.shift_id), admin_id: Number(row.admin_id),
        shift_owner_id: Number(row.admin_id),
        shift_owner_name: row.admin_name || row.admin_username || `Staff #${row.admin_id}`,
        shift_owner_role: row.admin_role,
        shift_owner_username: row.admin_username,
        status: row.status, opened_at: row.opened_at, closed_at: row.closed_at,
        opening_cash: opening,
        pos_transaction_count: Number(closed ? row.pos_transaction_count : row.live_pos_count) || 0,
        cash_sales_amount: cashSales, card_sales_amount: cardSales,
        cash_refunds_amount: cashRefunds, cash_expenses_amount: cashExpenses,
        expected_cash: closed && row.expected_cash != null ? Number(row.expected_cash)
          : Number((opening + cashSales - cashRefunds - cashExpenses).toFixed(2)),
        actual_cash: row.actual_cash == null ? null : Number(row.actual_cash),
        discrepancy: row.discrepancy == null ? null : Number(row.discrepancy),
      };
    });
    const identified = await enrichShiftApprovals(pool, shifts);
    res.json({ shifts: identified, count: identified.length, limit });
  } catch (error) {
    console.error('Staff Cashier Shift monitoring error:', error);
    res.status(500).json({ error: 'Unable to load staff Cashier Shift monitoring.' });
  }
});

router.get('/staff/:shiftId', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.shiftId);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid Shift ID.' });
    const shift = await getShiftMetrics(pool, id);
    if (!shift) return res.status(404).json({ error: 'Cashier Shift not found.' });
    const [identified] = await enrichShiftApprovals(pool, [shift]);
    return res.json({ shift: identified });
  } catch (error) {
    console.error('Staff Cashier Shift detail error:', error);
    res.status(500).json({ error: 'Unable to load staff Cashier Shift detail.' });
  }
});

router.get('/:shiftId', async (req, res) => {
  try {
    const shiftId = Number(req.params.shiftId);
    if (!Number.isInteger(shiftId) || shiftId <= 0) {
      return res.status(400).json({ error: 'Invalid Cashier Shift ID.' });
    }
    const shift = await getShiftMetrics(pool, shiftId);
    if (!shift || shift.admin_id !== Number(req.user.id)) {
      return res.status(404).json({ error: 'Cashier Shift not found.' });
    }
    const [identified] = await enrichShiftApprovals(pool, [shift]);
    res.json({ shift: identified });
  } catch (error) {
    console.error('Cashier shift detail error:', error);
    res.status(500).json({ error: 'Unable to load Cashier Shift details.' });
  }
});

router.post('/open', requireActionApproval('shift_open'), async (req, res) => {
  let connection;
  try {
    const openingCash = normalizeCashAmount(req.body.openingCash, 'Opening cash');
    const notes = normalizeShiftNotes(req.body.notes);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock the owner row to serialize concurrent opens across requests/instances.
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.user.id]);
    const existing = await getOpenShiftForAdmin(connection, req.user.id, { lock: true });
    if (existing) {
      throw Object.assign(new Error('You already have an open Cashier Shift.'), {
        statusCode: 409,
        code: 'CASHIER_SHIFT_ALREADY_OPEN',
      });
    }

    const [result] = await connection.query(
      `INSERT INTO cashier_shifts (
        admin_id, opening_cash, status, opened_at, notes
      ) VALUES (?, ?, 'Open', NOW(), ?)`,
      [req.user.id, openingCash, notes]
    );

    await recordAuditLog(connection, {
      adminId: req.user.id, actorRole: req.user.role,
      action: 'cash_shift.open',
      entityType: 'cashier_shift',
      entityId: result.insertId,
      summary: `Opened Cashier Shift #${result.insertId} with ₱${openingCash.toFixed(2)} opening cash.`,
      after: {
        shift_id: Number(result.insertId),
        opening_cash: openingCash,
        status: 'Open', operator_user_id: req.user.id, operator_role: req.user.role,
        approval: req.managerApproval || { status: 'not_required' },
      },
      reason: notes || 'POS cash-drawer opening balance recorded.',
    });

    await connection.commit();
    const shift = await getShiftMetrics(pool, result.insertId);
    return res.status(201).json({ message: 'Cashier Shift opened successfully.', shift });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Open Cashier Shift error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to open Cashier Shift.',
    });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/:shiftId/close', requireActionApproval('shift_close'), async (req, res) => {
  let connection;
  try {
    const shiftId = Number(req.params.shiftId);
    if (!Number.isInteger(shiftId) || shiftId <= 0) {
      return res.status(400).json({ error: 'Invalid Cashier Shift ID.' });
    }
    const actualCash = normalizeCashAmount(req.body.actualCash, 'Actual cash counted');
    const closingNotes = normalizeShiftNotes(req.body.notes);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [shiftRows] = await connection.query(
      `SELECT * FROM cashier_shifts
       WHERE shift_id = ? AND admin_id = ?
       LIMIT 1 FOR UPDATE`,
      [shiftId, req.user.id]
    );
    if (!shiftRows.length) {
      throw Object.assign(new Error('Cashier Shift not found.'), { statusCode: 404 });
    }
    const lockedShift = shiftRows[0];
    if (lockedShift.status !== 'Open') {
      throw Object.assign(new Error('This Cashier Shift is already closed.'), {
        statusCode: 409,
        code: 'CASHIER_SHIFT_ALREADY_CLOSED',
      });
    }

    const metrics = await getShiftMetrics(connection, shiftId);
    const reconciliation = calculateCashReconciliation({
      openingCash: metrics.opening_cash,
      cashSales: metrics.cash_sales_amount,
      cashRefunds: metrics.cash_refunds_amount,
      cashExpenses: metrics.cash_expenses_amount,
      actualCash,
    });

    if (reconciliation.discrepancy !== 0 && !closingNotes) {
      throw Object.assign(new Error('Explain the cash shortage or overage before closing the shift.'), { statusCode: 400 });
    }

    const notes = closingNotes || lockedShift.notes || null;
    await connection.query(
      `UPDATE cashier_shifts SET
        status = 'Closed',
        closed_at = NOW(),
        pos_transaction_count = ?,
        cash_sales_amount = ?,
        card_sales_amount = ?,
        cash_refunds_amount = ?,
        cash_expenses_amount = ?,
        expected_cash = ?,
        actual_cash = ?,
        discrepancy = ?,
        notes = ?
       WHERE shift_id = ?`,
      [
        metrics.pos_transaction_count,
        metrics.cash_sales_amount,
        metrics.card_sales_amount,
        metrics.cash_refunds_amount,
        metrics.cash_expenses_amount,
        reconciliation.expected_cash,
        actualCash,
        reconciliation.discrepancy,
        notes,
        shiftId,
      ]
    );

    await recordAuditLog(connection, {
      adminId: req.user.id, actorRole: req.user.role,
      action: 'cash_shift.close',
      entityType: 'cashier_shift',
      entityId: shiftId,
      summary: reconciliation.discrepancy === 0
        ? `Closed Cashier Shift #${shiftId} balanced exactly.`
        : `Closed Cashier Shift #${shiftId} with ${reconciliation.discrepancy > 0 ? 'overage' : 'shortage'} of ₱${Math.abs(reconciliation.discrepancy).toFixed(2)}.`,
      before: {
        status: 'Open',
        opening_cash: metrics.opening_cash,
        cash_sales_amount: metrics.cash_sales_amount,
        cash_refunds_amount: metrics.cash_refunds_amount,
        cash_expenses_amount: metrics.cash_expenses_amount,
      },
      after: {
        status: 'Closed',
        pos_transaction_count: metrics.pos_transaction_count,
        cash_sales_amount: metrics.cash_sales_amount,
        card_sales_amount: metrics.card_sales_amount,
        cash_refunds_amount: metrics.cash_refunds_amount,
        cash_expenses_amount: metrics.cash_expenses_amount,
        expected_cash: reconciliation.expected_cash,
        actual_cash: actualCash,
        discrepancy: reconciliation.discrepancy,
        operator_role: req.user.role, approval: req.managerApproval || { status: 'not_required' },
        approved_by_manager_id: req.managerApproval?.id || null,
        operator_user_id: req.user.id,
      },
      reason: closingNotes || 'End-of-shift cash reconciliation.',
    });

    await connection.commit();
    const shift = await getShiftMetrics(pool, shiftId);
    return res.json({ message: 'Cashier Shift closed successfully.', shift });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Close Cashier Shift error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to close Cashier Shift.',
    });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
