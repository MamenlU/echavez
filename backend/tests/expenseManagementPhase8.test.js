import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateEstimatedNetProfit,
  normalizeExpenseInput,
  normalizeVoidReason,
} from '../lib/expenseService.js';
import { calculateCashReconciliation } from '../lib/cashierShiftService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');
const read = (relative, root = backendRoot) => fs.readFileSync(path.join(root, relative), 'utf8');

const schema = read('schema.sql', projectRoot);
const migration = read('migrations/20261014_phase8_expenses.sql');
const route = read('routes/expenses.js');
const service = read('lib/expenseService.js');
const shiftService = read('lib/cashierShiftService.js');
const server = read('server.js');
const dashboard = read('src/pages/AdminDashboard.tsx', projectRoot);
const panel = read('src/components/ExpenseManagementPanel.tsx', projectRoot);
const cashierPanel = read('src/components/CashierShiftPanel.tsx', projectRoot);
const auditPanel = read('src/components/AdminAuditLogPanel.tsx', projectRoot);

test('Phase 8 reaches the approved 22-table target with only expenses as the new table', () => {
  const tableCount = (schema.match(/CREATE TABLE `/g) || []).length;
  assert.equal(tableCount, 22);
  assert.match(schema, /CREATE TABLE `expenses`/);
  assert.match(schema, /`cash_expenses_amount` decimal\(12,2\) DEFAULT NULL/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS expenses/);
  assert.match(migration, /ALTER TABLE cashier_shifts[\s\S]*cash_expenses_amount/);
  assert.doesNotMatch(migration, /DROP TABLE\s+(?:sales|products|orders|payments|inventory_movements)|TRUNCATE|DELETE FROM/i);
});

test('expense validation accepts controlled operating expenses and rejects invalid values', () => {
  const value = normalizeExpenseInput({
    expenseDate: '2026-10-14',
    category: 'Utilities',
    description: 'Electricity bill',
    amount: '1250.555',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'BILL-001',
  });
  assert.equal(value.amount, 1250.56);
  assert.equal(value.category, 'Utilities');
  assert.throws(() => normalizeExpenseInput({ ...value, category: 'Inventory Purchase' }), /valid operating-expense category/i);
  assert.throws(() => normalizeExpenseInput({ ...value, amount: 0 }), /greater than/i);
  assert.throws(() => normalizeVoidReason(''), /void reason/i);
});

test('estimated net profit uses gross profit plus fees minus operating expenses', () => {
  const result = calculateEstimatedNetProfit({
    grossProfit: 55000,
    feeRevenue: 10000,
    operatingExpenses: 15000,
  });
  assert.equal(result.operating_contribution, 65000);
  assert.equal(result.estimated_net_profit, 50000);
});

test('Cash Drawer expenses reduce expected shift cash without changing sales revenue', () => {
  const result = calculateCashReconciliation({
    openingCash: 2000,
    cashSales: 8500,
    cashRefunds: 500,
    cashExpenses: 750,
    actualCash: 9250,
  });
  assert.equal(result.expected_cash, 9250);
  assert.equal(result.discrepancy, 0);
  assert.match(shiftService, /FROM expenses[\s\S]*payment_method = 'Cash Drawer'/);
  assert.match(shiftService, /openingCash \+ liveCashSales - liveCashRefunds - liveCashExpenses/);
});

test('Expense API is Admin-only, audited, transactional, and protects closed shift snapshots', () => {
  assert.match(route, /router\.use\(authenticateToken, requireAdmin\)/);
  assert.match(route, /beginTransaction\(\)/);
  assert.match(route, /getOpenShiftForAdmin/);
  assert.match(route, /Cash Drawer expenses must use today’s Philippine business date/);
  assert.match(route, /CLOSED_SHIFT_EXPENSE_VOID_BLOCKED/);
  assert.match(route, /action: 'expense\.create'/);
  assert.match(route, /action: 'expense\.void'/);
  assert.match(route, /await connection\.commit\(\)/);
  assert.match(route, /await connection\.rollback\(\)/);
  assert.match(server, /app\.use\('\/api\/expenses', expensesRoutes\)/);
});

test('inventory purchases are explicitly excluded from operating-expense categories and financial estimate', () => {
  assert.doesNotMatch(service, /['"]Inventory Purchase['"]/);
  assert.match(panel, /supplier inventory purchases belong to inventory\/COGS/i);
  assert.match(panel, /must not be recorded again as operating expenses/i);
  assert.match(panel, /Estimated Net Profit = Gross Profit \+ Service\/Delivery Revenue − Recorded Operating Expenses/);
});

test('Admin UI exposes Expense Management and updated Cashier Shift reconciliation', () => {
  assert.match(dashboard, /'expenses'/);
  assert.match(dashboard, /<ExpenseManagementPanel/);
  assert.match(panel, /Store Operating Expenses &amp; Estimated Profitability/);
  assert.match(panel, /Cash Drawer expenses require an open Cashier Shift/i);
  assert.match(cashierPanel, /Cash Drawer Expenses/);
  assert.match(cashierPanel, /Opening Cash \+ Cash POS and Pickup Sales − Cash Refunds − Cash Drawer Expenses/);
});

test('Audit Log UI labels Phase 8 expense actions', () => {
  assert.match(auditPanel, /'expense\.create': 'Expense Recorded'/);
  assert.match(auditPanel, /'expense\.void': 'Expense Voided'/);
  assert.match(auditPanel, /expense: 'Expense'/);
});
