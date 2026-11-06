    import express from 'express';
    import pool from '../db.js';
    import { authenticateToken } from '../middleware/auth.js';
    import { orderAmount, paymentProof } from '../lib/orderPayment.js';
    import { sendAdminOrderNotification } from '../lib/adminOrderNotificationEmail.js';
    import { safeCreateOrderSystemMessage } from '../lib/messageService.js';
    import {
        buildPaymentVerifiedSystemMessage,
        paymentVerifiedEventKey
    } from '../lib/orderSystemMessages.js';

    const fail = (status, message) => Object.assign(new Error(message), { status });
    function safeCheckoutUrl(value) {
        const url = new URL(value);
        if (url.protocol !== 'https:' || !['checkout.paymongo.com', 'pm.link'].includes(url.hostname)) {
            throw fail(502, 'PayMongo returned an unexpected checkout address.');
        }
        return url.href;
    }

    // Dependencies are injected only by the local test suite.
    export function createPaymongoRouter({ database = pool, request = fetch, env = process.env } = {}) {
        const router = express.Router();
        router.use(authenticateToken);

        async function gateway(path, body) {
            const key = env.PAYMONGO_SECRET_KEY;
            if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(key || '')) throw fail(503, 'Online payment is unavailable. Please contact the store.');
            const response = await request('https://api.paymongo.com/v1/' + path, {
                method: body ? 'POST' : 'GET',
                headers: {
                    Accept: 'application/json', 'Content-Type': 'application/json',
                    Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'),
                },
                ...(body ? { body: JSON.stringify({ data: { attributes: body } }) } : {}),
                signal: AbortSignal.timeout(15000),
            });
            const payload = await response.json();
            if (!response.ok) {
                const error = fail(502, 'PayMongo could not process this request. Check again from My Orders; do not place another order.');
                // Keep only the HTTP status so callers can distinguish a definitely
                // unavailable checkout (404) from a temporary provider failure.
                // Never attach or log PayMongo response data here.
                error.providerStatus = response.status;
                throw error;
            }
            return payload;
        }

        
        async function verifySaved(connection, order, sessionId) {
            if (!/^(cs|link)_[A-Za-z0-9]+$/.test(sessionId || '')) throw fail(409, 'No verifiable checkout is saved for this order.');
            const resource = await gateway((sessionId.startsWith('cs_') ? 'checkout_sessions/' : 'links/') + sessionId);
            const amount = orderAmount(order);
            const livemode = env.PAYMONGO_SECRET_KEY.startsWith('sk_live_');
            let proof;
            try {
                proof = paymentProof(resource, { sessionId, orderId: order.id, amount, livemode });
            } catch (error) {
                throw fail(409, error.message);
            }
            const attrs = resource.data.attributes;
            const checkoutUrl = attrs.checkout_url ? safeCheckoutUrl(attrs.checkout_url) : null;

            const [records] = await connection.query(
            'SELECT * FROM payments WHERE gateway_session_id = ? FOR UPDATE',
            [sessionId]
            );

            const wasAlreadyPaid =
            String(order.payment_status || '')
            .trim()
            .toLowerCase() === 'paid' ||
            records.some(
                record =>
                String(record.payment_status || '')
                .trim()
                .toLowerCase() === 'paid'
                );

            if (records.length && (records[0].order_id !== order.id || Math.round(Number(records[0].amount) * 100) !== amount || Boolean(records[0].livemode) !== livemode)) {
                throw fail(409, 'The saved payment record needs store review.');
            }
            if (records[0]?.payment_status === 'Paid' && proof.status !== 'Paid') throw fail(409, 'A previously paid transaction needs store review.');
            if (!records.length) {
                await connection.query(
                    'INSERT INTO payments (order_id, payment_provider, gateway_session_id, payment_method, amount, livemode, checkout_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
        order.id,
        'PayMongo',
        sessionId,
        order.payment_method,
        amount / 100,
        livemode,
        checkoutUrl
    ]
                );
            }
            await connection.query(
        `UPDATE payments
        SET
            payment_status = ?,
            gateway_transaction_id = ?,
            payment_method = ?,
            payment_date =
                CASE
                    WHEN ? = 'Paid'
                        THEN COALESCE(payment_date, NOW())
                    ELSE payment_date
                END,
            verified_at = NOW()
        WHERE gateway_session_id = ?`,
        [
            proof.status,
            proof.transactionId || null,
            proof.method || order.payment_method,
            proof.status,
            sessionId
        ]
    );
            await connection.query('UPDATE orders SET payment_status = ?, payment_method = ? WHERE id = ?', [proof.status, proof.method || order.payment_method, order.id]);
            // A successfully verified PayMongo payment changes only the
// payment-gated order status. It does NOT complete the order,
// create a sale, or deduct inventory.
//
// Standard Pickup is automatically approved after successful
// payment verification. Delivery and Shop & Go continue to
// require the existing Admin approval workflow.
if (
    proof.status === 'Paid' &&
    order.status === 'awaiting_payment'
) {
    const nextOrderStatus =
        order.fulfillment === 'pickup'
            ? 'approved'
            : 'pending';

    const historyNote =
        order.fulfillment === 'pickup'
            ? 'Payment verified with PayMongo; Standard Pickup automatically approved and awaiting customer arrival.'
            : 'Payment verified with PayMongo; awaiting store approval.';

    if (order.fulfillment === 'shop_go') {
        // Any legacy Shop & Go schedule saved before payment
        // verification is not considered a valid final schedule.
        // Clear it when payment succeeds so the Admin must confirm
        // the final schedule while the order is Pending.
        await connection.query(
            `UPDATE orders
             SET
                 status = ?,
                 scheduled_pickup_date = NULL,
                 scheduled_pickup_time = NULL
             WHERE id = ?`,
            [
                nextOrderStatus,
                order.id
            ]
        );
    } else {
        await connection.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [
                nextOrderStatus,
                order.id
            ]
        );
    }

    await connection.query(
        `INSERT INTO order_status_history
         (
             order_id,
             from_status,
             to_status,
             admin_id,
             note
         )
         VALUES (?, 'awaiting_payment', ?, NULL, ?)`,
        [
            order.id,
            nextOrderStatus,
            historyNote
        ]
    );
}

if (proof.status === 'Paid') {
    await safeCreateOrderSystemMessage(connection, {
        orderId: order.id,
        customerId: order.user_id,
        message: buildPaymentVerifiedSystemMessage({
            fulfillment: order.fulfillment,
        }),
        eventKey: paymentVerifiedEventKey(order.id),
    }, { context: 'PayMongo payment verification' });
}
            return {
        paymentStatus: proof.status,
        reference: proof.transactionId || null,
        checkoutUrl,
        testMode: !livemode,

        // Internal backend-only flag.
        // True only for the first genuine transition to Paid.
        notifyAdminPaymentConfirmed:
            proof.status === 'Paid' &&
            !wasAlreadyPaid
    };
        }

        const handle = (create = false) => async (req, res) => {
            let connection;
            try {
                const { orderId } = req.body || {};
                if (typeof orderId !== 'string' || !orderId || orderId.length > 50) throw fail(400, 'A valid order ID is required.');
                if (!['admin', 'customer'].includes(req.user?.role)) throw fail(403, 'Access denied.');
                connection = await database.getConnection();
                await connection.beginTransaction();
                const [orders] = await connection.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
                const order = orders[0];
                if (!order || (Number(order.user_id) !== Number(req.user.id) && (create || req.user.role !== 'admin'))) throw fail(404, 'Order not found.');
                if (!['gcash', 'card', 'paymongo'].includes(order.payment_method)) throw fail(400, 'This order uses cash payment.');

                // Never reopen or replace a checkout for a final order. This check
                // runs before contacting PayMongo so a cancelled/rejected order
                // cannot have its local payment status changed back to Pending.
                if (create && ['completed', 'cancelled', 'rejected'].includes(order.status)) {
                    throw fail(409, 'This order can no longer accept online payment.');
                }

                let result;
                if (create && order.payment_status === 'Paid') {
                    // A locally verified paid order must never create another
                    // Checkout Session. The customer can safely return to My Orders.
                    result = {
                        paymentStatus: 'Paid',
                        reference: null,
                        checkoutUrl: null,
                        testMode: !(env.PAYMONGO_SECRET_KEY || '').startsWith('sk_live_'),
                        alreadyPaid: true,
                    };
                } else if (order.paymongo_link_id) {
                    try {
                        result = await verifySaved(connection, order, order.paymongo_link_id);
                    } catch (error) {
                        // A provider-confirmed 404 means the saved Checkout Session
                        // can no longer be continued. Only the customer create/
                        // continue path may replace it. Transient 5xx/timeouts are
                        // deliberately NOT treated as permission to create a second
                        // session because that could cause duplicate payment paths.
                        
                        
                        if (
                            create &&
                            error?.providerStatus === 404 &&
                            ['pending', 'awaiting_payment'].includes(order.status)
                        ) {

                            const [savedRecords] = await connection.query(
                                'SELECT * FROM payments WHERE gateway_session_id = ? FOR UPDATE',
                                [order.paymongo_link_id]
                            );

                            
                        
                            if (savedRecords.some(record => record.payment_status === 'Paid')) {
                                throw fail(409, 'A previously paid transaction needs store review.');
                            }
                            await connection.query(
                                `UPDATE payments
                                SET payment_status = 'Cancelled', verified_at = NOW()
                                WHERE gateway_session_id = ?
                                AND payment_status <> 'Paid'`,
                                [order.paymongo_link_id]
                            );
                            result = {
                                paymentStatus: 'Cancelled',
                                reference: null,
                                checkoutUrl: null,
                                testMode: !(env.PAYMONGO_SECRET_KEY || '').startsWith('sk_live_'),
                                sessionUnavailable: true,
                            };
                        } else {
                            throw error;
                        }
                    }
                } else if (!create) {
                    throw fail(409, 'No checkout is saved yet. Use Pay Online in My Orders to start payment.');
                }

                if (create && result?.paymentStatus !== 'Paid') {
                    if (!['pending', 'awaiting_payment'].includes(order.status)) throw fail(409, 'This order needs store review before another payment can be started.');
                    if (['Pending', 'Failed'].includes(result?.paymentStatus)) {
                        if (!result.checkoutUrl) throw fail(409, 'Payment is still pending. Contact the store to check the existing checkout.');
                    } else {
                        const amount = orderAmount(order);
                        const origin = new URL(env.FRONTEND_URL || 'http://localhost:5173').origin;
                        const query = '?orderId=' + encodeURIComponent(order.id);
                        const resource = await gateway('checkout_sessions', {
                            line_items: [{ name: 'Rayjin Hardware order ' + order.id, amount, currency: 'PHP', quantity: 1 }],
                            payment_method_types: order.payment_method === 'paymongo' ? ['card', 'gcash'] : [order.payment_method],
                            reference_number: order.id,
                            description: 'Products and applicable pickup or delivery fees',
                            success_url: origin + '/payment/success' + query,
                            cancel_url: origin + '/payment/failed' + query,
                            send_email_receipt: false, show_description: true, show_line_items: true,
                        });
                        const sessionId = resource?.data?.id;
                        if (!/^cs_[A-Za-z0-9]+$/.test(sessionId || '')) throw fail(502, 'A checkout could not be saved. Try again from My Orders.');
                    
                        const checkoutUrl = safeCheckoutUrl(resource.data.attributes.checkout_url);
                        const livemode = env.PAYMONGO_SECRET_KEY.startsWith('sk_live_');
                        paymentProof(resource, { sessionId, orderId, amount, livemode });
                        await connection.query(
                            'INSERT INTO payments (order_id, payment_provider, gateway_session_id, payment_method, amount, livemode, checkout_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
        orderId,
        'PayMongo',
        sessionId,
        order.payment_method,
        amount / 100,
        livemode,
        checkoutUrl
    ]
                        );
                        await connection.query("UPDATE orders SET paymongo_link_id = ?, payment_status = 'Pending' WHERE id = ?", [sessionId, orderId]);
                        result = { checkoutUrl, paymentStatus: 'Pending', testMode: !livemode };
                    }
                }
                const {
        notifyAdminPaymentConfirmed = false,
        ...publicResult
    } = result || {};

    await connection.commit();

    // Notify Admin only after a newly confirmed payment
    // has been successfully committed to the database.
    if (notifyAdminPaymentConfirmed) {
        await sendAdminOrderNotification({
            type: 'PAYMENT_CONFIRMED',
            orderId,
            reference: publicResult.reference || null
        });
    }

    res.json({
        orderId,
        ...publicResult
    });
            } catch (error) {
                if (connection) await connection.rollback();
                // Do not log provider responses, secrets, or customer billing information.
                console.error('Payment request failed:', error.code || error.name);
                const expected = error.status || 500;
                res.status(expected).json({ error: error.status ? error.message : 'Unable to verify payment. Check payment from My Orders before paying again.' });
            } finally {
                connection?.release();
            }
        };
        // Preserve the old endpoint name; new payments use hosted Checkout Sessions.
        router.post('/create-link', handle(true));
        // My Orders uses the same idempotent create/reuse path. An active saved
        // Checkout Session is returned unchanged; only an expired/unavailable one
        // may be replaced while the order is still eligible for payment.
        router.post('/continue-payment', handle(true));
        router.post('/confirm-payment', handle());
        // Closing checkout rechecks payment; it never cancels the order.
        router.post('/cancel-payment', handle());
        return router;
    }
    export default createPaymongoRouter();
