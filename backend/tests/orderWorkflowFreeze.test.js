import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { readFile } from 'node:fs/promises';

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'workflow-freeze-secret-not-for-deployment';
process.env.EMAIL_USER = '';
process.env.EMAIL_APP_PASSWORD = '';

const { default: pool } = await import('../db.js');
const { default: router } = await import('../routes/orders.js');

const backendSource = await readFile(new URL('../routes/orders.js', import.meta.url), 'utf8');
const adminSource = await readFile(new URL('../../project/src/pages/AdminDashboard.tsx', import.meta.url), 'utf8');
const customerSource = await readFile(new URL('../../project/src/pages/CustomerDashboard.tsx', import.meta.url), 'utf8');

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function actionFixture(t, initialOrder, { paid = false } = {}) {
  const order = {
    id: 'ORD-WORKFLOW-FIXTURE',
    user_id: 2,
    fulfillment: 'pickup',
    status: 'pending',
    previous_status: null,
    admin_message: null,
    payment_method: 'cash',
    payment_status: 'Pending',
    paymongo_link_id: null,
    created_at: new Date(),
    ...initialOrder,
  };

  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  let historyId = 1;

  const query = async (statement, params = []) => {
    const sql = statement.trim().replace(/\s+/g, ' ');

    if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
      return [[structuredClone(order)]];
    }

    if (sql.includes('SELECT payment_id') && sql.includes('FROM payments')) {
      return [paid ? [{ payment_id: 77 }] : []];
    }

    if (sql.startsWith('UPDATE payments')) {
      return [{ affectedRows: 1 }];
    }

    if (sql.startsWith('UPDATE orders SET status = ?')) {
      order.status = params[0];
      order.previous_status = params[1];
      order.admin_message = params[2];
      if (params[3] === 'cancelled') order.payment_status = 'Cancelled';
      return [{ affectedRows: 1 }];
    }

    if (sql.startsWith('INSERT INTO order_status_history')) {
      return [{ affectedRows: 1, insertId: historyId++ }];
    }

    if (sql.startsWith('INSERT INTO conversations')) {
      return [{ affectedRows: 1 }];
    }

    if (sql.startsWith('SELECT conversation_id FROM conversations')) {
      return [[{ conversation_id: 10 }]];
    }

    if (sql.startsWith('INSERT IGNORE INTO conversation_messages')) {
      return [{ affectedRows: 1, insertId: 20 }];
    }

    if (sql.startsWith('UPDATE conversations')) {
      return [{ affectedRows: 1 }];
    }

    throw new Error('Unexpected workflow fixture SQL: ' + sql);
  };

  pool.getConnection = async () => ({
    query,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
  });
  pool.query = query;

  const app = express();
  app.use(express.json());
  app.use('/api/orders', router);
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
  const origin = `http://127.0.0.1:${server.address().port}/api/orders/${order.id}`;

  async function action(action, reason = 'Regression reason') {
    const response = await fetch(origin + '/action', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, reason }),
    });
    return { status: response.status, body: await response.json() };
  }

  return { order, action };
}

test('frozen normal status transitions do not use Cancelled as a shortcut', () => {
  assert.match(backendSource, /pending:\s*\[\s*'approved',\s*'rejected'\s*\]/s);
  assert.match(backendSource, /awaiting_payment:\s*\[\]/);
  assert.match(backendSource, /approved:\s*\[\s*'processing'\s*\]/s);
  assert.match(backendSource, /out_for_delivery:\s*\[\s*'completed'\s*\]/s);
});

test('Admin UI exposes Delivery exception actions only at the intended stages', () => {
  assert.match(adminSource, /\['approved', 'processing'\]\.includes\(order\.status\)/);
  assert.match(adminSource, /order\.status === 'out_for_delivery'/);
  assert.match(adminSource, /Cancel Unpaid Order/);
});

test('Customer UI has aligned status labels and Delivery exception guidance', () => {
  assert.match(customerSource, /out_for_delivery: 'Out for Delivery'/);
  assert.match(customerSource, /failed_delivery: 'Failed Delivery'/);
  assert.match(customerSource, /deactivated: 'Temporarily Deactivated'/);
  assert.match(customerSource, /Delivery Attempt Unsuccessful/);
});

test('customer-facing order update history includes Delivery exception reasons', () => {
  assert.match(backendSource, /to_status IN \('failed_delivery', 'deactivated', 'cancelled'\)/);
  assert.match(backendSource, /from_status IN \('failed_delivery', 'deactivated'\)/);
});

test('Pending Pickup cannot be cancelled through the Admin action endpoint', async t => {
  const f = await actionFixture(t, { fulfillment: 'pickup', status: 'pending' });
  const result = await f.action('cancel');
  assert.equal(result.status, 409);
  assert.equal(f.order.status, 'pending');
});

test('Pending Delivery cannot be deactivated or permanently cancelled', async t => {
  const f = await actionFixture(t, { fulfillment: 'delivery', status: 'pending' });
  assert.equal((await f.action('deactivate')).status, 409);
  assert.equal((await f.action('cancel_permanently')).status, 409);
  assert.equal(f.order.status, 'pending');
});

test('Awaiting Payment cancellation is blocked before the 48-hour review point', async t => {
  const f = await actionFixture(t, {
    fulfillment: 'pickup', status: 'awaiting_payment', payment_method: 'paymongo', created_at: hoursAgo(24),
  });
  const result = await f.action('cancel');
  assert.equal(result.status, 409);
  assert.match(result.body.error, /48-hour payment period/i);
  assert.equal(f.order.status, 'awaiting_payment');
});

test('Awaiting Payment may be cancelled after the 48-hour review point when still unpaid', async t => {
  const f = await actionFixture(t, {
    fulfillment: 'pickup', status: 'awaiting_payment', payment_method: 'paymongo', created_at: hoursAgo(49),
  });
  const result = await f.action('cancel');
  assert.equal(result.status, 200);
  assert.equal(f.order.status, 'cancelled');
});

test('Delivery may be temporarily deactivated only before dispatch', async t => {
  const f = await actionFixture(t, { fulfillment: 'delivery', status: 'approved' });
  const result = await f.action('deactivate');
  assert.equal(result.status, 200);
  assert.equal(f.order.status, 'deactivated');
  assert.equal(f.order.previous_status, 'approved');
});

test('Out for Delivery allows Failed Delivery but blocks Deactivate and permanent cancellation', async t => {
  const f = await actionFixture(t, { fulfillment: 'delivery', status: 'out_for_delivery' });
  assert.equal((await f.action('deactivate')).status, 409);
  assert.equal((await f.action('cancel_permanently')).status, 409);
  const failed = await f.action('failed_delivery');
  assert.equal(failed.status, 200);
  assert.equal(f.order.status, 'failed_delivery');
  assert.equal(f.order.previous_status, 'out_for_delivery');
});

test('Failed Delivery can be reactivated back to Out for Delivery', async t => {
  const f = await actionFixture(t, {
    fulfillment: 'delivery', status: 'failed_delivery', previous_status: 'out_for_delivery',
  });
  const result = await f.action('reactivate', 'Retry delivery');
  assert.equal(result.status, 200);
  assert.equal(f.order.status, 'out_for_delivery');
  assert.equal(f.order.previous_status, null);
});

test('Paid online delivery cancellation remains locked at an otherwise eligible stage', async t => {
  const f = await actionFixture(t, {
    fulfillment: 'delivery', status: 'approved', payment_method: 'paymongo', payment_status: 'Paid',
  }, { paid: true });
  const result = await f.action('cancel_permanently');
  assert.equal(result.status, 409);
  assert.match(result.body.error, /refund processing is not supported/i);
  assert.equal(f.order.status, 'approved');
});
