const money = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
};

export function normalizeCashAmount(value, label = 'Amount') {
  const amount = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(amount) || amount < 0) {
    throw Object.assign(new Error(`${label} must be a valid non-negative amount.`), {
      statusCode: 400,
      code: 'INVALID_CASH_AMOUNT',
    });
  }
  if (amount > 100000000) {
    throw Object.assign(new Error(`${label} is too large.`), {
      statusCode: 400,
      code: 'INVALID_CASH_AMOUNT',
    });
  }
  return money(amount);
}

export function normalizeShiftNotes(value) {
  const notes = String(value || '').trim().replace(/\s+/g, ' ');
  if (notes.length > 500) {
    throw Object.assign(new Error('Shift notes must not exceed 500 characters.'), {
      statusCode: 400,
      code: 'SHIFT_NOTES_TOO_LONG',
    });
  }
  return notes || null;
}

export async function getOpenShiftForAdmin(db, adminId, { lock = false } = {}) {
  const suffix = lock ? ' FOR UPDATE' : '';
  const [rows] = await db.query(
    `SELECT
      shift_id, admin_id, opening_cash, status, opened_at, closed_at,
      pos_transaction_count, cash_sales_amount, card_sales_amount,
      cash_refunds_amount, cash_expenses_amount, expected_cash, actual_cash, discrepancy, notes
     FROM cashier_shifts
     WHERE admin_id = ? AND status = 'Open'
     ORDER BY shift_id DESC
     LIMIT 1${suffix}`,
    [adminId]
  );
  return rows[0] || null;
}

export async function getShiftMetrics(db, shiftId) {
  const [shiftRows] = await db.query(
    `SELECT
      cs.*,
      CONCAT_WS(' ', u.first_name, u.last_name) AS admin_name,
      u.username AS admin_username,
      u.role AS admin_role
     FROM cashier_shifts cs
     INNER JOIN users u ON u.id = cs.admin_id
     WHERE cs.shift_id = ?
     LIMIT 1`,
    [shiftId]
  );
  const shift = shiftRows[0];
  if (!shift) return null;

  const [saleRows] = await db.query(
    `SELECT
      COUNT(*) AS pos_transaction_count,
      COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method, '')) = 'cash' THEN total_amount ELSE 0 END), 0) AS cash_sales_amount,
      COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method, '')) = 'card' THEN total_amount ELSE 0 END), 0) AS card_sales_amount,
      COALESCE(SUM(total_amount), 0) AS total_pos_sales_amount
     FROM sales
     WHERE shift_id = ?
       AND sales_source IN ('Onsite POS', 'Online Order')`,
    [shiftId]
  );

  const [refundRows] = await db.query(
    `SELECT
      COUNT(*) AS adjustment_count,
      COALESCE(SUM(CASE WHEN refund_method = 'Cash' THEN total_refund_amount ELSE 0 END), 0) AS cash_refunds_amount,
      COALESCE(SUM(total_refund_amount), 0) AS all_refunds_amount
     FROM sale_adjustments
     WHERE shift_id = ?`,
    [shiftId]
  );

  const [expenseRows] = await db.query(
    `SELECT
      COUNT(*) AS cash_expense_count,
      COALESCE(SUM(amount), 0) AS cash_expenses_amount
     FROM expenses
     WHERE shift_id = ?
       AND status = 'Recorded'
       AND payment_method = 'Cash Drawer'`,
    [shiftId]
  );

  const liveCashSales = money(saleRows[0]?.cash_sales_amount);
  const liveCardSales = money(saleRows[0]?.card_sales_amount);
  const liveCashRefunds = money(refundRows[0]?.cash_refunds_amount);
  const liveCashExpenses = money(expenseRows[0]?.cash_expenses_amount);
  const openingCash = money(shift.opening_cash);
  const liveExpectedCash = money(openingCash + liveCashSales - liveCashRefunds - liveCashExpenses);

  const closed = shift.status === 'Closed';

  return {
    shift_id: Number(shift.shift_id),
    admin_id: Number(shift.admin_id),
    admin_name: shift.admin_name || shift.admin_username || `Staff #${shift.admin_id}`,
    admin_username: shift.admin_username || null,
    admin_role: shift.admin_role || null,
    shift_owner_id: Number(shift.admin_id),
    shift_owner_name: shift.admin_name || shift.admin_username || `Staff #${shift.admin_id}`,
    shift_owner_role: shift.admin_role || null,
    status: shift.status,
    opened_at: shift.opened_at,
    closed_at: shift.closed_at,
    notes: shift.notes || null,
    opening_cash: openingCash,
    pos_transaction_count: closed && shift.pos_transaction_count !== null
      ? Number(shift.pos_transaction_count)
      : Number(saleRows[0]?.pos_transaction_count || 0),
    cash_sales_amount: closed && shift.cash_sales_amount !== null
      ? money(shift.cash_sales_amount)
      : liveCashSales,
    card_sales_amount: closed && shift.card_sales_amount !== null
      ? money(shift.card_sales_amount)
      : liveCardSales,
    cash_refunds_amount: closed && shift.cash_refunds_amount !== null
      ? money(shift.cash_refunds_amount)
      : liveCashRefunds,
    cash_expenses_amount: closed && shift.cash_expenses_amount !== null
      ? money(shift.cash_expenses_amount)
      : liveCashExpenses,
    cash_expense_count: Number(expenseRows[0]?.cash_expense_count || 0),
    expected_cash: closed && shift.expected_cash !== null
      ? money(shift.expected_cash)
      : liveExpectedCash,
    actual_cash: shift.actual_cash === null || shift.actual_cash === undefined
      ? null
      : money(shift.actual_cash),
    discrepancy: shift.discrepancy === null || shift.discrepancy === undefined
      ? null
      : money(shift.discrepancy),
    adjustment_count: Number(refundRows[0]?.adjustment_count || 0),
    total_pos_sales_amount: money(saleRows[0]?.total_pos_sales_amount),
    all_refunds_amount: money(refundRows[0]?.all_refunds_amount),
  };
}

export async function requireOpenShiftForAdmin(db, adminId, { lock = true } = {}) {
  const shift = await getOpenShiftForAdmin(db, adminId, { lock });
  if (!shift) {
    throw Object.assign(
      new Error('Open a Cashier Shift before completing POS sales or cash refunds.'),
      { statusCode: 409, code: 'CASHIER_SHIFT_REQUIRED' }
    );
  }
  return shift;
}

export function calculateCashReconciliation({ openingCash, cashSales, cashRefunds, cashExpenses = 0, actualCash }) {
  const opening = money(openingCash);
  const sales = money(cashSales);
  const refunds = money(cashRefunds);
  const expenses = money(cashExpenses);
  const actual = actualCash === null || actualCash === undefined ? null : money(actualCash);
  const expected = money(opening + sales - refunds - expenses);
  return {
    expected_cash: expected,
    actual_cash: actual,
    discrepancy: actual === null ? null : money(actual - expected),
  };
}
