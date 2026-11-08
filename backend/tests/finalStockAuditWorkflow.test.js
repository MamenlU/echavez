import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');

const productsRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'products.js'), 'utf8');
const inventoryRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'inventory.js'), 'utf8');
const adminDashboard = fs.readFileSync(path.join(projectRoot, 'src', 'pages', 'AdminDashboard.tsx'), 'utf8');

function sliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `Missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `Missing end token: ${endToken}`);
  return source.slice(start, end);
}

test('Opening Inventory keeps exactly one Stock-In and supplier documents are optional metadata', () => {
  const handler = sliceBetween(productsRoute, "router.post('/',", "router.put('/:id'");
  assert.equal((handler.match(/INSERT INTO inventory_movements/g) || []).length, 1);
  assert.match(handler, /Opening Inventory/);
  assert.match(handler, /receipt_path, supplier_reference/);
  assert.match(handler, /normalizeSupplierReference\(req\.body\.opening_supplier_reference\)/);
  assert.doesNotMatch(handler, /opening_supplier_reference, \{ required: true \}/);
});

test('Receive Stock keeps exactly one Stock-In, duplicate protection, and optional supplier documents', () => {
  const handler = sliceBetween(inventoryRoute, "router.post('/receive'", "router.post('/adjust'");
  assert.equal((handler.match(/INSERT INTO inventory_movements/g) || []).length, 1);
  assert.match(handler, /receiving_request_id/);
  assert.match(handler, /receipt_path/);
  assert.match(handler, /supplier_reference/);
  assert.match(handler, /normalizeSupplierReference\(supplier_reference\)/);
  assert.doesNotMatch(handler, /Receipt attachment is required/);
  assert.doesNotMatch(handler, /normalizeSupplierReference\(supplier_reference, \{ required: true \}\)/);
  assert.match(handler, /newValue = Number\(costRows\[0\]\.inventory_value\) \+ \(receivedQuantity \* supplierPrice\)/);
  assert.match(handler, /averageCost = newStock > 0/);
});

test('Inventory Movement History is the centralized full audit view', () => {
  assert.match(adminDashboard, /Inventory Movement History/);
  assert.match(adminDashboard, /Centralized audit trail for all Stock-In and Stock-Out transactions/);
  assert.match(adminDashboard, /movementSourceFilter/);
  assert.match(adminDashboard, /Opening Inventory/);
  assert.match(adminDashboard, /Stock Receiving/);
  assert.match(adminDashboard, /<th className="px-4 py-3">Receipt<\/th>/);
  assert.match(adminDashboard, /View Receipt/);
  assert.doesNotMatch(adminDashboard, />Stock-In History</);
  assert.match(adminDashboard, /selectedMovementHistory && createPortal\(/);
  assert.match(adminDashboard, /selectedSaleHistory && createPortal\(/);
  assert.match(adminDashboard, /document\.body/);
});

test('Inventory movement reference labels cast numeric IDs before PostgreSQL LPAD', () => {
  const movementHandler = sliceBetween(inventoryRoute, "router.get('/movements'", "router.post('/opening'");
  const lpadCalls = movementHandler.match(/LPAD\(([^,]+),\s*6,\s*'0'\)/g) || [];
  assert.equal(lpadCalls.length, 6);
  assert.ok(lpadCalls.every((call) => call.includes('::text')));
});

test('Receive Stock uses a compact Recent Stock-In summary and links to centralized Stock-In filtering', () => {
  assert.match(adminDashboard, />Recent Stock-In</);
  assert.match(adminDashboard, /View All Stock-In Movements/);
  assert.match(adminDashboard, /setMovementTypeFilter\('Stock-In'\)/);
  assert.match(adminDashboard, /recentStockInMovements[\s\S]*slice\(0, 5\)/);
});

test('Admin forms describe supplier reference and receipt as optional', () => {
  assert.match(adminDashboard, /Supplier Reference No\. <span[^>]*>\(Optional\)<\/span>/);
  assert.match(adminDashboard, /Supplier Receipt \/ Delivery Document <span[^>]*>\(Optional\)<\/span>/);
  assert.doesNotMatch(adminDashboard, /Supplier receipt \/ reference number is required/);
  assert.doesNotMatch(adminDashboard, /Please attach a receipt image/);
});
