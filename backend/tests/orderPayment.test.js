import test from 'node:test';
import assert from 'node:assert/strict';
import { orderAmount, paymentProof, validPickupSchedule } from '../lib/orderPayment.js';

const options = { sessionId: 'cs_fixture', orderId: 'ORD-FIXTURE', amount: 25000, livemode: false };
function resource(paid = false) {
    return { data: { id: options.sessionId, type: 'checkout_session', attributes: {
        livemode: false, reference_number: options.orderId, status: 'active',
        line_items: [{ amount: 25000, quantity: 1, currency: 'PHP' }],
        payment_intent: { attributes: { amount: 25000, currency: 'PHP', status: paid ? 'succeeded' : 'awaiting_payment_method' } },
        payments: paid ? [{ id: 'pay_fixture', type: 'payment', attributes: {
            amount: 25000, currency: 'PHP', livemode: false, status: 'paid', source: { type: 'gcash' }, refunds: [],
        } }] : [],
    } } };
}
test('Database subtotal and fees determine the centavo amount', () => {
    assert.equal(orderAmount({ total: '200.00', service_fee: '50.00', delivery_fee: null }), 25000);
    assert.equal(orderAmount({ total: '0.10', service_fee: '0.20' }), 30);
    for (const value of [NaN, -1, 'not money', Infinity]) assert.throws(() => orderAmount({ total: value }));
});
test('A successful return or succeeded intent with no paid transaction stays Pending', () => {
    const r = resource();
    r.data.attributes.payment_intent.attributes.status = 'succeeded';
    assert.deepEqual(paymentProof(r, options), { status: 'Pending' });
});
test('Verified PHP payment records its actual method and transaction', () => {
    assert.deepEqual(paymentProof(resource(true), options), { status: 'Paid', transactionId: 'pay_fixture', method: 'gcash' });
});
for (const [name, mutate] of [
    ['wrong session', r => { r.data.id = 'cs_other'; }],
    ['wrong order reference', r => { r.data.attributes.reference_number = 'ORD-OTHER'; }],
    ['wrong total', r => { r.data.attributes.line_items[0].amount = 1; }],
    ['wrong currency', r => { r.data.attributes.line_items[0].currency = 'USD'; }],
    ['wrong gateway mode', r => { r.data.attributes.livemode = true; }],
    ['wrong paid amount', r => { r.data.attributes.payments[0].attributes.amount = 1; }],
    ['wrong paid currency', r => { r.data.attributes.payments[0].attributes.currency = 'USD'; }],
    ['wrong paid mode', r => { r.data.attributes.payments[0].attributes.livemode = true; }],
    ['missing transaction ID', r => { r.data.attributes.payments[0].id = ''; }],
    ['refunded payment', r => { r.data.attributes.payments[0].attributes.refunds = [{}]; }],
    ['multiple paid transactions', r => { r.data.attributes.payments.push(structuredClone(r.data.attributes.payments[0])); }],
]) test('Reject ' + name, () => { const r = resource(true); mutate(r); assert.throws(() => paymentProof(r, options)); });
test('Failed attempt, expired checkout and processing are distinct', () => {
    const r = resource();
    r.data.attributes.payment_intent.attributes.last_payment_error = { code: 'declined' };
    assert.equal(paymentProof(r, options).status, 'Failed');
    r.data.attributes.status = 'expired';
    assert.equal(paymentProof(r, options).status, 'Cancelled');
    r.data.attributes.payment_intent.attributes.status = 'processing';
    assert.equal(paymentProof(r, options).status, 'Pending');
});
test('Legacy saved Link can be verified without creating another checkout', () => {
    const r = resource(true);
    const a = r.data.attributes;
    r.data.id = 'link_fixture'; r.data.type = 'link';
    a.remarks = options.orderId; a.amount = 25000; a.currency = 'PHP';
    a.payments = a.payments.map(data => ({ data }));
    assert.equal(paymentProof(r, { ...options, sessionId: 'link_fixture' }).status, 'Paid');
});
test('Shop & Go validates real future appointments in Philippine time', () => {
    const now = Date.parse('2026-09-08T08:00:00Z'); // 4 PM Philippines
    assert.equal(validPickupSchedule('2026-09-08', '16:01', now), true);
    assert.equal(validPickupSchedule('2026-09-08', '15:59', now), false);
    assert.equal(validPickupSchedule('2026-09-09', '24:00', now), false);
    assert.equal(validPickupSchedule('2027-02-30', '10:00', now), false);
    assert.equal(validPickupSchedule('2028-02-29', '10:00', now), true);
    assert.equal(validPickupSchedule('', '', now), false);
});
