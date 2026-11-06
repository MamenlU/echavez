import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { recordAuditLog } from '../lib/auditService.js';
import {
  calculateCashReconciliation,
  getOpenShiftForAdmin,
  getShiftMetrics,
  normalizeCashAmount,
  normalizeShiftNotes,
} from '../lib/cashierShiftService.js';

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/current', async (req, res) => {
  try {
    const open = await getOpenShiftForAdmin(pool, req.user.id);
    if (!open) return res.json({ has_open_shift: false, shift: null });
    const shift = await getShiftMetrics(pool, open.shift_id);
    res.json({ has_open_shift: true, shift });
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
        u.username AS admin_username
       FROM cashier_shifts cs
       INNER JOIN users u ON u.id = cs.admin_id
       WHERE cs.admin_id = ?
       ORDER BY cs.opened_at DESC, cs.shift_id DESC
       LIMIT ?`,
      [req.user.id, limit]
    );
    res.json({ shifts: rows, count: rows.length, limit });
  } catch (error) {
    console.error('Cashier shift history error:', error);
    res.status(500).json({ error: 'Unable to load Cashier Shift history.' });
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
    res.json({ shift });
  } catch (error) {
    console.error('Cashier shift detail error:', error);
    res.status(500).json({ error: 'Unable to load Cashier Shift details.' });
  }
});

router.post('/open', async (req, res) => {
  let connection;
  try {
    const openingCash = normalizeCashAmount(req.body.openingCash, 'Opening cash');
    const notes = normalizeShiftNotes(req.body.notes);

    connection = await pool.getConnection();
    await connection.beginTransaction();

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
      adminId: req.user.id,
      action: 'cash_shift.open',
      entityType: 'cashier_shift',
      entityId: result.insertId,
      summary: `Opened Cashier Shift #${result.insertId} with ₱${openingCash.toFixed(2)} opening cash.`,
      after: {
        shift_id: Number(result.insertId),
        opening_cash: openingCash,
        status: 'Open',
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

router.post('/:shiftId/close', async (req, res) => {
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
      adminId: req.user.id,
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
