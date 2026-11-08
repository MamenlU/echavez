import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin, requireActionApproval } from '../middleware/auth.js';
import { recordAuditLog } from '../lib/auditService.js';
import { EXPENSE_CATEGORY_DESCRIPTIONS } from '../lib/expenseCategoryDescriptions.js';
import { getOpenShiftForAdmin } from '../lib/cashierShiftService.js';
import { getPhilippineBusinessRanges } from '../lib/businessTime.js';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  getEstimatedNetProfitSummary,
  getExpenseRows,
  normalizeExpenseInput,
  normalizeExpenseRange,
  normalizeVoidReason,
} from '../lib/expenseService.js';

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/meta', (_req, res) => {
  res.json({ categories: EXPENSE_CATEGORIES, category_descriptions: EXPENSE_CATEGORY_DESCRIPTIONS, payment_methods: EXPENSE_PAYMENT_METHODS });
});

router.get('/summary', async (req, res) => {
  try {
    const range = normalizeExpenseRange(req.query);
    res.json({ summary: await getEstimatedNetProfitSummary(pool, range) });
  } catch (error) {
    console.error('Expense summary error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to load expense financial summary.',
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const range = normalizeExpenseRange(req.query);
    const includeVoided = String(req.query.includeVoided ?? 'true').toLowerCase() !== 'false';
    const expenses = await getExpenseRows(pool, { ...range, includeVoided, limit: req.query.limit });
    res.json({ expenses, count: expenses.length });
  } catch (error) {
    console.error('Expense list error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to load expenses.',
    });
  }
});

router.post('/', async (req, res, next) => {
  // Regular non-cash expenses remain a Manager operation. Cash-drawer expense
  // creation requires Super Admin authorization before any database writes.
  if (req.body?.paymentMethod === 'Cash Drawer') {
    return requireActionApproval('cash_drawer_expense')(req, res, () => createExpense(req, res));
  }
  return createExpense(req, res);
});

async function createExpense(req, res) {
  let connection;
  try {
    const input = normalizeExpenseInput(req.body);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let shiftId = null;
    if (input.paymentMethod === 'Cash Drawer') {
      const shift = await getOpenShiftForAdmin(connection, req.user.id, { lock: true });
      if (!shift) {
        throw Object.assign(new Error('Open a Cashier Shift before recording an expense paid from the cash drawer.'), {
          statusCode: 409,
          code: 'CASHIER_SHIFT_REQUIRED',
        });
      }
      const ranges = await getPhilippineBusinessRanges(connection);
      if (input.expenseDate !== ranges.labels.today) {
        throw Object.assign(new Error('Cash Drawer expenses must use today’s Philippine business date so the open shift reconciles correctly.'), {
          statusCode: 400,
          code: 'CASH_DRAWER_EXPENSE_DATE_MISMATCH',
        });
      }
      shiftId = Number(shift.shift_id);
    }

    const [result] = await connection.query(
      `INSERT INTO expenses (
        expense_date, category, description, amount, payment_method,
        reference_number, recorded_by_admin_id, shift_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Recorded')`,
      [
        input.expenseDate,
        input.category,
        input.description,
        input.amount,
        input.paymentMethod,
        input.referenceNumber,
        req.user.id,
        shiftId,
      ]
    );

    await recordAuditLog(connection, {
      adminId: req.user.id, actorRole: req.user.role,
      action: 'expense.create',
      entityType: 'expense',
      entityId: result.insertId,
      summary: `Recorded ${input.category} expense of ₱${input.amount.toFixed(2)}.`,
      after: {
        expense_id: Number(result.insertId),
        expense_date: input.expenseDate,
        category: input.category,
        description: input.description,
        amount: input.amount,
        payment_method: input.paymentMethod,
        reference_number: input.referenceNumber,
        shift_id: shiftId,
        status: 'Recorded', operator_user_id: req.user.id, operator_role: req.user.role,
        approval: req.managerApproval || { status: 'not_required' },
      },
      reason: 'Operating expense recorded.',
    });

    await connection.commit();
    const expenses = await getExpenseRows(pool, { limit: 1000 });
    const expense = expenses.find((row) => row.expense_id === Number(result.insertId)) || null;
    res.status(201).json({ message: 'Expense recorded successfully.', expense });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Create expense error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to record expense.',
    });
  } finally {
    if (connection) connection.release();
  }
}

router.post('/:expenseId/void', requireActionApproval('expense_void'), async (req, res) => {
  let connection;
  try {
    const expenseId = Number(req.params.expenseId);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return res.status(400).json({ error: 'Invalid expense ID.' });
    }
    const reason = normalizeVoidReason(req.body.reason);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT * FROM expenses WHERE expense_id = ? LIMIT 1 FOR UPDATE',
      [expenseId]
    );
    if (!rows.length) throw Object.assign(new Error('Expense not found.'), { statusCode: 404 });
    const expense = rows[0];
    if (expense.status === 'Voided') {
      throw Object.assign(new Error('This expense is already voided.'), { statusCode: 409 });
    }

    if (expense.payment_method === 'Cash Drawer' && expense.shift_id) {
      const [shiftRows] = await connection.query(
        'SELECT shift_id, status FROM cashier_shifts WHERE shift_id = ? LIMIT 1 FOR UPDATE',
        [expense.shift_id]
      );
      if (!shiftRows.length || shiftRows[0].status !== 'Open') {
        throw Object.assign(new Error('A Cash Drawer expense cannot be voided after its Cashier Shift has been closed. The reconciliation snapshot must remain immutable.'), {
          statusCode: 409,
          code: 'CLOSED_SHIFT_EXPENSE_VOID_BLOCKED',
        });
      }
    }

    await connection.query(
      `UPDATE expenses SET
        status = 'Voided',
        voided_by_admin_id = ?,
        void_reason = ?,
        voided_at = NOW()
       WHERE expense_id = ?`,
      [req.user.id, reason, expenseId]
    );

    await recordAuditLog(connection, {
      adminId: req.user.id, actorRole: req.user.role,
      action: 'expense.void',
      entityType: 'expense',
      entityId: expenseId,
      summary: `Voided ${expense.category} expense of ₱${Number(expense.amount).toFixed(2)}.`,
      before: {
        status: 'Recorded',
        expense_date: expense.expense_date,
        category: expense.category,
        description: expense.description,
        amount: Number(expense.amount),
        payment_method: expense.payment_method,
        shift_id: expense.shift_id === null ? null : Number(expense.shift_id),
      },
      after: { status: 'Voided', void_reason: reason, operator_role: req.user.role,
        approval: req.managerApproval || { status: 'not_required' } },
      reason,
    });

    await connection.commit();
    res.json({ message: 'Expense voided successfully.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Void expense error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to void expense.',
    });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
