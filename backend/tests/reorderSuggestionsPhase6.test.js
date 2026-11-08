import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateReorderSuggestion } from '../lib/reorderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');

function read(relativePath, root = backendRoot) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Phase 6 migration adds only supplier lead_time_days and no reorder table', () => {
  const sql = read('migrations/20261014_phase6_reorder_suggestions.sql');
  assert.match(sql, /ALTER TABLE suppliers/i);
  assert.match(sql, /lead_time_days/i);
  assert.doesNotMatch(sql, /CREATE TABLE/i);
});

test('reorder formula includes demand, lead time, safety level, and open PO stock', () => {
  const result = calculateReorderSuggestion({
    product_id: 1,
    product_name: 'Test Cement',
    stock: 8,
    reorder_level: 10,
    net_units_sold_30d: 60,
    outstanding_po_quantity: 0,
    supplier_id: 4,
    supplier_name: 'Test Supplier',
    supplier_status: 'Active',
    lead_time_days: 5,
  });

  assert.equal(result.average_daily_demand, 2);
  assert.equal(result.reorder_point, 20); // 2 x 5 + 10
  assert.equal(result.target_stock, 80); // 2 x (5 + 30) + 10
  assert.equal(result.suggested_order_quantity, 72);
  assert.equal(result.status, 'High');
});

test('outstanding Purchase Orders reduce suggested quantity and can cover a reorder need', () => {
  const result = calculateReorderSuggestion({
    product_id: 1,
    product_name: 'Test Cement',
    stock: 8,
    reorder_level: 10,
    net_units_sold_30d: 60,
    outstanding_po_quantity: 80,
    supplier_id: 4,
    supplier_name: 'Test Supplier',
    supplier_status: 'Active',
    lead_time_days: 5,
  });

  assert.equal(result.projected_available, 88);
  assert.equal(result.suggested_order_quantity, 0);
  assert.equal(result.status, 'Covered by PO');
});

test('missing supplier lead time is reported as setup required instead of inventing a lead time', () => {
  const result = calculateReorderSuggestion({
    product_id: 2,
    product_name: 'Test Paint',
    stock: 2,
    reorder_level: 5,
    net_units_sold_30d: 30,
    outstanding_po_quantity: 0,
    supplier_id: 3,
    supplier_name: 'Supplier',
    supplier_status: 'Active',
    lead_time_days: null,
  });

  assert.equal(result.status, 'Setup Required');
  assert.equal(result.suggested_order_quantity, 0);
  assert.match(result.setup_issue, /lead time/i);
});

test('reorder query uses returned quantities and open PO receipts without changing stock', () => {
  const service = read('lib/reorderService.js');
  assert.match(service, /sale_adjustment_items/);
  assert.match(service, /purchase_order_items/);
  assert.match(service, /inventory_movements/);
  assert.match(service, /Partially Received/);
  assert.doesNotMatch(service, /UPDATE\s+products/i);
  assert.doesNotMatch(service, /INSERT\s+INTO\s+purchase_orders/i);
});

test('reorder endpoint is Admin protected and mounted by the backend', () => {
  const route = read('routes/reorderSuggestions.js');
  const server = read('server.js');
  assert.match(route, /authenticateToken/);
  assert.match(route, /requireAdmin/);
  assert.match(server, /\/api\/reorder-suggestions/);
});

test('supplier API accepts and validates lead time metadata', () => {
  const suppliers = read('routes/suppliers.js');
  assert.match(suppliers, /lead_time_days/);
  assert.match(suppliers, /0 to 365 days/);
  assert.match(suppliers, /supplier\.lead_time_update/);
});

test('Admin UI exposes Reorder Suggestions without automatic PO creation', () => {
  const dashboard = read('src/pages/AdminDashboard.tsx', projectRoot);
  const panel = read('src/components/ReorderSuggestionsPanel.tsx', projectRoot);
  assert.match(dashboard, /reorderSuggestions/);
  assert.match(panel, /Reorder Suggestions/);
  assert.match(panel, /Open Purchase Orders/);
  assert.match(panel, /never change stock/i);
  assert.match(panel, /never create or place a Purchase Order automatically/i);
});
