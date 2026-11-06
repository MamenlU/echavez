import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');

const inventoryRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'inventory.js'), 'utf8');
const productsRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'products.js'), 'utf8');
const adminDashboard = fs.readFileSync(path.join(projectRoot, 'src', 'pages', 'AdminDashboard.tsx'), 'utf8');
const adjustmentPanel = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'InventoryAdjustmentPanel.tsx'), 'utf8');
const schema = fs.readFileSync(path.join(projectRoot, 'schema.sql'), 'utf8');
const migration = fs.readFileSync(path.join(backendRoot, 'migrations', '20261013_phase1_inventory_integrity.sql'), 'utf8');

test('Phase 1 schema is additive and adds adjustment idempotency metadata only', () => {
  assert.match(schema, /`movement_reason` varchar\(50\) DEFAULT NULL/);
  assert.match(schema, /`adjustment_request_id` varchar\(64\) DEFAULT NULL/);
  assert.match(schema, /UNIQUE KEY `uq_inventory_adjustment_request` \(`adjustment_request_id`\)/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE|UPDATE products SET stock/i);
});

test('Edit Product no longer writes stock directly', () => {
  const putStart = productsRoute.indexOf("router.put('/:id'");
  const statusStart = productsRoute.indexOf("router.patch('/:id/status'", putStart);
  const putHandler = productsRoute.slice(putStart, statusStart);
  assert.match(putHandler, /SELECT id, barcode, name, unit, price, category, category_id, supplier_id,[\s\S]*stock,[\s\S]*FROM products[\s\S]*WHERE id = \? FOR UPDATE/);
  assert.match(putHandler, /Stock cannot be changed from Edit Product/);
  assert.doesNotMatch(putHandler, /\bstock\s*=\s*\?/);
});

test('Opening Inventory and Receive Stock label their existing movement records without adding duplicate stock writes', () => {
  assert.match(productsRoute, /'Opening Inventory'.*Opening Inventory/s);
  assert.match(inventoryRoute, /'Stock Receiving'/);
  const receiveStart = inventoryRoute.indexOf("router.post('/receive'");
  const adjustStart = inventoryRoute.indexOf("router.post('/adjust'", receiveStart);
  const receiveHandler = inventoryRoute.slice(receiveStart, adjustStart);
  assert.equal((receiveHandler.match(/INSERT INTO inventory_movements/g) || []).length, 1);
  assert.equal((receiveHandler.match(/UPDATE products SET stock = \?/g) || []).length, 1);
});

test('Stock adjustment is transactional, stale-count protected, idempotent, and ledger-centered', () => {
  const adjustStart = inventoryRoute.indexOf("router.post('/adjust'");
  assert.ok(adjustStart > 0);
  const handler = inventoryRoute.slice(adjustStart);
  assert.match(handler, /beginTransaction\(\)/);
  assert.match(handler, /FOR UPDATE/);
  assert.match(handler, /currentStock !== expectedStock/);
  assert.match(handler, /adjustment_request_id = \?/);
  assert.match(handler, /Physical Count Increase/);
  assert.match(handler, /Physical Count Decrease/);
  assert.equal((handler.match(/INSERT INTO inventory_movements/g) || []).length, 1);
  assert.equal((handler.match(/UPDATE products SET stock = \?/g) || []).length, 1);
  assert.match(handler, /commit\(\)/);
  assert.match(handler, /rollback\(\)/);
});

test('Admin UI exposes a dedicated Stock Adjustment workflow and locks stock in Edit Product', () => {
  assert.match(adminDashboard, /'inventoryAdjustment'/);
  assert.match(adminDashboard, /Stock Adjustment \/ Physical Count/);
  assert.match(adminDashboard, /readOnly=\{Boolean\(editingProduct\)\}/);
  assert.match(adjustmentPanel, /\/api\/inventory\/adjust/);
  assert.match(adjustmentPanel, /expected_stock/);
  assert.match(adjustmentPanel, /counted_stock/);
});
