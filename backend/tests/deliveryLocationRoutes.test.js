// Real Express/JWT order handlers with an isolated SQL adapter.
// This is not a live MariaDB or live PayMongo test. No email is sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'location-fixture-secret-not-for-deployment';
process.env.EMAIL_USER = '';
process.env.EMAIL_APP_PASSWORD = '';
const { default: pool } = await import('../db.js');
const { default: router } = await import('../routes/orders.js');

async function fixture(t, {
    load = 'light',
    surcharge = 25,
    priorOrders = 1,
    activeRate = true,
    paidOrder = false,
    fulfillmentRule = 'all',
    bulkThreshold = null,
    itemQuantity = 2,
} = {}) {
    const orders = [], calls = [], items = [];
    let transactionCount = 0;
    const originalQuery = pool.query;
    const originalConnection = pool.getConnection;
    const query = async (statement, params = []) => {
        const sql = statement.trim().replace(/\s+/g, ' ');
        calls.push({ sql, params });
        if (/SELECT .*FROM users/.test(sql)) return [[{ id: 2, first_name: 'Test', last_name: 'Customer', phone_number: '+639123456789', first_order_discount_used: priorOrders ? 1 : 0 }]];
        if (sql.startsWith('SELECT COUNT(*) AS order_count')) return [[{ order_count: priorOrders }]];
        if (sql.startsWith('SELECT payment_id FROM payments')) return [paidOrder ? [{ payment_id: 1 }] : []];
        if (paidOrder && sql.includes('FROM orders WHERE id = ? FOR UPDATE')) return [[{
            id: params[0], status: 'pending', fulfillment: 'delivery', payment_method: 'paymongo',
            payment_status: 'Paid', total: 1000, service_fee: 0, delivery_fee: 85,
        }]];
        if (sql.startsWith('SELECT id, name, price, stock')) return [[{
            id: 11,
            name: 'Fixture product',
            price: 500,
            stock: 100,
            delivery_class: load,
            bulk_quantity_threshold: bulkThreshold,
            fulfillment_rule: fulfillmentRule,
        }]];
        if (sql.startsWith('SELECT surcharge')) return [activeRate ? [{ surcharge }] : []];
        if (sql.startsWith('INSERT INTO orders')) {
            const fields = sql.match(/INSERT INTO orders \((.*?)\) VALUES/)[1].split(',').map(field => field.trim());
            assert.equal(fields.length, params.length);
            orders.push(Object.fromEntries(fields.map((field, i) => [field, params[i]])));
        } else if (sql.startsWith('INSERT INTO order_items')) items.push(params);
        else if (sql.startsWith('UPDATE orders SET original_subtotal')) {
            const order = orders.find(order => order.id === params[6]);
            Object.assign(order, { original_subtotal: params[0], discount_amount: params[1], total: params[2],
                service_fee: params[3], delivery_fee: params[4], delivery_load_class: params[5] });
        } else if (sql.startsWith('INSERT INTO order_status_history') || sql.startsWith('UPDATE users SET first_order_discount_used')) {
            // State irrelevant to the location assertions; captured in calls for regression checking.
        } else if (/FROM orders o JOIN users u/.test(sql)) return [structuredClone(orders)];
        else if (sql.startsWith('SELECT oi.quantity')) return [[]];
        else if (/FROM order_status_history/.test(sql)) return [[]];
        else throw new Error('Unexpected fixture SQL: ' + sql);
        return [{ affectedRows: 1 }];
    };
    pool.query = query;
    pool.getConnection = async () => {
        let snapshot;
        return { query, beginTransaction: async () => { transactionCount++; snapshot = structuredClone({ orders, items }); },
            commit: async () => {}, rollback: async () => {
                orders.splice(0, orders.length, ...snapshot.orders);
                items.splice(0, items.length, ...snapshot.items);
            }, release() {} };
    };
    const app = express(); app.use(express.json()); app.use('/api/orders', router);
    const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        pool.query = originalQuery; pool.getConnection = originalConnection;
    });
    const origin = `http://127.0.0.1:${server.address().port}/api/orders`;
    const token = role => jwt.sign({ id: role === 'admin' ? 1 : 2, role }, process.env.JWT_SECRET);
    const body = {
        userId: 999, fulfillment: 'delivery', paymentMethod: 'cash', status: 'pending',
        items: [{ product: { id: 11, price: 1 }, quantity: itemQuantity }],
        deliveryContactPerson: 'Test Customer', deliveryContactNumber: '+639123456789',
        deliveryMunicipality: 'Initao', deliveryBarangay: 'Poblacion', deliveryAddress: 'Fixture address',
        deliveryLatitude: 8.4991234, deliveryLongitude: 124.3031234,
    };
    const post = async overrides => {
        const res = await fetch(origin, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('customer')}` },
            body: JSON.stringify({ ...body, ...overrides }) });
        return { status: res.status, body: await res.json() };
    };
    const getAdmin = async () => {
        const res = await fetch(origin, { headers: { Authorization: `Bearer ${token('admin')}` } });
        return { status: res.status, body: await res.json() };
    };
    const adminPut = async (path, body) => {
        const res = await fetch(origin + path, { method: 'PUT', headers: {
            'Content-Type': 'application/json', Authorization: `Bearer ${token('admin')}`,
        }, body: JSON.stringify(body) });
        return { status: res.status, body: await res.json() };
    };
    return { orders, calls, post, getAdmin, adminPut, transactionCount: () => transactionCount };
}

test('Delivery pin is saved on its own authenticated order and returned to Admin', async t => {
  const f = await fixture(t);

  const first = await f.post({
    deliveryLatitude: 8.4991234,
    deliveryLongitude: 124.3031234
  });

  const second = await f.post({
    deliveryLatitude: 8.6,
    deliveryLongitude: 124.4
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.body.orderId, second.body.orderId);

  const result = await f.getAdmin();
  assert.equal(result.status, 200);

  const order = result.body.find(order => order.id === first.body.orderId);

  assert.equal(order.user_id, 2);
  assert.equal(order.delivery_latitude, 8.4991234);
  assert.equal(order.delivery_longitude, 124.3031234);
  assert.equal(order.delivery_address, 'Fixture address');

  assert.equal(
    result.body.find(order => order.id === second.body.orderId).delivery_latitude,
    8.6
  );
});
for (const load of ['light', 'standard', 'bulky']) {
    test(`${load} fee and surcharge remain identical across valid map coordinates`, async t => {
        const f = await fixture(t, { load, surcharge: 37 });

        const first = await f.post({});

        const second = await f.post({
            deliveryLatitude: 8.6,
            deliveryLongitude: 124.4
        });

        const base = {
            light: 60,
            standard: 150,
            bulky: 300
        }[load];

        assert.equal(first.status, 201);
        assert.equal(second.status, 201);

        assert.equal(
            first.body.deliveryFee,
            base + 37
        );

        assert.equal(
            first.body.grandTotal,
            second.body.grandTotal
        );

        assert.equal(
            f.orders[1].delivery_latitude,
            8.6
        );
    });

}

test('Delivery-only quantity multiplies both the applicable base fee and location surcharge', async t => {
    const f = await fixture(t, {
        load: 'bulky',
        surcharge: 180,
        fulfillmentRule: 'delivery_only',
        itemQuantity: 2,
    });

    const twoResult = await f.post({});
    assert.equal(twoResult.status, 201);
    assert.equal(twoResult.body.deliveryFee, 960);
    assert.equal(twoResult.body.grandTotal, 1960);

    const threeResult = await f.post({
        items: [{ product: { id: 11, price: 1 }, quantity: 3 }],
    });
    assert.equal(threeResult.status, 201);
    assert.equal(threeResult.body.deliveryFee, 1440);
    assert.equal(threeResult.body.grandTotal, 2940);
});

test('ordinary Product quantity does not multiply the order-level Delivery fee', async t => {
    const f = await fixture(t, {
        load: 'bulky',
        surcharge: 180,
        fulfillmentRule: 'all',
        itemQuantity: 3,
    });
    const result = await f.post({});
    assert.equal(result.status, 201);
    assert.equal(result.body.deliveryFee, 480);
    assert.equal(result.body.grandTotal, 1980);
});

test('Delivery-only bulk threshold elevation applies before the quantity multiplier', async t => {
    const f = await fixture(t, {
        load: 'standard',
        bulkThreshold: 2,
        surcharge: 180,
        fulfillmentRule: 'delivery_only',
        itemQuantity: 2,
    });
    const result = await f.post({});
    assert.equal(result.status, 201);
    assert.equal(result.body.deliveryLoadClass, 'bulky');
    assert.equal(result.body.deliveryFee, 960);
});

test('First-order discount still applies only to products and preserves the delivery fee', async t => {
    const f = await fixture(t, { priorOrders: 0 });
    const result = await f.post({}); assert.equal(result.status, 201);
    assert.equal(result.body.originalSubtotal, 1000); assert.equal(result.body.discountAmount, 200);
    assert.equal(result.body.deliveryFee, 85); assert.equal(result.body.grandTotal, 885);
});
for (const fulfillment of ['pickup', 'shop_go']) {
    test(`${fulfillment} ignores supplied coordinates and retains its original fee`, async t => {
        const f = await fixture(t);
        const result = await f.post({ fulfillment, requestedPickupDate: '2026-12-20', requestedPickupTime: '09:00' });
        assert.equal(result.status, 201);
        assert.equal(f.orders[0].delivery_latitude, null); assert.equal(f.orders[0].delivery_longitude, null);
        assert.equal(result.body.deliveryFee, null); assert.equal(result.body.serviceFee, fulfillment === 'shop_go' ? 50 : 0);
    });
}
test('PayMongo delivery still starts Awaiting Payment without stock or sales effects', async t => {
    const f = await fixture(t);
    const result = await f.post({ paymentMethod: 'paymongo', status: 'awaiting_payment' });
    assert.equal(result.status, 201);
    assert.equal(f.orders[0].status, 'awaiting_payment'); assert.equal(f.orders[0].payment_status, 'Pending');
    assert.equal(result.body.grandTotal, 1085);
    assert.ok(f.calls.every(({ sql }) => !/UPDATE products|INSERT INTO sales|INSERT INTO inventory_movements/.test(sql)));
});
test('Invalid coordinates fail before beginning an order transaction', async t => {
    const f = await fixture(t);
for (const values of [
    {
        deliveryLatitude: null,
        deliveryLongitude: null
    },
    {
        deliveryLatitude: 91
    },
    {
        deliveryLongitude: null
    },
    {
        deliveryLatitude: ''
    },
    {
        deliveryLongitude: true
    }
]) {
    assert.equal(
        (await f.post(values)).status,
        400
    );
}
    assert.equal(f.orders.length, 0); assert.equal(f.transactionCount(), 0);
});
test('A map pin cannot bypass written address, existing area validation, or inactive rates', async t => {
    const f = await fixture(t, { activeRate: false });
    assert.equal((await f.post({ deliveryAddress: '' })).status, 400);
    assert.equal((await f.post({ deliveryBarangay: 'Outside area' })).status, 400);
    assert.equal((await f.post({})).status, 400);
    assert.equal(f.orders.length, 0);
});
test('Paid PayMongo delivery still blocks Reject and cancellation through actual Admin routes', async t => {
    const f = await fixture(t, { paidOrder: true });
    assert.equal((await f.adminPut('/ORD-PAID-FIXTURE/status', { status: 'rejected' })).status, 409);
    // Cancellation is intentionally not a normal status transition anymore.
    assert.equal((await f.adminPut('/ORD-PAID-FIXTURE/status', { status: 'cancelled' })).status, 400);
    for (const action of ['cancel', 'cancel_permanently']) {
        assert.equal((await f.adminPut('/ORD-PAID-FIXTURE/action', { action, reason: 'Fixture test' })).status, 409);
    }
    assert.ok(f.calls.every(({ sql }) => sql.startsWith('SELECT')));
});
