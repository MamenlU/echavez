// Amounts are compared in integer centavos, never against a browser total.
export function orderAmount(order) {
    const amounts = [order.total, order.service_fee ?? 0, order.delivery_fee ?? 0]
        .map(value => Math.round(Number(value) * 100));
    if (amounts.some(value => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error('The saved order amount is invalid. Please contact the store.');
    }
    const total = amounts.reduce((sum, value) => sum + value, 0);
    if (!Number.isSafeInteger(total) || total <= 0) throw new Error('The saved order total must be greater than zero.');
    return total;
}

export function validPickupSchedule(date, time, now = Date.now()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) return false;
    // All store appointments are Philippine time, regardless of server timezone.
    const utcDate = new Date(date + 'T00:00:00Z');
    if (!Number.isFinite(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== date) return false;
    return new Date(date + 'T' + time + ':00+08:00').getTime() > now;
}

export function paymentProof(resource, { sessionId, orderId, amount, livemode }) {
    const data = resource?.data;
    const attrs = data?.attributes;
    if (data?.id !== sessionId || !attrs || attrs.livemode !== livemode) {
        throw new Error('Payment verification did not match the saved checkout or payment mode.');
    }
    const isCheckout = sessionId.startsWith('cs_');
    if (isCheckout) {
        if (data.type !== 'checkout_session' || attrs.reference_number !== orderId) {
            throw new Error('Payment reference did not match this order.');
        }
        const intent = attrs.payment_intent?.attributes;
        const lines = attrs.line_items;
        if (!Array.isArray(lines) || !lines.length || lines.some(line => line.currency !== 'PHP' || !Number.isSafeInteger(line.amount) || !Number.isSafeInteger(line.quantity) || line.amount <= 0 || line.quantity <= 0)
            || lines.reduce((sum, line) => sum + line.amount * line.quantity, 0) !== amount
            || (intent && (intent.amount !== amount || intent.currency !== 'PHP'))) {
            throw new Error('Payment amount or currency did not match the saved order.');
        }
    } else if (data.type !== 'link' || attrs.remarks !== orderId || attrs.amount !== amount || attrs.currency !== 'PHP') {
        throw new Error('The legacy payment link does not match this order. Store review is required.');
    }
    const payments = attrs.payments ?? attrs.payment_intent?.attributes?.payments ?? [];
    if (!Array.isArray(payments)) throw new Error('PayMongo returned an unexpected payment response.');
    // Legacy Links wrap payment resources in { data: ... }.
    const paid = payments.map(item => item.data ?? item).filter(item => item.attributes?.status === 'paid');
    if (paid.length > 1) throw new Error('More than one paid transaction needs store review.');
    if (paid.length === 1) {
        const payment = paid[0];
        const p = payment.attributes;
        if (payment.type !== 'payment' || !/^pay_[A-Za-z0-9]+$/.test(payment.id)
            || p.amount !== amount || p.currency !== 'PHP' || p.livemode !== livemode
            || !['gcash', 'card'].includes(p.source?.type)
            || (p.refunds && (!Array.isArray(p.refunds) || p.refunds.length > 0))) {
            throw new Error('The paid transaction could not be matched. Store review is required.');
        }
        return { status: 'Paid', transactionId: payment.id, method: p.source.type };
    }
    // A return URL, active session, or succeeded intent alone is not proof of payment.
    const intent = attrs.payment_intent?.attributes;
    if (intent?.status === 'processing') return { status: 'Pending' };
    if (isCheckout && attrs.status === 'expired') return { status: 'Cancelled' };
    if (intent?.last_payment_error || payments.some(item => (item.data ?? item).attributes?.status === 'failed')) return { status: 'Failed' };
    return { status: 'Pending' };
}
