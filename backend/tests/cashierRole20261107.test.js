import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Isolated API tests use in-memory DB stubs; no external/production database is accessed.
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'cashier-test-secret-not-for-production';
const { default: pool } = await import('../db.js');
const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { default: bcrypt } = await import('bcrypt');
const { authenticateToken, requireAdmin, requirePosStaff, requireManagerForCashier } = await import('../middleware/auth.js');
const { default: salesRouter } = await import('../routes/sales.js');
const { default: shiftsRouter } = await import('../routes/cashierShifts.js');
const { default: adjustmentsRouter } = await import('../routes/saleAdjustments.js');

const originalQuery = pool.query;
const originalGetConnection = pool.getConnection;
const token = (id, role) => jwt.sign({ id, role, username: `user${id}` }, process.env.JWT_SECRET, { expiresIn: '30m' });
const testApp = express();
testApp.use(express.json());
testApp.get('/admin-only', authenticateToken, requireAdmin, (_req, res) => res.json({ ok: true }));
testApp.use('/sales', salesRouter);
testApp.use('/cashier-shifts', shiftsRouter);
testApp.use('/sale-adjustments', adjustmentsRouter);
const server = await new Promise(resolve => {
  const instance = testApp.listen(0, '127.0.0.1', () => resolve(instance));
});
const base = `http://127.0.0.1:${server.address().port}`;
const call = async (method, route, id = 2, role = 'cashier', body = undefined) => {
  const response = await fetch(base + route, {
    method, headers: { Authorization: `Bearer ${token(id, role)}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, data: await response.json() };
};
const userRow = (id, override = {}) => ({ id, username: `user${id}`,
  role: id === 1 ? 'admin' : id === 2 ? 'cashier' : 'customer', status: 'active', ...override });
const managerHash = await bcrypt.hash('Manager#Strong123', 6);
let dbState = {};
let writes = [];
let commits = 0;
let rollbacks = 0;
const queryStub = async (sql, args = []) => {
  const query = String(sql).replace(/\s+/g, ' ').trim();
  if (query.includes('FROM users WHERE id = ? LIMIT 1')) {
    return [[userRow(Number(args[0]), dbState.userOverrides?.[args[0]])]];
  }
  if (query.includes('FROM users') && query.includes('password_hash') && query.includes('username = ?')) {
    return [[{ ...userRow(1), password_hash: managerHash }]];
  }
  if (query.includes('FROM sales WHERE pos_request_id')) return [[]];
  if (query.includes('FROM cashier_shifts') && query.includes("status = 'Open'")) {
    return [[{ shift_id: 3, admin_id: 2, status: 'Open', opening_cash: 500 }]];
  }
  if (query.includes('FROM cashier_shifts') && query.includes('shift_id = ?') && query.includes('FOR UPDATE')) {
    return [[{ shift_id: 3, admin_id: 2, status: 'Open', opening_cash: 500, notes: null }]];
  }
  if (query.includes('FROM cashier_shifts cs') && query.includes('INNER JOIN users')) {
    return [[{ shift_id: 3, admin_id: 2, status: 'Open', opening_cash: 500, notes: null,
      admin_name: 'Cashier', admin_username: 'user2', actual_cash: null, discrepancy: null }]];
  }
  if (query.includes('FROM sales') && (query.includes('sales_source =') || query.includes('sales_source IN'))) {
    return [[{ pos_transaction_count: 1, cash_sales_amount: 100, card_sales_amount: 0,
      total_pos_sales_amount: 100 }]];
  }
  if (query.includes('FROM sale_adjustments') && query.includes('shift_id = ?')) {
    return [[{ adjustment_count: 0, cash_refunds_amount: 0, all_refunds_amount: 0 }]];
  }
  if (query.includes('FROM expenses') && query.includes('shift_id = ?')) {
    return [[{ cash_expense_count: 0, cash_expenses_amount: 0 }]];
  }
  if (query.includes('FROM products') && query.includes('FOR UPDATE')) {
    return [[{ id: 15, name: 'Hammer', price: 100, stock: 10,
      status: 'active', fulfillment_rule: 'all' }]];
  }
  if (query.includes('FROM inventory_movements') && query.includes('movement_count')) {
    return [[{ movement_count: 1, inventory_value: 300 }]];
  }
  if (query.startsWith('SELECT') && query.includes('FROM sales WHERE sale_id') && query.includes('admin_id')) {
    return [[{ sale_id: 20 }]];
  }
  if (query.startsWith('SELECT') && query.includes('FROM sales s') && query.includes('LEFT JOIN')) return [[]];
  if (query.startsWith('SELECT') && query.includes('FROM sale_adjustments')) return [[]];
  if (query.startsWith('UPDATE') || query.startsWith('INSERT')) {
    writes.push({ sql: query, args });
    return [{ affectedRows: 1, insertId: query.includes('INTO sales') ? 20 : query.includes('INTO cashier_shifts') ? 3 : 99 }];
  }
  throw new Error(`Unexpected test SQL: ${query}`);
};
const fakeConnection = () => ({
  query: queryStub, beginTransaction: async () => {},
  commit: async () => { commits++; }, rollback: async () => { rollbacks++; }, release: () => {},
});
pool.query = queryStub;
pool.getConnection = async () => fakeConnection();

try {
  await test('role authorization reads current role and rejects customer/admin privilege escalation', async () => {
    dbState = {}; writes = [];
    assert.equal((await call('GET', '/admin-only', 3, 'customer')).status, 403);
    assert.equal((await call('GET', '/admin-only', 2, 'admin')).status, 403); // stale token role claim
    assert.equal((await call('GET', '/admin-only', 1, 'admin')).status, 200);
    assert.equal((await call('POST', '/sales/pos', 3, 'customer', {})).status, 403);
    assert.equal((await call('POST', '/cashier-shifts/open', 3, 'customer', {})).status, 403);
    assert.equal(writes.length, 0);
  });

  await test('inactive cashier is blocked on protected POS APIs', async () => {
    dbState = { userOverrides: { 2: { status: 'inactive' } } };
    const result = await call('POST', '/sales/pos', 2, 'cashier', {});
    assert.equal(result.status, 401);
    dbState = {};
  });

  await test('cashier POS completes as own shift and creates sales, stock-out and audit writes', async () => {
    dbState = {}; writes = []; commits = 0;
    const result = await call('POST', '/sales/pos', 2, 'cashier', {
      items: [{ product: { id: 15 }, quantity: 1 }], posRequestId: 'unique-test-sale-1',
      paymentMethod: 'cash', cashReceived: 150, fulfillment: 'pickup', customerName: 'Walk-in'
    });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    assert.equal(result.data.saleId, 20);
    assert.equal(result.data.shiftId, 3);
    assert.equal(commits, 1);
    for (const fragment of ['INSERT INTO sales', 'INSERT INTO sale_items', 'UPDATE products SET stock',
      'INSERT INTO inventory_movements', 'INSERT INTO audit_logs']) {
      assert.ok(writes.some(x => x.sql.includes(fragment)), fragment);
    }
    const saleWrite = writes.find(x => x.sql.includes('INSERT INTO sales'));
    assert.equal(saleWrite.args[1], 2); // cashier user ID, not approving manager
    assert.equal(saleWrite.args[6], 'Walk-in');
  });

  await test('cashier shift closing and return/void cannot bypass Manager password', async () => {
    writes = []; commits = 0; dbState = {};
    const wrongApproval = { managerUsername: 'user1', managerPassword: 'wrong-pass' };
    const badClose = await call('POST', '/cashier-shifts/3/close', 2, 'cashier',
      { actualCash: 600, ...wrongApproval });
    assert.equal(badClose.status, 403);
    const badReturn = await call('POST', '/sale-adjustments/returns', 2, 'cashier',
      { saleId: 20, ...wrongApproval });
    assert.equal(badReturn.status, 403);
    const badVoid = await call('POST', '/sale-adjustments/voids', 2, 'cashier',
      { saleId: 20, ...wrongApproval });
    assert.equal(badVoid.status, 403);
    assert.equal(writes.filter(w => w.sql.includes('INSERT INTO audit_logs')).length, 3);
    assert.equal(writes.filter(w => !w.sql.includes('INSERT INTO audit_logs')).length, 0);
    assert.equal(commits, 0);
  });

  await test('valid manager approval allows cashier closing and writes manager identity in same audit transaction', async () => {
    writes = []; commits = 0; dbState = {};
    const response = await call('POST', '/cashier-shifts/3/close', 2, 'cashier', {
      actualCash: 600, notes: 'Balanced at close', managerUsername: 'user1',
      managerPassword: 'Manager#Strong123'
    });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(commits, 1);
    assert.ok(writes.some(x => x.sql.startsWith('UPDATE cashier_shifts')));
    const audit = writes.find(x => x.sql.includes('INTO audit_logs'));
    assert.ok(audit, 'audit record required');
    const joined = audit.args.filter(x => typeof x === 'string').join(' ');
    assert.match(joined, /approved_by_manager_id/);
    assert.doesNotMatch(joined, /Manager#Strong123/);
  });

  await test('customers cannot submit adjustments; restricted reports reject cashier', async () => {
    writes = []; dbState = {};
    assert.equal((await call('POST', '/sale-adjustments/voids', 3, 'customer', { saleId: 20 })).status, 403);
    assert.equal((await call('GET', '/sales/history', 2, 'cashier')).status, 403);
    assert.equal((await call('GET', '/sale-adjustments/sales/999/eligibility', 2, 'cashier')).status, 404);
    assert.equal(writes.length, 0);
  });
} finally {
  pool.query = originalQuery;
  pool.getConnection = originalGetConnection;
  await new Promise(resolve => server.close(resolve));
}

// File policy checks supplement mocked HTTP tests. They do not replace DB tests.
const here = path.dirname(fileURLToPath(import.meta.url));
const read = pathName => fs.readFileSync(path.join(here, '..', pathName), 'utf8');
await test('no public staff registration, POS permission separation and manual schema change', () => {
  assert.match(read('routes/auth.js'), /router\.post\('\/staff\/cashiers', authenticateToken, requireSuperAdmin/);
  assert.match(read('routes/sales.js'), /router\.get\('\/history', requireAdmin/);
  assert.match(read('routes/saleAdjustments.js'), /requireCashierSaleOwnership, requireActionApproval\('sale_adjustment'\)/);
  assert.match(read('migrations/20261107_cashier_role_MANUAL_REVIEW.sql'), /ENUM\('customer','admin','cashier'\)/);
});
