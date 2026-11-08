import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productAuditSnapshot, recordAuditLog } from '../lib/auditService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');

const schema = fs.readFileSync(path.join(projectRoot, 'schema.sql'), 'utf8');
const migration = fs.readFileSync(path.join(backendRoot, 'migrations', '20261014_phase3_audit_logging.sql'), 'utf8');
const auditRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'auditLogs.js'), 'utf8');
const inventoryRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'inventory.js'), 'utf8');
const productsRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'products.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(backendRoot, 'server.js'), 'utf8');
const auditPanel = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'AdminAuditLogPanel.tsx'), 'utf8');
const adminDashboard = fs.readFileSync(path.join(projectRoot, 'src', 'pages', 'AdminDashboard.tsx'), 'utf8');

test('Phase 3 adds exactly one centralized audit table with useful indexes and Admin foreign key', () => {
  const tableCount = (schema.match(/CREATE TABLE `/g) || []).length;
  assert.ok(tableCount >= 16);
  assert.match(schema, /CREATE TABLE `audit_logs`/);
  assert.match(schema, /`admin_id` int\(11\) NOT NULL/);
  assert.match(schema, /`before_data` longtext DEFAULT NULL/);
  assert.match(schema, /`after_data` longtext DEFAULT NULL/);
  assert.match(schema, /idx_audit_admin_created/);
  assert.match(schema, /idx_audit_entity_created/);
  assert.match(schema, /fk_audit_admin/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE|UPDATE\s+(?:products|sales|orders|inventory_movements)/i);
});

test('audit service redacts sensitive or oversized payload fields before persistence', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [{ insertId: 88 }];
    },
  };

  const id = await recordAuditLog(db, {
    adminId: 7,
    action: 'test.action',
    entityType: 'product',
    entityId: 4,
    summary: 'Test audit record.',
    before: { price: 10, password: 'never-store-this' },
    after: { price: 12, receipt_image: `data:image/png;base64,${'A'.repeat(700)}` },
    reason: 'Unit test',
  });

  assert.equal(id, 88);
  assert.equal(calls.length, 1);
  const serialized = calls[0].params.join(' ');
  assert.doesNotMatch(serialized, /never-store-this/);
  assert.doesNotMatch(serialized, /A{100}/);
  assert.match(serialized, /\[redacted\]/);
});

test('product snapshot keeps business fields and excludes images or secret-bearing request data', () => {
  const snapshot = productAuditSnapshot({
    id: 1,
    name: 'Hammer',
    price: 250,
    stock: 12,
    reorder_level: 5,
    image: 'data:image/png;base64,SHOULD_NOT_BE_PRESENT',
  });
  assert.equal(snapshot.name, 'Hammer');
  assert.equal(snapshot.price, 250);
  assert.equal(snapshot.stock, 12);
  assert.equal(Object.hasOwn(snapshot, 'image'), false);
});

test('inventory receiving and physical-count adjustment write audit records inside their existing transactions', () => {
  for (const action of ['inventory.receive', 'inventory.adjust']) {
    assert.match(inventoryRoute, new RegExp(`action: '${action.replace('.', '\\.')}'`));
  }
  assert.match(inventoryRoute, /recordAuditLog\(connection/);
  assert.match(inventoryRoute, /await connection\.commit\(\)/);
});

test('product create, update/price change, and activation status are centrally audited', () => {
  assert.match(productsRoute, /action: 'product\.create'/);
  assert.match(productsRoute, /product\.price_update/);
  assert.match(productsRoute, /action: 'product\.status_change'/);
  assert.match(productsRoute, /recordAuditLog\(connection/);
});

test('Audit Logs API separates sanitized personal activity from manager-only full history', () => {
  assert.match(auditRoute, /router\.use\(authenticateToken, requirePosStaff\)/);
  assert.match(auditRoute, /router\.get\('\/mine'/);
  assert.match(auditRoute, /WHERE admin_id = \?/);
  assert.match(auditRoute, /router\.use\(requireAdmin\)/);
  assert.match(auditRoute, /router\.get\('\/'/);
  assert.doesNotMatch(auditRoute, /router\.(?:post|put|patch|delete)\(/);
  assert.match(serverSource, /app\.use\('\/api\/audit-logs', auditLogsRoutes\)/);
  assert.match(adminDashboard, /'auditLogs'/);
  assert.match(adminDashboard, /<AdminAuditLogPanel \/>/);
  assert.match(auditPanel, /\/api\/audit-logs/);
});

test('Phase 3 preserves the Phase 1 product stock contract while correcting parameter alignment in the packaged source baseline', () => {
  const createStart = productsRoute.indexOf("router.post('/', authenticateToken, requireAdmin");
  const updateStart = productsRoute.indexOf("router.put('/:id'", createStart);
  const createHandler = productsRoute.slice(createStart, updateStart);
  const statusStart = productsRoute.indexOf("router.patch('/:id/status'", updateStart);
  const updateHandler = productsRoute.slice(updateStart, statusStart);

  assert.match(createHandler, /product\.image,\s*product\.stock,\s*product\.reorderLevel/);
  assert.match(updateHandler, /Stock cannot be changed from Edit Product/);
  assert.doesNotMatch(updateHandler, /product\.image,\s*product\.stock,\s*product\.reorderLevel/);
  assert.doesNotMatch(updateHandler, /stock\s*=\s*\?/);
});
