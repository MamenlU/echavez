// Targeted final-patch regression tests. Mocked DB; do not claim live MySQL coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'final-local-regression-only';
const { default: pool } = await import('../db.js');
const { authenticateToken, requirePosStaff, requireActionApproval, createCurrentAccountGuard } = await import('../middleware/auth.js');
const root = path.resolve(import.meta.dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const hash = await bcrypt.hash('Valid#OwnerPassword23', 6);
const oldQuery = pool.query;
const writes = [];
const accounts = new Map([
  [1, { id: 1, username: 'admin', role: 'admin', status: 'active', password_hash: hash }],
  [2, { id: 2, username: 'cashier', role: 'cashier', status: 'active', password_hash: hash }],
  [3, { id: 3, username: 'owner', role: 'super_admin', status: 'active', password_hash: hash }],
  [4, { id: 4, username: 'oldcustomer', role: 'customer', status: 'inactive', password_hash: hash }],
]);
let server;
try {
  pool.query = async (sql, args = []) => {
    const q = String(sql).replace(/\s+/g, ' ');
    if (q.includes('FROM users WHERE id = ? LIMIT 1')) return [[accounts.get(Number(args[0]))].filter(Boolean)];
    if (q.includes('FROM users') && q.includes('password_hash')) return [[...accounts.values()].filter(a => a.username === args[0])];
    if (q.includes('INSERT INTO audit_logs')) { writes.push({ sql: q, args }); return [{ insertId: writes.length }]; }
    throw new Error('Unexpected statement: ' + q);
  };
  const app = express(); app.use(express.json());
  app.post('/open', authenticateToken, requirePosStaff, requireActionApproval('shift_open'), (req, res) => {
    res.json({ verifiedBy: req.managerApproval?.id || null });
  });
  app.get('/customer', authenticateToken, createCurrentAccountGuard(pool), (_req, res) => res.json({ ok: true }));
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, id, body) => {
    const token = jwt.sign({ id, role: accounts.get(id).role }, process.env.JWT_SECRET);
    const res = await fetch(base + route, { method: route === '/open' ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, body: await res.json() };
  };
  await test('Admin shift opening rejects missing/incorrect Super Admin approval without running handler', async () => {
    writes.length = 0;
    assert.equal((await call('/open', 1, {})).status, 403);
    assert.equal((await call('/open', 1, { managerUsername: 'owner', managerPassword: 'wrong' })).status, 403);
    assert.equal((await call('/open', 1, { managerUsername: 'admin', managerPassword: 'Valid#OwnerPassword23' })).status, 403);
    assert.equal(writes.length, 3, 'each rejection should be audited');
    assert.ok(writes.every(w => !JSON.stringify(w.args).includes('Valid#OwnerPassword23')));
  });
  await test('Admin shift opening accepts separate active Super Admin credentials', async () => {
    const result = await call('/open', 1, { managerUsername: 'owner', managerPassword: 'Valid#OwnerPassword23' });
    assert.equal(result.status, 200);
    assert.equal(result.body.verifiedBy, 3);
  });
  await test('Cashier shift opening accepts Admin approval, but not own credentials', async () => {
    assert.equal((await call('/open', 2, { managerUsername: 'cashier', managerPassword: 'Valid#OwnerPassword23' })).status, 403);
    const result = await call('/open', 2, { managerUsername: 'admin', managerPassword: 'Valid#OwnerPassword23' });
    assert.equal(result.status, 200);
    assert.equal(result.body.verifiedBy, 1);
  });
  await test('inactive customer token is rejected independently of its signed JWT role', async () => {
    const result = await call('/customer', 4);
    assert.equal(result.status, 401);
  });
  await test('cashier handover requires fresh arrival and saves tendered cash in Sale', () => {
    const source = read('backend/routes/orders.js');
    assert.match(source, /created_at >= DATE_SUB\(NOW\(\), INTERVAL 15 MINUTE\)/);
    assert.match(source, /AND admin_id = \?/);
    assert.match(source, /cash_received,\s*sale_date/);
    assert.match(source, /order\.payment_method,\s*cashierTender/);
  });
  await test('Staff Accounts has staff shell; customer footer and dashboard share one implementation', () => {
    assert.match(read('project/src/pages/CashierAccountsPage.tsx'), /Back to Dashboard/);
    assert.match(read('project/src/App.tsx'), /pathname === '\/admin\/cashiers'/);
    assert.match(read('project/src/pages/CustomerDashboard.tsx'), /<Footer\s*\/>/);
    assert.match(read('project/src/components/Footer.tsx'), /to="\/project"/);
  });
  await test('Admin permission denial does not invalidate a valid session', () => {
    const source = read('project/src/pages/AdminDashboard.tsx');
    assert.doesNotMatch(source, /(?:res|response)\.status\s*===\s*401\s*\|\|\s*(?:res|response)\.status\s*===\s*403/);
    assert.match(source, /handleAdminSessionExpired/);
  });
} finally {
  pool.query = oldQuery;
  if (server) await new Promise(resolve => server.close(resolve));
}
