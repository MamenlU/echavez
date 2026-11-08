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
const schema = fs.readFileSync(path.join(projectRoot, 'schema.sql'), 'utf8');
const migration = fs.readFileSync(path.join(backendRoot, 'migrations', '20261006_supplier_reference_stock_audit.js'), 'utf8');

test('schema adds supplier_reference only as nullable audit metadata', () => {
  assert.match(schema, /`supplier_reference` varchar\(120\) DEFAULT NULL/);
});

test('opening inventory remains one Stock-In insert and carries supplier reference', () => {
  const createStart = productsRoute.indexOf("router.post('/',");
  const updateStart = productsRoute.indexOf("router.put('/:id'", createStart);
  const createHandler = productsRoute.slice(createStart, updateStart);
  const stockInInsertCount = (createHandler.match(/INSERT INTO inventory_movements/g) || []).length;
  assert.equal(stockInInsertCount, 1);
  assert.match(createHandler, /supplier_reference/);
  assert.match(createHandler, /Opening Inventory/);
});

test('Receive Stock keeps receiving_request_id de-duplication and stores supplier reference in the same insert', () => {
  const receiveStart = inventoryRoute.indexOf("router.post('/receive'");
  const adjustStart = inventoryRoute.indexOf("router.post('/adjust'", receiveStart);
  const receiveHandler = inventoryRoute.slice(receiveStart, adjustStart > receiveStart ? adjustStart : undefined);
  assert.match(receiveHandler, /receiving_request_id/);
  assert.match(receiveHandler, /supplier_reference/);
  assert.equal((receiveHandler.match(/INSERT INTO inventory_movements/g) || []).length, 1);
});

test('weighted-average inventory calculation is still present and unchanged in purpose', () => {
  assert.match(inventoryRoute, /inventory_value/);
  assert.match(inventoryRoute, /newValue = Number\(costRows\[0\]\.inventory_value\) \+ \(receivedQuantity \* supplierPrice\)/);
  assert.match(inventoryRoute, /averageCost = newStock > 0/);
});


test('migration is additive and does not update or delete inventory history', () => {
  assert.match(migration, /ADD COLUMN supplier_reference VARCHAR\(120\) NULL/);
  assert.doesNotMatch(migration, /UPDATE\s+inventory_movements/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+inventory_movements/i);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+inventory_movements/i);
  assert.match(migration, /Inventory snapshot changed unexpectedly/);
});
