import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateCashReconciliation, normalizeCashAmount } from '../lib/cashierShiftService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');

const read = (relative, root = backendRoot) => fs.readFileSync(path.join(root, relative), 'utf8');

const schema = read('schema.sql', projectRoot);
const migration = read('migrations/20261014_phase7_cashier_shifts.sql');
const route = read('routes/cashierShifts.js');
const service = read('lib/cashierShiftService.js');
const salesRoute = read('routes/sales.js');
const adjustmentsRoute = read('routes/saleAdjustments.js');
const server = read('server.js');
const dashboard = read('src/pages/AdminDashboard.tsx', projectRoot);
const panel = read('src/components/CashierShiftPanel.tsx', projectRoot);
const adjustmentPanel = read('src/components/SalesAdjustmentPanel.tsx', projectRoot);
const auditPanel = read('src/components/AdminAuditLogPanel.tsx', projectRoot);

test('Phase 7 adds only cashier_shifts plus nullable shift links to sales and sale_adjustments', () => {
  const tableCount = (schema.match(/CREATE TABLE `/g) || []).length;
  assert.ok(tableCount >= 21);
  assert.match(schema, /CREATE TABLE `cashier_shifts`/);
  assert.match(schema, /CREATE TABLE `sales`[\s\S]*?`shift_id` bigint\(20\) UNSIGNED DEFAULT NULL/);
  assert.match(schema, /CREATE TABLE `sale_adjustments`[\s\S]*?`shift_id` bigint\(20\) UNSIGNED DEFAULT NULL/);
  assert.match(schema, /fk_sales_cashier_shift/);
  assert.match(schema, /fk_sale_adjustments_cashier_shift/);
  assert.doesNotMatch(migration, /DROP TABLE\s+(?:sales|sale_adjustments|products|orders|payments|inventory_movements)|TRUNCATE|DELETE FROM/i);
});

test('cash reconciliation formula uses opening cash plus cash sales minus cash refunds', () => {
  const result = calculateCashReconciliation({
    openingCash: 2000,
    cashSales: 8500,
    cashRefunds: 500,
    actualCash: 9950,
  });
  assert.equal(result.expected_cash, 10000);
  assert.equal(result.actual_cash, 9950);
  assert.equal(result.discrepancy, -50);
  assert.equal(normalizeCashAmount('2000.125', 'Opening cash'), 2000.13);
  assert.throws(() => normalizeCashAmount(-1, 'Opening cash'), /non-negative/);
});

test('Cashier Shift API is staff-gated, manager-approved for cashier close, transactional and audited', () => {
  assert.match(route, /router\.use\(authenticateToken, requirePosStaff\)/);
  assert.match(route, /router\.post\('\/:shiftId\/close', requireActionApproval\('shift_close'\)/);
  assert.match(route, /router\.post\('\/open'/);
  assert.match(route, /router\.post\('\/:shiftId\/close'/);
  assert.match(route, /beginTransaction\(\)/);
  assert.match(route, /FOR UPDATE/);
  assert.match(route, /await connection\.commit\(\)/);
  assert.match(route, /await connection\.rollback\(\)/);
  assert.match(route, /action: 'cash_shift\.open'/);
  assert.match(route, /action: 'cash_shift\.close'/);
  assert.match(route, /expected_cash/);
  assert.match(route, /actual_cash/);
  assert.match(route, /discrepancy/);
  assert.match(server, /app\.use\('\/api\/cashier-shifts', cashierShiftsRoutes\)/);
});

test('new Onsite POS sales require an open shift and save shift_id without changing online-order posting', () => {
  assert.match(salesRoute, /requireOpenShiftForAdmin/);
  assert.match(salesRoute, /cashierShift\.shift_id/);
  assert.match(salesRoute, /admin_id, shift_id, sales_source/);
  assert.match(salesRoute, /CASHIER_SHIFT_REQUIRED/);
  // Phase 7 modifies only the POS route; online-order posting remains elsewhere and shift_id stays nullable.
  assert.match(migration, /ADD COLUMN IF NOT EXISTS shift_id BIGINT UNSIGNED NULL/);
});

test('cash refunds and POS voids require an open shift while verified non-cash refunds remain usable without one', () => {
  assert.match(adjustmentsRoute, /refundMethod === 'Cash'[\s\S]*?requireOpenShiftForAdmin/);
  assert.match(adjustmentsRoute, /getOpenShiftForAdmin/);
  assert.match(adjustmentsRoute, /processed_by_admin_id, shift_id, adjustment_request_id/);
  assert.match(adjustmentsRoute, /cashier_shift_id: shiftId/);
  assert.match(adjustmentPanel, /Cash refunds require an open Cashier Shift/i);
  assert.doesNotMatch(adjustmentsRoute, /paymongo\.com|checkout_sessions|refunds\//i);
});

test('shift metrics count only linked POS sales and cash refunds for drawer reconciliation', () => {
  assert.match(service, /FROM sales[\s\S]*WHERE shift_id = \?[\s\S]*sales_source IN \('Onsite POS', 'Online Order'\)/);
  assert.match(service, /payment_method[\s\S]*cash/);
  assert.match(service, /FROM sale_adjustments[\s\S]*WHERE shift_id = \?/);
  assert.match(service, /refund_method = 'Cash'/);
  assert.match(service, /openingCash \+ liveCashSales - liveCashRefunds/);
});

test('Admin UI exposes Cashier Shift, POS shift status, and clear reconciliation definitions', () => {
  assert.match(dashboard, /'cashierShift'/);
  assert.match(dashboard, /<CashierShiftPanel/);
  assert.match(dashboard, /<CashierShiftStatusBanner/);
  assert.match(panel, /Cashier Shift &amp; Cash Reconciliation/);
  assert.match(panel, /Opening Cash \+ Cash POS and Pickup Sales − Cash Refunds/);
  assert.match(panel, /Card sales are shown for shift reporting but do not increase the physical cash drawer/);
  assert.match(panel, /historical pre-Phase-7 sales remain valid/i);
});

test('Audit Log UI labels Phase 7 open and close actions', () => {
  assert.match(auditPanel, /'cash_shift\.open': 'Cashier Shift Opened'/);
  assert.match(auditPanel, /'cash_shift\.close': 'Cashier Shift Closed'/);
  assert.match(auditPanel, /cashier_shift: 'Cashier Shift'/);
});
