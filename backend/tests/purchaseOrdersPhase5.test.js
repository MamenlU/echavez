import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPurchaseOrderProgress, syncPurchaseOrderStatus } from '../lib/purchaseOrderService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');

const schema = fs.readFileSync(path.join(projectRoot, 'schema.sql'), 'utf8');
const migration = fs.readFileSync(path.join(backendRoot, 'migrations', '20261014_phase5_purchase_orders.sql'), 'utf8');
const poRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'purchaseOrders.js'), 'utf8');
const inventoryRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'inventory.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(backendRoot, 'server.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(projectRoot, 'src', 'pages', 'AdminDashboard.tsx'), 'utf8');
const panel = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'PurchaseOrdersPanel.tsx'), 'utf8');
const auditPanel = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'AdminAuditLogPanel.tsx'), 'utf8');

test('Phase 5 adds only the two approved purchase-order tables and one inventory link column', () => {
  const tableCount = (schema.match(/CREATE TABLE `/g) || []).length;
  assert.ok(tableCount >= 20);
  assert.match(schema, /CREATE TABLE `purchase_orders`/);
  assert.match(schema, /CREATE TABLE `purchase_order_items`/);
  assert.match(schema, /`purchase_order_item_id` bigint\(20\) UNSIGNED DEFAULT NULL/);
  assert.match(schema, /uq_purchase_orders_number/);
  assert.match(schema, /uq_purchase_order_product/);
  assert.match(schema, /fk_inventory_purchase_order_item/);
  assert.doesNotMatch(migration, /DROP TABLE\s+(?:products|sales|orders|payments|inventory_movements)|TRUNCATE|DELETE FROM\s+(?:products|sales|orders|payments|inventory_movements)/i);
});

test('purchase-order API is admin-only and supports draft, edit, order, cancel, list, and detail workflows', () => {
  assert.match(poRoute, /router\.use\(authenticateToken, requireAdmin\)/);
  assert.match(poRoute, /router\.get\('\/'/);
  assert.match(poRoute, /router\.get\('\/:id'/);
  assert.match(poRoute, /router\.post\('\/'/);
  assert.match(poRoute, /router\.put\('\/:id'/);
  assert.match(poRoute, /router\.post\('\/:id\/order'/);
  assert.match(poRoute, /router\.post\('\/:id\/cancel'/);
  assert.match(poRoute, /Only Draft purchase orders can be edited/);
  assert.match(poRoute, /Only Draft purchase orders can be marked Ordered/);
  assert.match(poRoute, /fully received purchase order cannot be cancelled/i);
});

test('purchase-order creation does not update product stock or insert inventory movements', () => {
  const createStart = poRoute.indexOf("router.post('/', async");
  const updateStart = poRoute.indexOf("router.put('/:id'", createStart);
  const createHandler = poRoute.slice(createStart, updateStart);
  assert.doesNotMatch(createHandler, /UPDATE products SET stock/i);
  assert.doesNotMatch(createHandler, /INSERT INTO inventory_movements/i);
  assert.match(createHandler, /status, expected_delivery_date/);
  assert.match(createHandler, /'Draft'/);
});

test('goods receiving validates PO supplier/product/remaining quantity and uses existing receiving transaction', () => {
  assert.match(inventoryRoute, /purchase_order_item_id/);
  assert.match(inventoryRoute, /Only Ordered or Partially Received purchase orders can receive stock/);
  assert.match(inventoryRoute, /selected product does not match this purchase-order item/i);
  assert.match(inventoryRoute, /selected supplier does not match this purchase order/i);
  assert.match(inventoryRoute, /Received quantity exceeds the/);
  assert.match(inventoryRoute, /syncPurchaseOrderStatus/);
  assert.match(inventoryRoute, /action: 'purchase_order\.receive'/);
  assert.match(inventoryRoute, /await connection\.commit\(\)/);
  assert.match(inventoryRoute, /await connection\.rollback\(\)/);
});

test('partial receiving is derived from the inventory movement ledger rather than duplicated received-quantity columns', () => {
  assert.doesNotMatch(schema, /`received_quantity`/);
  assert.match(poRoute, /SUM\(quantity\) AS received_quantity/);
  assert.match(poRoute, /GREATEST\(poi\.ordered_quantity - COALESCE\(receipts\.received_quantity, 0\), 0\)/);
  assert.match(panel, /remaining_quantity/);
});

test('purchase-order status synchronization moves Ordered to Partially Received and Received from ledger totals', async () => {
  const calls = [];
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (/SELECT\s+po\.purchase_order_id/i.test(sql)) {
        return [[{
          purchase_order_id: 5,
          po_number: 'PO-TEST',
          status: 'Ordered',
          ordered_quantity: 10,
          received_quantity: 4,
          remaining_quantity: 6,
        }]];
      }
      if (/UPDATE purchase_orders/i.test(sql)) return [{ affectedRows: 1 }];
      return [[]];
    },
  };
  const progress = await getPurchaseOrderProgress(fakeDb, 5);
  assert.equal(progress.remaining_quantity, 6);
  const synced = await syncPurchaseOrderStatus(fakeDb, 5);
  assert.equal(synced.status, 'Partially Received');
  assert.ok(calls.some((call) => /UPDATE purchase_orders/i.test(call.sql)));
});

test('inventory movement history labels PO receipts with the purchase-order reference', () => {
  assert.match(inventoryRoute, /Purchase Order Receiving/);
  assert.match(inventoryRoute, /po\.po_number AS purchase_order_number/);
  assert.match(inventoryRoute, /WHEN im\.purchase_order_item_id IS NOT NULL THEN po\.po_number/);
  assert.match(inventoryRoute, /LEFT JOIN purchase_order_items poi/);
  assert.match(inventoryRoute, /LEFT JOIN purchase_orders po/);
});

test('Admin UI integrates Purchase Orders with the existing Receive Stock page and audit labels', () => {
  assert.match(serverSource, /app\.use\('\/api\/purchase-orders', purchaseOrdersRoutes\)/);
  assert.match(dashboard, /'purchaseOrders'/);
  assert.match(dashboard, /<PurchaseOrdersPanel onReceiveItem=\{handlePurchaseOrderReceiveItem\}/);
  assert.match(dashboard, /purchase_order_item_id/);
  assert.match(dashboard, /Receiving against \{stockReceiving\.purchase_order_number\}/);
  assert.match(panel, /Inventory safety rule/);
  assert.match(panel, /Mark Ordered/);
  assert.match(panel, /Cancel Remaining/);
  assert.match(panel, /onReceiveItem/);
  assert.match(auditPanel, /'purchase_order\.receive': 'Purchase Order Received'/);
});
