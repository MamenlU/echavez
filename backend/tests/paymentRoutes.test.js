// Real HTTP/auth handlers with an in-memory SQL adapter and simulated PayMongo.
// These tests do NOT claim to test MariaDB or the live payment service.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'rayjin-fixture-secret-not-for-deployment';
// Isolated tests must never send real Admin notification emails.
process.env.EMAIL_USER = '';
process.env.EMAIL_APP_PASSWORD = '';
const { createPaymongoRouter } = await import('../routes/paymongo.js');

function setupState() {
    return { order: { id: 'ORD-FIXTURE', user_id: 2, total: '200.00', service_fee: '50.00', delivery_fee: null,
        payment_method: 'gcash', payment_status: 'Pending', status: 'pending', fulfillment: 'shop_go', paymongo_link_id: 'cs_fixture' },
        payments: [], history: [], calls: [] };
}
function memoryDatabase(state) {
    let snapshot;
    return { query: async (_sql, [id]) => [[{ id, username: `user${id}`, role: Number(id) === 1 ? 'admin' : 'customer', status: 'active' }]], getConnection: async () => ({
        beginTransaction: async () => { snapshot = structuredClone(state); },
        commit: async () => {},
        rollback: async () => { for (const key of ['order', 'payments', 'history']) state[key] = structuredClone(snapshot[key]); },
        release() {},
        async query(sql, p) {
            state.calls.push(sql);
            if (sql.startsWith('SELECT * FROM orders')) return [[structuredClone(state.order)].filter(row => row.id === p[0])];
            if (sql.startsWith('SELECT * FROM payments')) return [state.payments.filter(row => row.gateway_session_id === p[0]).map(row => structuredClone(row))];
            if (sql.startsWith('INSERT INTO payments')) {
                if (state.payments.some(row => row.gateway_session_id === p[2])) throw new Error('Duplicate session');
                state.payments.push({
                    order_id: p[0], payment_provider: p[1], gateway_session_id: p[2], payment_method: p[3],
                    amount: p[4], livemode: p[5], checkout_url: p[6], payment_status: 'Pending',
                });
                return [{ insertId: state.payments.length }];
            }
            if (sql.includes("SET payment_status = 'Cancelled'")) {
                const row = state.payments.find(row => row.gateway_session_id === p[0]);
                if (row && row.payment_status !== 'Paid') row.payment_status = 'Cancelled';
            } else if (sql.startsWith('UPDATE payments')) {
                const row = state.payments.find(row => row.gateway_session_id === p[4]);
                Object.assign(row, { payment_status: p[0], gateway_transaction_id: p[1], payment_method: p[2] });
            } else if (sql.startsWith('UPDATE orders SET payment_status')) {
                state.order.payment_status = p[0]; state.order.payment_method = p[1];
            } else if (sql.startsWith('UPDATE orders SET paymongo_link_id')) {
                state.order.paymongo_link_id = p[0]; state.order.payment_status = 'Pending';
            } else if (/UPDATE orders\s+SET\s+status = \?/.test(sql)) {
                state.order.status = p[0];
                if (sql.includes('scheduled_pickup_date = NULL')) {
                    state.order.scheduled_pickup_date = null;
                    state.order.scheduled_pickup_time = null;
                }
            }
            else if (sql.startsWith('INSERT INTO order_status_history')) state.history.push(p[0]);
            else throw new Error('Unexpected SQL in payment handler: ' + sql);
            return [{ affectedRows: 1 }];
        },
    }) };
}
function providerResource(paid = false, { id = 'cs_fixture', status = 'active' } = {}) {
    return { data: { id, type: 'checkout_session', attributes: {
        livemode: false, reference_number: 'ORD-FIXTURE', status,
        checkout_url: `https://checkout.paymongo.com/${id}`,
        line_items: [{ amount: 25000, quantity: 1, currency: 'PHP' }],
        payments: paid ? [{ id: 'pay_fixture', type: 'payment', attributes: {
            amount: 25000, currency: 'PHP', livemode: false, status: 'paid', source: { type: 'gcash' }, refunds: [],
        } }] : [],
    } } };
}
async function fixture(t, { paid = false, state = setupState(), mutate, gatewayError = false, requestImpl } = {}) {
    const sent = [];
    const app = express();
    app.use(express.json());
    app.use('/api/paymongo', createPaymongoRouter({
        database: memoryDatabase(state), env: { PAYMONGO_SECRET_KEY: 'sk_test_fixture', FRONTEND_URL: 'http://localhost:5173' },
        request: async (url, init) => {
            sent.push({ url, init });
            if (gatewayError) throw new Error('Simulated provider timeout');
            if (requestImpl) return requestImpl(url, init, sent);
            const data = providerResource(paid);
            mutate?.(data);
            return { ok: true, status: 200, json: async () => data };
        },
    }));
    const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    t.after(() => new Promise(resolve => server.close(resolve)));
    const token = (id = 2, role = 'customer') => jwt.sign({ id, role }, process.env.JWT_SECRET);
    async function post(path, body = { orderId: 'ORD-FIXTURE' }, auth = token()) {
        const res = await fetch('http://127.0.0.1:' + server.address().port + '/api/paymongo/' + path, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
            body: JSON.stringify(body),
        });
        return { status: res.status, body: await res.json() };
    }
    return { state, sent, post, token };
}

test('Payment endpoints reject missing authentication before SQL or provider calls', async t => {
    const f = await fixture(t);
    for (const path of ['create-link', 'continue-payment', 'confirm-payment', 'cancel-payment']) assert.equal((await f.post(path, undefined, null)).status, 401);
    assert.equal(f.sent.length, 0); assert.equal(f.state.calls.length, 0);
});
test('Another customer cannot pay or confirm someone else’s order', async t => {
    const f = await fixture(t);
    for (const path of ['create-link', 'continue-payment', 'confirm-payment', 'cancel-payment']) assert.equal((await f.post(path, undefined, f.token(3))).status, 404);
    assert.equal(f.sent.length, 0);
});
test('Unpaid success return does not mark paid, approve, create sales, or deduct stock', async t => {
    const f = await fixture(t);
    const r = await f.post('confirm-payment', { orderId: 'ORD-FIXTURE', status: 'paid', amount: 250 });
    assert.equal(r.status, 200); assert.equal(r.body.paymentStatus, 'Pending');
    assert.equal(f.state.order.status, 'pending'); assert.equal(f.state.order.payment_status, 'Pending');
    assert.equal(f.state.history.length, 0);
    assert.ok(f.state.calls.every(sql => !/sales|inventory_movements|UPDATE products/.test(sql)));
});
test('Verified payment stays pending for manual admin approval', async t => {
    const f = await fixture(t, { paid: true });
    assert.equal((await f.post('confirm-payment')).body.paymentStatus, 'Paid');
    assert.equal(f.state.order.status, 'pending');
    assert.equal(f.state.payments[0].gateway_transaction_id, 'pay_fixture');
    assert.equal(f.state.payments.length, 1);
});
test('Repeated confirmation is idempotent, including legacy awaiting_payment state', async t => {
    const state = setupState(); state.order.status = 'awaiting_payment';
    const f = await fixture(t, { paid: true, state });
    await f.post('confirm-payment'); await f.post('confirm-payment');
    assert.equal(state.order.status, 'pending'); assert.equal(state.payments.length, 1); assert.equal(state.history.length, 1);
});
for (const fulfillment of ['pickup', 'delivery', 'shop_go']) {
    test(`Verified ${fulfillment} payment retains the current fulfillment approval rule`, async t => {
        const state = setupState();
        state.order.status = 'awaiting_payment'; state.order.fulfillment = fulfillment;
        state.order.scheduled_pickup_date = '2026-12-20'; state.order.scheduled_pickup_time = '09:00';
        const f = await fixture(t, { paid: true, state });
        const result = await f.post('confirm-payment');
        assert.equal(result.status, 200); assert.equal(state.order.payment_status, 'Paid');
        assert.equal(state.order.status, fulfillment === 'pickup' ? 'approved' : 'pending');
        if (fulfillment === 'shop_go') {
            assert.equal(state.order.scheduled_pickup_date, null);
            assert.equal(state.order.scheduled_pickup_time, null);
        }
        assert.ok(state.calls.every(sql => !/sales|inventory_movements|UPDATE products/.test(sql)));
    });
}
test('Admin may verify an order but cannot open another customer’s checkout', async t => {
    const f = await fixture(t, { paid: true });
    assert.equal((await f.post('confirm-payment', undefined, f.token(1, 'admin'))).body.paymentStatus, 'Paid');
    assert.equal((await f.post('create-link', undefined, f.token(1, 'admin'))).status, 404);
});
test('Create ignores a forged browser amount and payment method', async t => {
    const state = setupState(); state.order.paymongo_link_id = null;
    const f = await fixture(t, { state });
    const r = await f.post('create-link', { orderId: 'ORD-FIXTURE', amount: 1, paymentMethod: 'card' });
    assert.equal(r.status, 200);
    const payload = JSON.parse(f.sent[0].init.body).data.attributes;
    assert.equal(payload.line_items[0].amount, 25000);
    assert.deepEqual(payload.payment_method_types, ['gcash']);
    assert.equal(state.payments[0].amount, 250);
    assert.equal(state.payments[0].livemode, 0);
    assert.equal(state.order.paymongo_link_id, 'cs_fixture');
});
test('Repeated Pay Online reuses the existing checkout, not a second charge attempt', async t => {
    const f = await fixture(t);
    await f.post('create-link'); await f.post('create-link');
    assert.equal(f.state.payments.length, 1);
    assert.ok(f.sent.every(call => call.init.method === 'GET'));
});
test('Cancel return does not cancel the saved order or claim a refund', async t => {
    const f = await fixture(t);
    assert.equal((await f.post('cancel-payment')).body.paymentStatus, 'Pending');
    assert.equal(f.state.order.status, 'pending');
});
test('A paid result on the cancel URL is still correctly recorded', async t => {
    const f = await fixture(t, { paid: true });
    assert.equal((await f.post('cancel-payment')).body.paymentStatus, 'Paid');
});
test('Continue Payment reuses the active saved Checkout Session', async t => {
    const state = setupState(); state.order.status = 'awaiting_payment';
    const f = await fixture(t, { state });
    const first = await f.post('continue-payment');
    const second = await f.post('continue-payment');
    assert.equal(first.status, 200); assert.equal(second.status, 200);
    assert.equal(first.body.checkoutUrl, 'https://checkout.paymongo.com/cs_fixture');
    assert.equal(second.body.checkoutUrl, 'https://checkout.paymongo.com/cs_fixture');
    assert.equal(state.order.paymongo_link_id, 'cs_fixture');
    assert.equal(state.payments.length, 1);
    assert.ok(f.sent.every(call => call.init.method === 'GET'));
});

test('Continue Payment never creates another session for an already-paid order', async t => {
    const state = setupState(); state.order.payment_status = 'Paid'; state.order.status = 'pending';
    const f = await fixture(t, { state });
    const r = await f.post('continue-payment');
    assert.equal(r.status, 200); assert.equal(r.body.paymentStatus, 'Paid');
    assert.equal(r.body.alreadyPaid, true); assert.equal(f.sent.length, 0);
});

test('Cancelled and rejected orders cannot reopen or replace PayMongo checkout', async t => {
    for (const status of ['cancelled', 'rejected']) {
        const state = setupState(); state.order.status = status; state.order.payment_status = 'Cancelled';
        const f = await fixture(t, { state });
        const r = await f.post('continue-payment');
        assert.equal(r.status, 409); assert.equal(f.sent.length, 0);
        assert.equal(state.order.payment_status, 'Cancelled');
    }
});

test('Expired Checkout Session is replaced once and the new session becomes current', async t => {
    const state = setupState();
    state.order.status = 'awaiting_payment';
    state.payments.push({
        order_id: 'ORD-FIXTURE', gateway_session_id: 'cs_fixture', payment_method: 'gcash', amount: 250,
        livemode: false, checkout_url: 'https://checkout.paymongo.com/cs_fixture', payment_status: 'Pending',
    });
    const f = await fixture(t, {
        state,
        requestImpl: async (_url, init) => {
            if (init.method === 'GET') {
                return { ok: true, status: 200, json: async () => providerResource(false, { id: 'cs_fixture', status: 'expired' }) };
            }
            return { ok: true, status: 200, json: async () => providerResource(false, { id: 'cs_replacement', status: 'active' }) };
        },
    });
    const r = await f.post('continue-payment');
    assert.equal(r.status, 200);
    assert.equal(r.body.checkoutUrl, 'https://checkout.paymongo.com/cs_replacement');
    assert.equal(state.order.paymongo_link_id, 'cs_replacement');
    assert.equal(state.order.payment_status, 'Pending');
    assert.equal(state.payments.length, 2);
    assert.equal(state.payments[0].payment_status, 'Cancelled');
    assert.equal(state.payments[1].gateway_session_id, 'cs_replacement');
    assert.deepEqual(f.sent.map(call => call.init.method), ['GET', 'POST']);
});

test('Provider-confirmed missing saved session may be replaced, but transient failure may not', async t => {
    const missingState = setupState(); missingState.order.status = 'awaiting_payment';
    missingState.payments.push({
        order_id: 'ORD-FIXTURE', gateway_session_id: 'cs_fixture', payment_method: 'gcash', amount: 250,
        livemode: false, checkout_url: 'https://checkout.paymongo.com/cs_fixture', payment_status: 'Pending',
    });
    const missing = await fixture(t, {
        state: missingState,
        requestImpl: async (_url, init) => {
            if (init.method === 'GET') return { ok: false, status: 404, json: async () => ({ errors: [] }) };
            return { ok: true, status: 200, json: async () => providerResource(false, { id: 'cs_replacement', status: 'active' }) };
        },
    });
    const replaced = await missing.post('continue-payment');
    assert.equal(replaced.status, 200);
    assert.equal(missingState.order.paymongo_link_id, 'cs_replacement');
    assert.equal(missingState.payments[0].payment_status, 'Cancelled');

    const transientState = setupState(); transientState.order.status = 'awaiting_payment';
    const transient = await fixture(t, { state: transientState, gatewayError: true });
    const failed = await transient.post('continue-payment');
    assert.equal(failed.status, 500);
    assert.equal(transientState.order.paymongo_link_id, 'cs_fixture');
    assert.equal(transientState.payments.length, 0);
});

test('A locally paid record is never replaced when the saved provider session is unavailable', async t => {
    const state = setupState(); state.order.status = 'awaiting_payment'; state.order.payment_status = 'Pending';
    state.payments.push({
        order_id: 'ORD-FIXTURE', gateway_session_id: 'cs_fixture', payment_method: 'gcash', amount: 250,
        livemode: false, checkout_url: 'https://checkout.paymongo.com/cs_fixture', payment_status: 'Paid',
    });
    const f = await fixture(t, {
        state,
        requestImpl: async () => ({ ok: false, status: 404, json: async () => ({ errors: [] }) }),
    });
    const r = await f.post('continue-payment');
    assert.equal(r.status, 409);
    assert.equal(state.order.paymongo_link_id, 'cs_fixture');
    assert.equal(state.payments.length, 1);
    assert.equal(state.payments[0].payment_status, 'Paid');
});

test('Wrong provider amount rolls the database transaction back', async t => {
    const f = await fixture(t, { paid: true, mutate: r => { r.data.attributes.payments[0].attributes.amount = 1; } });
    assert.equal((await f.post('confirm-payment')).status, 409);
    assert.equal(f.state.payments.length, 0); assert.equal(f.state.order.payment_status, 'Pending');
});
test('Provider failure leaves order and payment records unchanged', async t => {
    const f = await fixture(t, { gatewayError: true });
    assert.equal((await f.post('confirm-payment')).status, 500);
    assert.equal(f.state.payments.length, 0); assert.equal(f.state.order.payment_status, 'Pending');
});
