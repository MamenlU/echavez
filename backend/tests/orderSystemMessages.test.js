import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildOrderStatusSystemMessage,
    buildPaymentVerifiedSystemMessage,
    orderStatusEventKey,
    paymentVerifiedEventKey,
} from '../lib/orderSystemMessages.js';

test('payment messages distinguish Pickup, Delivery, and Shop & Go', () => {
    assert.match(
        buildPaymentVerifiedSystemMessage({ fulfillment: 'pickup' }),
        /Pickup approved/i
    );
    assert.match(
        buildPaymentVerifiedSystemMessage({ fulfillment: 'delivery' }),
        /awaiting store approval/i
    );
    assert.match(
        buildPaymentVerifiedSystemMessage({ fulfillment: 'shop_go' }),
        /pickup-schedule confirmation/i
    );
});

test('customer-facing status messages cover meaningful fulfillment milestones only', () => {
    assert.match(
        buildOrderStatusSystemMessage({ status: 'approved', fulfillment: 'delivery' }),
        /Delivery order has been approved/i
    );
    assert.match(
        buildOrderStatusSystemMessage({ status: 'ready', fulfillment: 'shop_go' }),
        /ready for pickup/i
    );
    assert.match(
        buildOrderStatusSystemMessage({ status: 'out_for_delivery', fulfillment: 'delivery' }),
        /out for delivery/i
    );
    assert.match(
        buildOrderStatusSystemMessage({ status: 'completed', fulfillment: 'pickup' }),
        /successfully completed/i
    );
    assert.match(
        buildOrderStatusSystemMessage({ status: 'rejected', fulfillment: 'delivery' }),
        /rejected/i
    );
    assert.equal(
        buildOrderStatusSystemMessage({ status: 'processing', fulfillment: 'delivery' }),
        null
    );
});

test('cancellation can include the Admin reason without changing the event identity', () => {
    const message = buildOrderStatusSystemMessage({
        status: 'cancelled',
        fulfillment: 'pickup',
        reason: 'Customer requested cancellation.',
    });

    assert.match(message, /Customer requested cancellation/);
    assert.equal(orderStatusEventKey('ORD-123', 'cancelled'), 'order:ORD-123:status:cancelled');
    assert.equal(paymentVerifiedEventKey('ORD-123'), 'order:ORD-123:payment:verified');
});
