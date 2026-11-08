const cleanFulfillment = value =>
    String(value || '').trim().toLowerCase();

const cleanReason = value =>
    String(value || '').trim();

export function orderStatusEventKey(orderId, status) {
    return `order:${String(orderId)}:status:${String(status)}`;
}

export function paymentVerifiedEventKey(orderId) {
    return `order:${String(orderId)}:payment:verified`;
}

export function buildPaymentVerifiedSystemMessage({ fulfillment }) {
    const method = cleanFulfillment(fulfillment);

    if (method === 'pickup') {
        return 'Payment confirmed — Pickup approved. Your PayMongo payment has been verified successfully and your Pickup order is approved. Please follow the Pickup instructions shown in My Orders before visiting Rayjin Hardware.';
    }

    if (method === 'delivery') {
        return 'Payment confirmed. Your PayMongo payment has been verified successfully. Your Delivery order is now awaiting store approval. Rayjin Hardware may still contact you to verify your phone number and delivery address before proceeding.';
    }

    if (method === 'shop_go') {
        return 'Payment confirmed. Your PayMongo payment has been verified successfully. Your Shop & Go order is now awaiting store verification and final pickup-schedule confirmation.';
    }

    return 'Payment confirmed. Your PayMongo payment has been verified successfully. Please check My Orders for the latest fulfillment status.';
}

export function buildOrderStatusSystemMessage({
    status,
    fulfillment,
    reason = '',
}) {
    const nextStatus = String(status || '').trim().toLowerCase();
    const method = cleanFulfillment(fulfillment);
    const cleanAdminReason = cleanReason(reason);

    if (nextStatus === 'approved') {
        if (method === 'pickup') {
            return 'Your Pickup order has been approved. Please check My Orders for the exact arrival deadline and instructions, then present your Order ID when you visit Rayjin Hardware.';
        }

        if (method === 'shop_go') {
            return 'Your Shop & Go order has been approved and its final pickup schedule has been confirmed. Please review the confirmed date and time in My Orders before visiting Rayjin Hardware.';
        }

        if (method === 'delivery') {
            return 'Your Delivery order has been approved. Rayjin Hardware will proceed with order preparation and delivery processing. Please keep your provided phone number available in case the store needs to contact you.';
        }

        return 'Your order has been approved. Please check My Orders for the latest fulfillment instructions.';
    }

    if (nextStatus === 'ready') {
        if (method === 'shop_go') {
            return 'Your Shop & Go order is ready for pickup. Please follow your confirmed pickup schedule and present your Order ID to Rayjin Hardware staff.';
        }

        return 'Your Pickup order is ready for release. Please follow the instructions in My Orders and present your Order ID to Rayjin Hardware staff.';
    }

    if (nextStatus === 'out_for_delivery') {
        return 'Your order is now out for delivery. Please keep your provided phone number available and make sure someone can receive the order at the confirmed delivery address.';
    }

    if (nextStatus === 'completed') {
        return 'Thank you for your purchase from Rayjin Hardware! Your order has been successfully completed. We appreciate your business and look forward to serving you again.';
    }

    if (nextStatus === 'rejected') {
        return 'Your order could not be approved and has been rejected. Please review My Orders for the latest status or message Rayjin Hardware if you need clarification.';
    }

    if (nextStatus === 'cancelled') {
        return cleanAdminReason
            ? `Your order has been cancelled by Rayjin Hardware. Reason: ${cleanAdminReason}`
            : 'Your order has been cancelled. Please review My Orders for the latest status or message Rayjin Hardware if you need assistance.';
    }

    // Processing is already represented clearly by the fulfillment tracker.
    // Avoid creating noisy chat updates for every internal status step.
    return null;
}
