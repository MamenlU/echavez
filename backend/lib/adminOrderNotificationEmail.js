import nodemailer from 'nodemailer';
import pool from '../db.js';

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const formatMoney = (value) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(Number(value || 0));

const formatFulfillment = (value) => {
    const fulfillment = String(value || '').toLowerCase();

    if (fulfillment === 'shop_go') return 'Shop & Go';
    if (fulfillment === 'pickup') return 'Pickup';
    if (fulfillment === 'delivery') return 'Delivery';

    return value || 'Not specified';
};

const EVENT_DETAILS = {
    NEW_ORDER: {
        label: 'NEW ORDER RECEIVED',
        subjectPrefix: 'New Rayjin Hardware Order',
        message:
            'A customer has successfully placed a new order. Please review it in the Fulfillment Center.'
    },

    PAYMENT_CONFIRMED: {
        label: 'PAYMENT CONFIRMED',
        subjectPrefix: 'Payment Confirmed',
        message:
            'A customer payment has been successfully verified. The order is ready for the appropriate Admin review.'
    },

    FAILED_DELIVERY: {
        label: 'DELIVERY ATTENTION REQUIRED',
        subjectPrefix: 'Failed Delivery',
        message:
            'A delivery order has been marked as Failed Delivery and may require further Admin attention.'
    }
};

export const sendAdminOrderNotification = async ({
    type,
    orderId,
    reference = null,
    reason = null
}) => {
    try {
        const event = EVENT_DETAILS[type];

        if (!event) {
            console.warn(
                `Admin order notification skipped: unsupported event type "${type}".`
            );
            return;
        }

        if (!orderId) {
            console.warn(
                'Admin order notification skipped: order ID is missing.'
            );
            return;
        }

        if (
            !process.env.EMAIL_USER ||
            !process.env.EMAIL_APP_PASSWORD
        ) {
            console.warn(
                'Admin order notification skipped: EMAIL_USER or EMAIL_APP_PASSWORD is missing.'
            );
            return;
        }

        // Use active Admin account email addresses from the existing users table.
        const [admins] = await pool.query(
            `
            SELECT email
            FROM users
            WHERE role = 'admin'
              AND status = 'active'
              AND email IS NOT NULL
              AND TRIM(email) <> ''
            `
        );

        const adminEmails = [
            ...new Set(
                admins
                    .map(admin => String(admin.email || '').trim().toLowerCase())
                    .filter(Boolean)
            )
        ];

        if (adminEmails.length === 0) {
            console.warn(
                `Admin order notification skipped for ${orderId}: no active Admin email was found.`
            );
            return;
        }

        // Load the committed order and customer information from the database.
        const [orders] = await pool.query(
            `
            SELECT
                o.id,
                o.total,
                o.service_fee,
                o.delivery_fee,
                o.fulfillment,
                o.payment_method,
                o.payment_status,
                o.status,
                o.created_at,
                u.first_name,
                u.last_name,
                u.email AS customer_email,
                u.phone_number AS customer_phone
            FROM orders o
            JOIN users u
                ON u.id = o.user_id
            WHERE o.id = ?
            LIMIT 1
            `,
            [orderId]
        );

        if (orders.length === 0) {
            console.warn(
                `Admin order notification skipped: order ${orderId} was not found.`
            );
            return;
        }

        const order = orders[0];

        const customerName =
            [order.first_name, order.last_name]
                .map(value => String(value || '').trim())
                .filter(Boolean)
                .join(' ') || 'Customer';

        const grandTotal =
            Number(order.total || 0) +
            Number(order.service_fee || 0) +
            Number(order.delivery_fee || 0);

        const safeOrderId = escapeHtml(order.id);
        const safeCustomerName = escapeHtml(customerName);
        const safeCustomerEmail = escapeHtml(order.customer_email);
        const safeCustomerPhone = escapeHtml(
            order.customer_phone || 'Not provided'
        );
        const safeFulfillment = escapeHtml(
            formatFulfillment(order.fulfillment)
        );
        const safePaymentMethod = escapeHtml(
            order.payment_method || 'Not specified'
        );
        const safePaymentStatus = escapeHtml(
            order.payment_status || 'Not specified'
        );
        const safeOrderStatus = escapeHtml(
            order.status || 'Not specified'
        );
        const safeReference = escapeHtml(reference || '');
        const safeReason = escapeHtml(reason || '');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });

        const subject =
            `${event.subjectPrefix} — ${order.id}`;

        const referenceText =
            reference
                ? `\nPayment Reference: ${reference}`
                : '';

        const reasonText =
            reason
                ? `\nReason: ${reason}`
                : '';

        await transporter.sendMail({
            from: `"Rayjin Hardware" <${process.env.EMAIL_USER}>`,
            to: adminEmails,
            subject,

            text: `
RAYJIN HARDWARE
ADMIN NOTIFICATION

${event.label}

${event.message}

ORDER DETAILS

Order ID: ${order.id}
Customer: ${customerName}
Customer Email: ${order.customer_email || 'Not provided'}
Contact Number: ${order.customer_phone || 'Not provided'}
Fulfillment: ${formatFulfillment(order.fulfillment)}
Payment Method: ${order.payment_method || 'Not specified'}
Payment Status: ${order.payment_status || 'Not specified'}
Order Status: ${order.status || 'Not specified'}
Grand Total: ${formatMoney(grandTotal)}${referenceText}${reasonText}

Please open the Rayjin Hardware Admin Dashboard / Fulfillment Center to review this order when necessary.

Rayjin Hardware
Brgy. Poblacion, Zone 11
Initao, Misamis Oriental

This is an automated Admin notification. Please do not reply to this email.
            `.trim(),

            html: `
                <div style="
                    margin:0;
                    padding:32px 12px;
                    background:#f4f7f5;
                    font-family:Arial,Helvetica,sans-serif;
                    color:#17372d;
                ">
                    <div style="
                        max-width:600px;
                        margin:0 auto;
                        background:#ffffff;
                        border:1px solid #e2e8e5;
                        border-radius:14px;
                        overflow:hidden;
                    ">
                        <div style="
                            padding:24px 30px;
                            text-align:center;
                            background:#14532d;
                            color:#ffffff;
                        ">
                            <div style="
                                font-size:20px;
                                font-weight:800;
                            ">
                                RAYJIN HARDWARE
                            </div>

                            <div style="
                                margin-top:5px;
                                color:#bbf7d0;
                                font-size:11px;
                                font-weight:700;
                                letter-spacing:2px;
                            ">
                                ADMIN NOTIFICATION
                            </div>
                        </div>

                        <div style="padding:32px 30px;">
                            <div style="
                                color:#15803d;
                                font-size:11px;
                                font-weight:800;
                                letter-spacing:1.4px;
                                text-align:center;
                            ">
                                ${escapeHtml(event.label)}
                            </div>

                            <h1 style="
                                margin:10px 0 14px;
                                color:#14532d;
                                font-size:23px;
                                text-align:center;
                            ">
                                ${safeOrderId}
                            </h1>

                            <p style="
                                margin:0 0 24px;
                                color:#52675e;
                                font-size:14px;
                                line-height:1.7;
                                text-align:center;
                            ">
                                ${escapeHtml(event.message)}
                            </p>

                            <div style="
                                padding:18px;
                                background:#f8faf9;
                                border:1px solid #e2e8e5;
                                border-radius:10px;
                                font-size:13px;
                                line-height:1.9;
                                color:#40564d;
                            ">
                                <strong>Customer:</strong>
                                ${safeCustomerName}<br>

                                <strong>Email:</strong>
                                ${safeCustomerEmail || 'Not provided'}<br>

                                <strong>Contact:</strong>
                                ${safeCustomerPhone}<br>

                                <strong>Fulfillment:</strong>
                                ${safeFulfillment}<br>

                                <strong>Payment Method:</strong>
                                ${safePaymentMethod}<br>

                                <strong>Payment Status:</strong>
                                ${safePaymentStatus}<br>

                                <strong>Order Status:</strong>
                                ${safeOrderStatus}<br>

                                <strong>Grand Total:</strong>
                                ${escapeHtml(formatMoney(grandTotal))}

                                ${
                                    safeReference
                                        ? `<br><strong>Payment Reference:</strong> ${safeReference}`
                                        : ''
                                }

                                ${
                                    safeReason
                                        ? `<br><strong>Reason:</strong> ${safeReason}`
                                        : ''
                                }
                            </div>

                            <p style="
                                margin:24px 0 0;
                                color:#52675e;
                                font-size:13px;
                                line-height:1.7;
                            ">
                                Please open the Rayjin Hardware Admin Dashboard /
                                Fulfillment Center to review this order when necessary.
                            </p>
                        </div>

                        <div style="
                            padding:20px 30px;
                            background:#f8faf9;
                            border-top:1px solid #e5ebe7;
                            text-align:center;
                            color:#708078;
                            font-size:11px;
                            line-height:1.6;
                        ">
                            <strong style="color:#14532d;">
                                Rayjin Hardware
                            </strong><br>
                            Brgy. Poblacion, Zone 11<br>
                            Initao, Misamis Oriental<br><br>

                            This is an automated Admin notification.<br>
                            Please do not reply to this email.
                        </div>
                    </div>
                </div>
            `
        });

        console.log(
            `Admin ${type} email sent for order ${orderId}.`
        );

    } catch (error) {
        // Admin email notifications are informational only.
        // They must never cause an order/payment operation to fail.
        console.error(
            'Admin order notification email error:',
            error?.message || error
        );
    }
};