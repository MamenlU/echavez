import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateReturnLine,
  normalizeRefundMethod,
  requiresExternalRefundConfirmation,
} from '../lib/saleAdjustmentService.js';
import { summarizeFinancialRows } from '../lib/financialMetrics.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');

const schema = fs.readFileSync(path.join(projectRoot, 'schema.sql'), 'utf8');
const migration = fs.readFileSync(path.join(backendRoot, 'migrations', '20261014_phase4_sale_adjustments.sql'), 'utf8');
const route = fs.readFileSync(path.join(backendRoot, 'routes', 'saleAdjustments.js'), 'utf8');
const inventoryRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'inventory.js'), 'utf8');
const financialSource = fs.readFileSync(path.join(backendRoot, 'lib', 'financialMetrics.js'), 'utf8');
const analyticsSource = fs.readFileSync(path.join(backendRoot, 'lib', 'analyticsService.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(backendRoot, 'server.js'), 'utf8');
const dashboardSource = fs.readFileSync(path.join(projectRoot, 'src', 'pages', 'AdminDashboard.tsx'), 'utf8');
const adjustmentPanel = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'SalesAdjustmentPanel.tsx'), 'utf8');
const auditPanel = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'AdminAuditLogPanel.tsx'), 'utf8');

test('Phase 4 adds only the two approved sale-adjustment tables and one inventory link column', () => {
  const tableCount = (schema.match(/CREATE TABLE `/g) || []).length;
  assert.ok(tableCount >= 18);
  assert.match(schema, /CREATE TABLE `sale_adjustments`/);
  assert.match(schema, /CREATE TABLE `sale_adjustment_items`/);
  assert.match(schema, /`sale_adjustment_item_id` bigint\(20\) UNSIGNED DEFAULT NULL/);
  assert.match(schema, /uq_sale_adjustment_request/);
  assert.match(schema, /uq_inventory_sale_adjustment_item/);
  assert.match(schema, /fk_inventory_sale_adjustment_item/);
  assert.doesNotMatch(migration, /DROP TABLE\s+(?:sales|sale_items|orders|payments|inventory_movements)|TRUNCATE|DELETE FROM\s+(?:sales|sale_items|orders|payments)/i);
});

test('return calculation respects remaining quantity and keeps final rounding bounded', () => {
  const item = {
    product_name: 'Hammer',
    sold_quantity: 3,
    remaining_quantity: 2,
    original_refundable_amount: 250,
    remaining_refundable_amount: 166.67,
    original_unit_cost: 50,
  };

  const partial = calculateReturnLine(item, 1);
  assert.equal(partial.quantity, 1);
  assert.equal(partial.refundSubtotal, 83.33);
  assert.equal(partial.unitCost, 50);

  const final = calculateReturnLine(item, 2);
  assert.equal(final.refundSubtotal, 166.67);
  assert.throws(() => calculateReturnLine(item, 3), /exceeds/);
});

test('non-cash refund methods require external verification while cash does not', () => {
  assert.equal(normalizeRefundMethod('paymongo'), 'PayMongo');
  assert.equal(normalizeRefundMethod('GCash'), 'GCash');
  assert.equal(normalizeRefundMethod('invalid', null), null);
  assert.equal(requiresExternalRefundConfirmation('Cash'), false);
  assert.equal(requiresExternalRefundConfirmation('Card'), true);
  assert.equal(requiresExternalRefundConfirmation('PayMongo'), true);
});

test('returns and voids require manager verification for cashiers, remain transactional and audited', () => {
  assert.match(route, /router\.use\(authenticateToken, requirePosStaff\)/);
  assert.match(route, /requireCashierSaleOwnership, requireActionApproval\('sale_adjustment'\)/);
  assert.match(route, /router\.post\('\/returns'/);
  assert.match(route, /router\.post\('\/voids'/);
  assert.match(route, /adjustment_request_id/);
  assert.match(route, /FOR UPDATE/);
  assert.match(route, /beginTransaction\(\)/);
  assert.match(route, /await connection\.commit\(\)/);
  assert.match(route, /await connection\.rollback\(\)/);
  assert.match(route, /action: 'sale\.return'/);
  assert.match(route, /action: 'sale\.void'/);
  assert.match(route, /completed externally before recording/i);
  assert.doesNotMatch(route, /paymongo\.com|checkout_sessions|refunds\//i);
});

test('restockable returns restore stock only through the inventory movement ledger using original sale cost', () => {
  assert.match(route, /UPDATE products SET stock = stock \+ \?/);
  assert.match(route, /movement_reason/);
  assert.match(route, /'Sales Return'/);
  assert.match(route, /'Sale Void Reversal'/);
  assert.match(route, /sale_adjustment_item_id/);
  assert.match(route, /unitCost/);
  assert.match(inventoryRoute, /WHEN im\.sale_adjustment_item_id IS NOT NULL AND sa\.adjustment_type = 'Void' THEN 'Sale Void Reversal'/);
  assert.match(inventoryRoute, /WHEN im\.sale_adjustment_item_id IS NOT NULL THEN 'Sales Return'/);
});

test('financial reporting reduces revenue by refunds and reverses COGS only for restocked quantities', () => {
  assert.match(financialSource, /saleAdjustmentsAggregateSql/);
  assert.match(financialSource, /saleAdjustmentItemsAggregateSql/);
  assert.match(financialSource, /sai\.restockable = 1 THEN sai\.quantity \* sai\.unit_cost/);
  assert.match(financialSource, /COALESCE\(adjustments\.merchandise_refunds, 0\)/);
  assert.match(financialSource, /COALESCE\(adjustments\.total_refunds, 0\)/);

  const summary = summarizeFinancialRows([
    {
      gross_merchandise_sales: 1000,
      discount_amount: 100,
      merchandise_refunds: 200,
      net_merchandise_sales: 700,
      service_fee_refunds: 0,
      delivery_fee_refunds: 50,
      service_revenue: 0,
      delivery_revenue: 50,
      total_refunds: 250,
      original_total_revenue: 1000,
      total_revenue: 750,
      original_cogs: 600,
      cogs_reversed: 120,
      cogs: 480,
      total_quantity: 10,
      net_quantity: 8,
      returned_quantity: 2,
      adjustment_count: 1,
      void_count: 0,
    },
  ]);
  assert.equal(summary.total_refunds, 250);
  assert.equal(summary.total_net_merchandise_sales, 700);
  assert.equal(summary.total_cogs, 480);
  assert.equal(summary.total_gross_profit, 220);
  assert.equal(summary.total_items_sold, 8);
  assert.equal(summary.total_items_returned, 2);
  assert.equal(summary.total_adjustments, 1);
});

test('top-selling analytics subtract returned units and refunded item revenue', () => {
  assert.match(analyticsSource, /returned_quantity/);
  assert.match(analyticsSource, /refunded_amount/);
  assert.match(analyticsSource, /GREATEST\(si\.quantity - COALESCE\(returned\.returned_quantity, 0\), 0\)/);
});

test('Admin UI exposes an isolated Returns & Voids workflow and shows adjusted sale reporting', () => {
  assert.match(serverSource, /app\.use\('\/api\/sale-adjustments', saleAdjustmentsRoutes\)/);
  assert.match(dashboardSource, /'saleAdjustments'/);
  assert.match(dashboardSource, /<SalesAdjustmentPanel/);
  assert.match(dashboardSource, /Returns \/ Refunds/);
  assert.match(dashboardSource, /adjustment_state/);
  assert.match(adjustmentPanel, /Phase 4 safety rule/);
  assert.match(adjustmentPanel, /does not automatically issue PayMongo/);
  assert.match(adjustmentPanel, /Restock only items physically returned in sellable condition/);
  assert.match(adjustmentPanel, /Full POS Void/);
  assert.match(auditPanel, /'sale\.return': 'Sale Return \/ Refund'/);
  assert.match(auditPanel, /'sale\.void': 'POS Sale Voided'/);
});
