import { getSalesFinancialHistory, getFinancialSummaryForRange } from './financialMetrics.js';

const money = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
};

export const EXPENSE_CATEGORIES = [
  'Truck Repairs & Maintenance',
  'Utilities',
  'Delivery & Transportation',
  'Store Supplies',
  'Other Operating Expenses',
];


export function calculateEstimatedNetProfit({ grossProfit, feeRevenue, operatingExpenses }) {
  const gross = money(grossProfit);
  const fees = money(feeRevenue);
  const expenses = money(operatingExpenses);
  const operatingContribution = money(gross + fees);
  return {
    operating_contribution: operatingContribution,
    estimated_net_profit: money(operatingContribution - expenses),
  };
}

export const EXPENSE_PAYMENT_METHODS = [
  'Cash Drawer',
  'Card',
  'GCash',
  'Bank Transfer',
  'Other',
];

export function normalizeExpenseInput(body = {}) {
  const expenseDate = String(body.expenseDate || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim().replace(/\s+/g, ' ');
  const amount = Number(body.amount);
  const paymentMethod = String(body.paymentMethod || '').trim();
  const referenceNumber = String(body.referenceNumber || '').trim().replace(/\s+/g, ' ');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
    throw Object.assign(new Error('Expense date must be a valid YYYY-MM-DD date.'), { statusCode: 400 });
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    throw Object.assign(new Error('Select a valid operating-expense category.'), { statusCode: 400 });
  }
  if (!description || description.length > 255) {
    throw Object.assign(new Error('Expense description is required and must not exceed 255 characters.'), { statusCode: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    throw Object.assign(new Error('Expense amount must be greater than ₱0.00 and within the allowed range.'), { statusCode: 400 });
  }
  if (!EXPENSE_PAYMENT_METHODS.includes(paymentMethod)) {
    throw Object.assign(new Error('Select a valid expense payment method.'), { statusCode: 400 });
  }
  if (referenceNumber.length > 150) {
    throw Object.assign(new Error('Expense reference number must not exceed 150 characters.'), { statusCode: 400 });
  }

  return {
    expenseDate,
    category,
    description,
    amount: money(amount),
    paymentMethod,
    referenceNumber: referenceNumber || null,
  };
}

export function normalizeVoidReason(value) {
  const reason = String(value || '').trim().replace(/\s+/g, ' ');
  if (!reason || reason.length > 500) {
    throw Object.assign(new Error('A void reason is required and must not exceed 500 characters.'), { statusCode: 400 });
  }
  return reason;
}

function normalizeDateBoundary(value, name) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw Object.assign(new Error(`${name} must use YYYY-MM-DD.`), { statusCode: 400 });
  }
  return text;
}

export function normalizeExpenseRange(query = {}) {
  const from = normalizeDateBoundary(query.from, 'From date');
  const to = normalizeDateBoundary(query.to, 'To date');
  if (from && to && from > to) {
    throw Object.assign(new Error('From date cannot be later than To date.'), { statusCode: 400 });
  }
  return { from, to };
}

export async function getExpenseRows(database, { from = null, to = null, includeVoided = true, limit = 500 } = {}) {
  const where = [];
  const params = [];
  if (!includeVoided) where.push("e.status = 'Recorded'");
  if (from) {
    where.push('e.expense_date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('e.expense_date <= ?');
    params.push(to);
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1000);

  const [rows] = await database.query(
    `SELECT
       e.*,
       CONCAT_WS(' ', creator.first_name, creator.last_name) AS recorded_by_name,
       creator.username AS recorded_by_username,
       CONCAT_WS(' ', voider.first_name, voider.last_name) AS voided_by_name,
       voider.username AS voided_by_username
     FROM expenses e
     INNER JOIN users creator ON creator.id = e.recorded_by_admin_id
     LEFT JOIN users voider ON voider.id = e.voided_by_admin_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY e.expense_date DESC, e.expense_id DESC
     LIMIT ${safeLimit}`,
    params
  );

  return rows.map((row) => ({
    ...row,
    expense_id: Number(row.expense_id),
    amount: money(row.amount),
    recorded_by_admin_id: Number(row.recorded_by_admin_id),
    voided_by_admin_id: row.voided_by_admin_id === null ? null : Number(row.voided_by_admin_id),
    shift_id: row.shift_id === null ? null : Number(row.shift_id),
  }));
}

export async function getOperatingExpenseTotal(database, { from = null, to = null } = {}) {
  const where = ["status = 'Recorded'"];
  const params = [];
  if (from) {
    where.push('expense_date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('expense_date <= ?');
    params.push(to);
  }
  const [[row]] = await database.query(
    `SELECT COUNT(*) AS expense_count, COALESCE(SUM(amount), 0) AS operating_expenses
     FROM expenses
     WHERE ${where.join(' AND ')}`,
    params
  );
  return {
    expense_count: Number(row?.expense_count || 0),
    operating_expenses: money(row?.operating_expenses),
  };
}

export async function getEstimatedNetProfitSummary(database, { from = null, to = null } = {}) {
  const financial = from || to
    ? await getFinancialSummaryForRange(database, {
        start: `${from || '1000-01-01'} 00:00:00`,
        end: `${to || '9999-12-31'} 23:59:59`,
      })
    : (await getSalesFinancialHistory(database)).summary;

  const expenses = await getOperatingExpenseTotal(database, { from, to });
  const grossProfit = money(financial.total_gross_profit);
  const feeRevenue = money(financial.total_fee_revenue);
  const calculated = calculateEstimatedNetProfit({
    grossProfit,
    feeRevenue,
    operatingExpenses: expenses.operating_expenses,
  });
  const operatingContribution = calculated.operating_contribution;
  const estimatedNetProfit = calculated.estimated_net_profit;

  return {
    from,
    to,
    gross_profit: grossProfit,
    service_delivery_revenue: feeRevenue,
    operating_contribution: operatingContribution,
    operating_expenses: expenses.operating_expenses,
    expense_count: expenses.expense_count,
    estimated_net_profit: estimatedNetProfit,
    label: 'Estimated Net Profit',
  };
}
