import express from 'express';
import { randomUUID } from 'node:crypto';
import pool from '../db.js';

import {
    authenticateToken,
    requireAdmin
} from '../middleware/auth.js';

const router = express.Router();

async function expirePayMongoCheckoutSession(sessionId) {
    const cleanSessionId = String(sessionId || '').trim();

    if (!cleanSessionId) {
        return;
    }

    const secretKey = String(
        process.env.PAYMONGO_SECRET_KEY || ''
    ).trim();

    if (!secretKey) {
        const error = new Error(
            'PayMongo is not configured.'
        );

        error.code = 'PAYMONGO_NOT_CONFIGURED';
        throw error;
    }

    const authorization =
        `Basic ${Buffer.from(
            `${secretKey}:`
        ).toString('base64')}`;

    // Check the current Checkout Session first.
    const checkResponse = await fetch(
        `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(cleanSessionId)}`,
        {
            method: 'GET',
            headers: {
                Authorization: authorization,
                Accept: 'application/json'
            }
        }
    );

    if (!checkResponse.ok) {
        const error = new Error(
            'Unable to verify the PayMongo checkout session.'
        );

        error.code = 'PAYMONGO_LOOKUP_FAILED';
        throw error;
    }

    const checkout = await checkResponse.json();

    const attributes =
        checkout?.data?.attributes || {};

    const payments =
        Array.isArray(attributes.payments)
            ? attributes.payments
            : [];

    const alreadyPaid = payments.some(payment =>
        String(
            payment?.attributes?.status || ''
        ).toLowerCase() === 'paid'
    );

    if (alreadyPaid) {
        const error = new Error(
            'This PayMongo checkout already has a successful payment. Verify the payment before cancelling the order.'
        );

        error.code = 'PAYMONGO_ALREADY_PAID';
        throw error;
    }

    // Already expired = nothing more to do.
    if (
        String(attributes.status || '').toLowerCase() ===
        'expired'
    ) {
        return;
    }

    const expireResponse = await fetch(
        `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(cleanSessionId)}/expire`,
        {
            method: 'POST',
            headers: {
                Authorization: authorization,
                Accept: 'application/json'
            }
        }
    );

    if (!expireResponse.ok) {
        const error = new Error(
            'Unable to expire the PayMongo checkout session.'
        );

        error.code = 'PAYMONGO_EXPIRE_FAILED';
        throw error;
    }
}

const FINAL_ORDER_STATUSES = ['completed', 'cancelled', 'rejected'];

async function recordOrderHistory(
    connection,
    { orderId, fromStatus, toStatus, adminId, note = null }
) {
    await connection.query(
        `INSERT INTO order_status_history
         (order_id, from_status, to_status, admin_id, note)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, fromStatus || null, toStatus, adminId || null, note || null]
    );
}

// Get active Initao delivery rates.
router.get(
    '/delivery-rates',
    authenticateToken,
    async (req, res) => {
        try {
            const [rates] = await pool.query(
                `
                SELECT barangay, zone, surcharge
                FROM delivery_rates
                WHERE is_active = 1
                ORDER BY surcharge ASC, barangay ASC
                `
            );

            res.json(rates);

        } catch (err) {
            console.error(
                'Error fetching delivery rates:',
                err
            );

            res.status(500).json({
                error:
                    'Failed to fetch delivery rates.'
            });
        }
    }
);

// Get every delivery-rate row for the Admin maintenance screen.
router.get(
    '/delivery-rates/admin',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const [rates] = await pool.query(
                `
                SELECT
                    id,
                    barangay,
                    zone,
                    surcharge,
                    is_active,
                    updated_at
                FROM delivery_rates
                ORDER BY surcharge ASC, barangay ASC
                `
            );

            res.json(rates);
        } catch (err) {
            console.error(
                'Error fetching Admin delivery rates:',
                err
            );

            res.status(500).json({
                error: 'Failed to fetch delivery-rate settings.'
            });
        }
    }
);

// Update one barangay's zone, surcharge, and availability.
router.put(
    '/delivery-rates/:id',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const rateId = Number(req.params.id);
            const zone = String(req.body.zone || '')
                .trim()
                .toLowerCase();
            const surcharge = Number(req.body.surcharge);
            const allowedZones = [
                'poblacion',
                'near',
                'medium',
                'far'
            ];

            if (!Number.isInteger(rateId) || rateId <= 0) {
                return res.status(400).json({
                    error: 'Invalid delivery-rate ID.'
                });
            }

            if (!allowedZones.includes(zone)) {
                return res.status(400).json({
                    error: 'Select a valid delivery zone.'
                });
            }

            if (
                !Number.isFinite(surcharge) ||
                surcharge < 0 ||
                surcharge > 5000
            ) {
                return res.status(400).json({
                    error:
                        'Barangay surcharge must be from ₱0 to ₱5,000.'
                });
            }

            const isActive =
                req.body.is_active === true ||
                req.body.is_active === 1 ||
                req.body.is_active === '1';

            const [result] = await pool.query(
                `
                UPDATE delivery_rates
                SET
                    zone = ?,
                    surcharge = ?,
                    is_active = ?
                WHERE id = ?
                `,
                [zone, surcharge, isActive ? 1 : 0, rateId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Delivery-rate setting not found.'
                });
            }

            const [rows] = await pool.query(
                `
                SELECT
                    id,
                    barangay,
                    zone,
                    surcharge,
                    is_active,
                    updated_at
                FROM delivery_rates
                WHERE id = ?
                `,
                [rateId]
            );

            res.json({
                message: 'Delivery rate updated successfully.',
                rate: rows[0]
            });
        } catch (err) {
            console.error(
                'Error updating delivery rate:',
                err
            );

            res.status(500).json({
                error: 'Failed to update the delivery rate.'
            });
        }
    }
);

// Get all orders - ADMIN ONLY
router.get(
    '/',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const [orders] = await pool.query(
    `
    SELECT
        o.*,
        u.first_name AS customer_first_name,
        u.last_name AS customer_last_name,
        u.phone_number AS customer_phone_number,
        u.email AS customer_email
    FROM orders o
    JOIN users u
        ON o.user_id = u.id
    ORDER BY
        CASE o.status
            WHEN 'pending' THEN 1
            WHEN 'awaiting_payment' THEN 2
            WHEN 'approved' THEN 3
            WHEN 'processing' THEN 4
            WHEN 'ready' THEN 5
            WHEN 'out_for_delivery' THEN 5
            WHEN 'failed_delivery' THEN 6
            WHEN 'deactivated' THEN 7
            WHEN 'completed' THEN 8
            WHEN 'cancelled' THEN 9
            WHEN 'rejected' THEN 10
            ELSE 11
        END,
        o.created_at DESC
    `
);

            // Fetch items for each order
            for (let order of orders) {
                const [items] = await pool.query(
                    `
                    SELECT oi.quantity, oi.price, p.*
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                    `,
                    [order.id]
                );

                order.items = items.map(item => ({
                    quantity: item.quantity,
                    product: {
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        category: item.category,
                        image: item.image,
                        stock: item.stock,
                        brand: item.brand
                    }
                }));
            }

            res.json(orders);

        } catch (err) {
            console.error(
                'Error fetching all orders:',
                err
            );

            res.status(500).json({
                error: 'Failed to fetch all orders'
            });
        }
    }
);

// Get orders for the authenticated customer only
router.get(
    '/:userId',
    authenticateToken,
    async (req, res) => {
        try {
            const { userId } = req.params;

            // A customer may only view their own orders.
            if (String(req.user.id) !== String(userId)) {
                return res.status(403).json({
                    error: 'You can only view your own orders.'
                });
            }

            const [orders] = await pool.query(
                `SELECT *
                 FROM orders
                 WHERE user_id = ?
                 ORDER BY created_at DESC`,
                [userId]
            );

            // Fetch items for each order
            for (let order of orders) {
                const [items] = await pool.query(
                    `
                    SELECT oi.quantity, oi.price, p.*
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                    `,
                    [order.id]
                );

                order.items = items.map(item => ({
                    quantity: item.quantity,
                    product: {
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        category: item.category,
                        image: item.image,
                        stock: item.stock,
                        brand: item.brand
                    }
                }));
            }

            res.json(orders);

        } catch (err) {
            console.error(
                'Error fetching customer orders:',
                err
            );

            res.status(500).json({
                error: 'Failed to fetch orders'
            });
        }
    }
);

// Checkout and create a CUSTOMER ONLINE ORDER.
// Onsite POS sales use POST /api/sales/pos instead.
router.post('/', authenticateToken, async (req, res) => {
    const {
    fulfillment,
    paymentMethod,
    items,
    status: requestedStatus,
    requestedPickupDate,
    requestedPickupTime,
    deliveryContactPerson,
    deliveryContactNumber,
    deliveryBarangay,
    deliveryAddress,
    deliveryLandmark,
    deliveryInstructions
} = req.body;

    // Admin accounts must not create customer orders through this route.
    // POS transactions have their own dedicated endpoint.
    if (req.user.role === 'admin') {
        return res.status(403).json({
            error:
                'Admin accounts cannot create customer orders through this endpoint.'
        });
    }

    // The authenticated JWT is the only source of truth
    // for which customer owns the order.
    const orderUserId = req.user.id;

    // -----------------------------------------------------
// CUSTOMER CONTACT VERIFICATION
// -----------------------------------------------------
// Online orders require a stored contact number so the
// store can contact the customer before approving the order.

const [customerRows] = await pool.query(
    `
    SELECT
        id,
        first_name,
        last_name,
        phone_number
    FROM users
    WHERE id = ?
      AND role = 'customer'
    LIMIT 1
    `,
    [orderUserId]
);

if (customerRows.length === 0) {
    return res.status(404).json({
        error: 'Customer account was not found.'
    });
}

const customerPhone =
    String(
        customerRows[0].phone_number || ''
    ).trim();

if (!customerPhone) {
    return res.status(400).json({
        error:
            'A contact number is required before placing an online order. Please update your profile first.'
    });
}

// Remove common formatting characters only for validation.
// The original stored number remains unchanged.
const normalizedPhone =
    customerPhone.replace(
        /[\s\-()]/g,
        ''
    );

const validPhone =
    /^\+?\d{7,15}$/.test(
        normalizedPhone
    );

if (!validPhone) {
    return res.status(400).json({
        error:
            'Please provide a valid contact number before placing an online order.'
    });
}

    // Only allow safe initial statuses for customer orders.
    // Stock must NOT be deducted while the order is only being created.
const allowedStatuses = [
    'pending',
    'awaiting_payment'
];

    const initialStatus = allowedStatuses.includes(requestedStatus)
        ? requestedStatus
        : 'pending';

    // Basic request validation
if (!orderUserId || !fulfillment || !paymentMethod) {
            return res.status(400).json({
            error: 'Missing required order information.'
        });
    }

    // Approved Capstone 1 fulfillment options: Standard Pickup, Delivery, and Shop & Go.
    // Shop & Go remains an express pickup option inside checkout, not a separate module.
    const allowedFulfillmentMethods = ['pickup', 'delivery', 'shop_go'];

    if (!allowedFulfillmentMethods.includes(fulfillment)) {
        return res.status(400).json({
            error: 'Please choose Pickup, Delivery, or Shop & Go.'
        });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: 'The order must contain at least one product.'
        });
    }

    if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
        error: 'The order must contain at least one product.'
    });
}


// -----------------------------------------------------
// STORE PICKUP SCHEDULE VALIDATION
// -----------------------------------------------------

let pickupDateForDatabase = null;
let pickupTimeForDatabase = null;

if (fulfillment === 'shop_go')
     {

    if (
        !requestedPickupDate ||
        !requestedPickupTime
    ) {
        return res.status(400).json({
            error:
                'Preferred pickup date and time are required for a Shop & Go order.'
        });
    }

    const validDateFormat =
        /^\d{4}-\d{2}-\d{2}$/.test(
            requestedPickupDate
        );

    const validTimeFormat =
        /^([01]\d|2[0-3]):[0-5]\d$/.test(
            requestedPickupTime
        );

    if (!validDateFormat) {
        return res.status(400).json({
            error:
                'Invalid preferred pickup date.'
        });
    }

    if (!validTimeFormat) {
        return res.status(400).json({
            error:
                'Invalid preferred pickup time.'
        });
    }

    pickupDateForDatabase =
        requestedPickupDate;

    pickupTimeForDatabase =
        requestedPickupTime;
}
    
    // DELIVERY DETAILS VALIDATION
// -----------------------------------------------------

let deliveryContactPersonForDatabase = null;
let deliveryContactNumberForDatabase = null;
let deliveryBarangayForDatabase = null;
let deliveryAddressForDatabase = null;
let deliveryLandmarkForDatabase = null;
let deliveryInstructionsForDatabase = null;

if (fulfillment === 'delivery') {
    const cleanContactPerson =
        String(deliveryContactPerson || '').trim();

    const cleanContactNumber =
        String(deliveryContactNumber || '').trim();

    const cleanBarangay =
        String(deliveryBarangay || '').trim();

    const cleanAddress =
        String(deliveryAddress || '').trim();

    const cleanLandmark =
        String(deliveryLandmark || '').trim();

    const cleanInstructions =
        String(deliveryInstructions || '').trim();

    if (
        !cleanContactPerson ||
        !cleanContactNumber ||
        !cleanBarangay ||
        !cleanAddress
    ) {
        return res.status(400).json({
            error:
                'Contact person, contact number, barangay, and complete delivery address are required.'
        });
    }

    const allowedInitaoBarangays = [
    'Aluna',
    'Andales',
    'Apas',
    'Calacapan',
    'Gimangpang',
    'Jampason',
    'Kamelon',
    'Kanitoan',
    'Oguis',
    'Pagahan',
    'Poblacion',
    'Pontacon',
    'San Pedro',
    'Sinalac',
    'Tawantawan',
    'Tubigan'
];

const matchedBarangay = allowedInitaoBarangays.find(
    barangay =>
        barangay.toLowerCase() === cleanBarangay.toLowerCase()
);

if (!matchedBarangay) {
    return res.status(400).json({
        error:
            'Delivery is currently available only within Initao, Misamis Oriental.'
    });
}

    const normalizedDeliveryPhone =
        cleanContactNumber.replace(/[\s\-()]/g, '');

    if (!/^\+?\d{7,15}$/.test(normalizedDeliveryPhone)) {
        return res.status(400).json({
            error:
                'Please provide a valid delivery contact number.'
        });
    }

    deliveryContactPersonForDatabase = cleanContactPerson;
    deliveryContactNumberForDatabase = cleanContactNumber;
    deliveryBarangayForDatabase = matchedBarangay;
    deliveryAddressForDatabase = cleanAddress;
    deliveryLandmarkForDatabase = cleanLandmark || null;
    deliveryInstructionsForDatabase = cleanInstructions || null;
}   

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const orderId = `ORD-${randomUUID()
    .replace(/-/g, '')
    .slice(0, 12)
    .toUpperCase()}`;

        // 1. Create the order.
await connection.query(
    `
    INSERT INTO orders (
        id,
        user_id,
        total,
        service_fee,
        fulfillment,
        payment_method,
        payment_status,
        status,
        requested_pickup_date,
        requested_pickup_time,
        delivery_contact_person,
        delivery_contact_number,
        delivery_barangay,
        delivery_address,
        delivery_landmark,
        delivery_instructions
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
        orderId,
        orderUserId,
        0,
        0,
        fulfillment,
        paymentMethod,
        'Pending',
        initialStatus,
        pickupDateForDatabase,
        pickupTimeForDatabase,
        deliveryContactPersonForDatabase,
        deliveryContactNumberForDatabase,
        deliveryBarangayForDatabase,
        deliveryAddressForDatabase,
        deliveryLandmarkForDatabase,
        deliveryInstructionsForDatabase
    ]
);

        await recordOrderHistory(connection, {
            orderId,
            fromStatus: null,
            toStatus: initialStatus,
            adminId: null,
            note: 'Customer placed the order.'
        });

        // 2. Validate every item and save it to order_items.
        //
        // IMPORTANT:
        // We DO NOT deduct inventory here.
        // Inventory will be deducted only when the order is
        // officially changed to "completed".
        let calculatedTotal = 0;
let deliveryLoadClass = 'light';

const deliveryClassRank = {
    light: 1,
    standard: 2,
    bulky: 3
};
        for (const item of items) {
            const productId = item?.product?.id;
            const quantity = Number(item?.quantity);

            if (
                !productId ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                throw new Error('Invalid product or quantity.');
            }

            // Lock/read the product while this transaction is running.
            const [products] = await connection.query(
                `SELECT id, name, price, stock,
                       delivery_class, bulk_quantity_threshold
                 FROM products
                 WHERE id = ?
                 FOR UPDATE`,
                [productId]
            );

            if (products.length === 0) {
                throw new Error(
                    `Product ID ${productId} was not found.`
                );
            }

            const product = products[0];

            let productDeliveryClass =
    ['light', 'standard', 'bulky'].includes(
        product.delivery_class
    )
        ? product.delivery_class
        : 'standard';

const bulkThreshold = Number(
    product.bulk_quantity_threshold
);

if (
    Number.isInteger(bulkThreshold) &&
    bulkThreshold > 0 &&
    quantity >= bulkThreshold
) {
    productDeliveryClass = 'bulky';
}

if (
    deliveryClassRank[productDeliveryClass] >
    deliveryClassRank[deliveryLoadClass]
) {
    deliveryLoadClass = productDeliveryClass;
}

            calculatedTotal += Number(product.price) * quantity;

            // Check current stock, but DO NOT deduct it yet.
            if (quantity > Number(product.stock)) {
                throw new Error(
                    `Insufficient stock for ${product.name}. ` +
                    `Available: ${product.stock}, requested: ${quantity}.`
                );
            }

            // Store the product price from the DATABASE rather than
            // trusting the price sent by the browser.
            const itemSubtotal = Number(
    (
        quantity * Number(product.price)
    ).toFixed(2)
);

await connection.query(
    `INSERT INTO order_items
     (order_id, product_id, quantity, price, subtotal)
     VALUES (?, ?, ?, ?, ?)`,
    [
        orderId,
        product.id,
        quantity,
        product.price,
        itemSubtotal
    ]
);
        }

        calculatedTotal = Number(calculatedTotal.toFixed(2));

        // Every delivery order requires at least ₱400 in products.
if (
    fulfillment === 'delivery' &&
    calculatedTotal < 400
) {
    const minimumOrderError = new Error(
        'Delivery orders require a minimum product subtotal of ₱400.'
    );

    minimumOrderError.statusCode = 400;
    throw minimumOrderError;
}

let deliveryFeeForDatabase = null;
let deliveryLoadClassForDatabase = null;
const serviceFeeForDatabase = fulfillment === 'shop_go' ? 50 : 0;

if (fulfillment === 'delivery') {
    const [deliveryRates] = await connection.query(
        `
        SELECT surcharge
        FROM delivery_rates
        WHERE barangay = ?
          AND is_active = 1
        LIMIT 1
        `,
        [deliveryBarangayForDatabase]
    );

    if (deliveryRates.length === 0) {
        const deliveryRateError = new Error(
            'Delivery is not available for the selected barangay.'
        );

        deliveryRateError.statusCode = 400;
        throw deliveryRateError;
    }

    const deliveryBaseFees = {
        light: 60,
        standard: 150,
        bulky: 300
    };

    const baseFee =
        deliveryBaseFees[deliveryLoadClass];

    const barangaySurcharge = Number(
        deliveryRates[0].surcharge
    );

    deliveryLoadClassForDatabase =
        deliveryLoadClass;

    deliveryFeeForDatabase = Number(
        (
            baseFee +
            barangaySurcharge
        ).toFixed(2)
    );
}

await connection.query(
    `
    UPDATE orders
    SET
        total = ?,
        service_fee = ?,
        delivery_fee = ?,
        delivery_load_class = ?
    WHERE id = ?
    `,
    [
        calculatedTotal,
        serviceFeeForDatabase,
        deliveryFeeForDatabase,
        deliveryLoadClassForDatabase,
        orderId
    ]
);
        await connection.commit();

        res.status(201).json({
    message:
        'Order placed successfully. Inventory will be updated when the order is completed.',
    orderId,
    productTotal: calculatedTotal,
    serviceFee: serviceFeeForDatabase,
    deliveryFee: deliveryFeeForDatabase,
    deliveryLoadClass:
        deliveryLoadClassForDatabase,
    grandTotal: Number(
        (
            calculatedTotal +
            serviceFeeForDatabase +
            (deliveryFeeForDatabase ?? 0)
        ).toFixed(2)
    )
});

    } catch (err) {
        await connection.rollback();

        console.error('Checkout error:', err);

        // Return stock-related/validation problems as a client error.
        if (
            err.statusCode === 400 ||
            err.message?.includes('Insufficient stock') ||
            err.message?.includes('Invalid product') ||
            err.message?.includes('was not found')
        ) {
            return res.status(400).json({
                error: err.message
            });
        }

        res.status(500).json({
            error: 'Failed to process checkout'
        });

    } finally {
        connection.release();
    }
});

// Update order status (for admin)
//
// IMPORTANT:
// Inventory is deducted ONLY when an order changes
// from a non-completed status to "completed".

// =====================================================
// SHOP & GO - CONFIRM / RESCHEDULE PICKUP
// =====================================================
//
// Admin can confirm the customer's requested Shop & Go
// schedule or provide a different final pickup schedule.
//
// This route DOES NOT change the order status.
// Approval / Processing / Ready / Completed remain
// handled by the existing order-status endpoint.
//
router.put(
    '/:id/shop-go-schedule',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;

            const {
                scheduledPickupDate,
                scheduledPickupTime,
                adminMessage
            } = req.body;

            // -----------------------------------------
            // Required schedule validation
            // -----------------------------------------

            if (
                !scheduledPickupDate ||
                !scheduledPickupTime
            ) {
                return res.status(400).json({
                    error:
                        'Final pickup date and time are required.'
                });
            }

            const validDateFormat =
                /^\d{4}-\d{2}-\d{2}$/.test(
                    scheduledPickupDate
                );

            const validTimeFormat =
                /^([01]\d|2[0-3]):[0-5]\d$/.test(
                    scheduledPickupTime
                );

            if (!validDateFormat) {
                return res.status(400).json({
                    error:
                        'Invalid pickup date format.'
                });
            }

            if (!validTimeFormat) {
                return res.status(400).json({
                    error:
                        'Invalid pickup time format.'
                });
            }

            const cleanAdminMessage =
                String(adminMessage || '').trim();

            if (cleanAdminMessage.length > 500) {
                return res.status(400).json({
                    error:
                        'Admin message cannot exceed 500 characters.'
                });
            }


            // -----------------------------------------
            // Check the order
            // -----------------------------------------

            const [orders] = await pool.query(
                `
                SELECT
                    id,
                    fulfillment,
                    status,
                    requested_pickup_date,
                    requested_pickup_time,
                    scheduled_pickup_date,
                    scheduled_pickup_time
                FROM orders
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

            if (orders.length === 0) {
                return res.status(404).json({
                    error:
                        'Order not found.'
                });
            }

            const order = orders[0];


            // Only Shop & Go uses this scheduling route.
            if (order.fulfillment !== 'shop_go') {
                return res.status(400).json({
                    error:
                        'Pickup scheduling is available only for Shop & Go orders.'
                });
            }


            // Final orders should no longer be rescheduled.
            if (
                order.status === 'completed' ||
                order.status === 'rejected' ||
                order.status === 'cancelled'
            ) {
                return res.status(400).json({
                    error:
                        'This order can no longer be rescheduled.'
                });
            }


            // -----------------------------------------
            // Save final schedule + Admin message
            // -----------------------------------------

            await pool.query(
                `
                UPDATE orders
                SET
                    scheduled_pickup_date = ?,
                    scheduled_pickup_time = ?,
                    admin_message = ?
                WHERE id = ?
                `,
                [
                    scheduledPickupDate,
                    scheduledPickupTime,
                    cleanAdminMessage || null,
                    id
                ]
            );


            // Return the saved values.
            res.json({
                message:
                    order.scheduled_pickup_date && order.scheduled_pickup_time
                        ? 'Shop & Go pickup schedule updated successfully.'
                        : 'Shop & Go pickup schedule saved successfully.',

                orderId: id,

                requestedPickupDate:
                    order.requested_pickup_date,

                requestedPickupTime:
                    order.requested_pickup_time,

                scheduledPickupDate,
                scheduledPickupTime,

                adminMessage:
                    cleanAdminMessage || null
            });

        } catch (err) {
            console.error(
                'Shop & Go schedule update error:',
                err
            );

            res.status(500).json({
                error:
                    'Failed to update the Shop & Go pickup schedule.'
            });
        }
    }
);

// Save an editable Admin message for Pickup, Shop & Go, or Delivery orders.
router.put(
    '/:id/admin-message',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        const cleanMessage = String(req.body.adminMessage || '').trim();
        if (cleanMessage.length > 500) {
            return res.status(400).json({ error: 'Admin message cannot exceed 500 characters.' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [orders] = await connection.query(
                'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
                [req.params.id]
            );
            if (!orders.length) {
                await connection.rollback();
                return res.status(404).json({ error: 'Order not found.' });
            }

            await connection.query(
                'UPDATE orders SET admin_message = ? WHERE id = ?',
                [cleanMessage || null, req.params.id]
            );
            await recordOrderHistory(connection, {
                orderId: req.params.id,
                fromStatus: orders[0].status,
                toStatus: orders[0].status,
                adminId: req.user.id,
                note: cleanMessage || 'Admin message cleared',
            });
            await connection.commit();
            res.json({ message: 'Message updated successfully.', adminMessage: cleanMessage || null });
        } catch (error) {
            await connection.rollback();
            console.error('Admin message update error:', error);
            res.status(500).json({ error: 'Failed to update the Admin message.' });
        } finally {
            connection.release();
        }
    }
);

// Exceptional order actions preserve the previous status and an audit note.
router.put(
    '/:id/action',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        const action = String(req.body.action || '').trim().toLowerCase();
        const reason = String(req.body.reason || '').trim();
        const allowedActions = ['failed_delivery', 'deactivate', 'reactivate', 'cancel', 'cancel_permanently'];

        if (!allowedActions.includes(action)) {
            return res.status(400).json({ error: 'Invalid order action.' });
        }
        if (action !== 'reactivate' && !reason) {
            return res.status(400).json({ error: 'An Admin reason is required for this action.' });
        }
        if (reason.length > 500) {
            return res.status(400).json({ error: 'Admin reason cannot exceed 500 characters.' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [orders] = await connection.query(
    `SELECT
         id,
         fulfillment,
         status,
         previous_status,
         admin_message,
         payment_status,
         paymongo_link_id
     FROM orders
     WHERE id = ?
     FOR UPDATE`,
    [req.params.id]
);
            if (!orders.length) {
                await connection.rollback();
                return res.status(404).json({ error: 'Order not found.' });
            }

            const order = orders[0];
            if (FINAL_ORDER_STATUSES.includes(order.status)) {
                await connection.rollback();
                return res.status(409).json({ error: 'This final order can no longer be changed.' });
            }

            let nextStatus;
            let previousStatus = order.previous_status;
            let message;

            if (action === 'reactivate') {
                if (order.fulfillment !== 'delivery' || !['deactivated', 'failed_delivery'].includes(order.status)) {
                    await connection.rollback();
                    return res.status(409).json({ error: 'Only a deactivated or failed delivery can be reactivated.' });
                }
                const restorable = ['pending', 'awaiting_payment', 'approved', 'processing', 'out_for_delivery'];
                nextStatus = restorable.includes(order.previous_status) ? order.previous_status : 'pending';
                previousStatus = null;
                message = reason || 'Delivery order reactivated.';
            } else if (action === 'failed_delivery') {
                if (order.fulfillment !== 'delivery' || order.status !== 'out_for_delivery') {
                    await connection.rollback();
                    return res.status(409).json({ error: 'Failed Delivery is available only after an order is Out for Delivery.' });
                }
                nextStatus = 'failed_delivery';
                previousStatus = order.status;
                message = reason;
            } else if (action === 'deactivate') {
                if (order.fulfillment !== 'delivery' || ['deactivated', 'failed_delivery'].includes(order.status)) {
                    await connection.rollback();
                    return res.status(409).json({ error: 'Only an active delivery order can be temporarily deactivated.' });
                }
                nextStatus = 'deactivated';
                previousStatus = order.status;
                message = reason;
            } else {
                nextStatus = 'cancelled';
                previousStatus = null;
                message = reason;
            }

            if (nextStatus === 'cancelled') {
    // Never cancel an order that Rayjin already knows is paid.
    if (
        String(order.payment_status || '')
            .toLowerCase() === 'paid'
    ) {
        await connection.rollback();

        return res.status(409).json({
            error:
                'This order is already paid. Verify the payment before cancelling it.'
        });
    }

    // If this order has an active PayMongo Checkout Session,
    // expire it before committing the Rayjin cancellation.
    if (order.paymongo_link_id) {
        await expirePayMongoCheckoutSession(
            order.paymongo_link_id
        );
    }

    // Keep the dedicated payments table synchronized
    // with orders.payment_status.
    await connection.query(
        `UPDATE payments
         SET payment_status = 'Cancelled'
         WHERE order_id = ?
           AND payment_status <> 'Paid'`,
        [req.params.id]
    );
}

            await connection.query(
    `UPDATE orders
     SET
         status = ?,
         previous_status = ?,
         admin_message = ?,

         payment_status =
             CASE
                 WHEN ? = 'cancelled'
                     THEN 'Cancelled'
                 ELSE payment_status
             END

     WHERE id = ?`,
    [
        nextStatus,
        previousStatus,
        message || order.admin_message || null,
        nextStatus,
        req.params.id
    ]
);

            await recordOrderHistory(connection, {
                orderId: req.params.id,
                fromStatus: order.status,
                toStatus: nextStatus,
                adminId: req.user.id,
                note: message,
            });
            await connection.commit();

            const actionMessages = {
                failed_delivery: 'Order marked as Failed Delivery.',
                deactivate: 'Order deactivated successfully.',
                reactivate: 'Order reactivated successfully.',
                cancel: 'Order cancelled successfully.',
                cancel_permanently: 'Order cancelled permanently.',
            };
            res.json({ message: actionMessages[action], status: nextStatus });
        } catch (error) {
            await connection.rollback();

            if (error.code === 'PAYMONGO_ALREADY_PAID') {
    return res.status(409).json({
        error: error.message
    });
}

if (
    error.code === 'PAYMONGO_NOT_CONFIGURED' ||
    error.code === 'PAYMONGO_LOOKUP_FAILED' ||
    error.code === 'PAYMONGO_EXPIRE_FAILED' 
) {
    return res.status(502).json({
        error:
            'Unable to cancel the PayMongo checkout right now. The Rayjin order was not cancelled. Please try again.'
    });
}
            console.error('Order action error:', error);
            res.status(500).json({ error: 'Unable to complete the order action.' });
        } finally {
            connection.release();
        }
    }
);

router.put(
    '/:id/status',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
            const { id } = req.params;
const { status } = req.body;

// This endpoint handles ONLINE CUSTOMER ORDERS only.
// Onsite POS sales now use POST /api/sales/pos.
const resolvedSalesSource = 'Online Order';
        
const allowedStatuses = [
    'pending',
    'awaiting_payment',
    'approved',
    'processing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled',
    'rejected'
];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            error: 'Invalid order status.'
        });
    }
    
    // -----------------------------------------------------


    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Lock the order so two requests cannot complete
        // the same order at the same time.
const [orders] = await connection.query(
    `SELECT
        id,
        status,
        total,
        fulfillment,
        payment_method,
        payment_status,
        service_fee,
        delivery_fee
     FROM orders
     WHERE id = ?
     FOR UPDATE`,
    [id]
);

        if (orders.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'Order not found.'
            });
        }

        const order = orders[0];

// Normalize the payment information so the backend can
// enforce payment verification before approving
// gateway-paid online orders.
const paymentMethod = String(
    order.payment_method || ''
)
    .trim()
    .toLowerCase();

const paymentStatus = String(
    order.payment_status || ''
)
    .trim()
    .toLowerCase();

const requiresVerifiedOnlinePayment = [
    'card',
    'gcash',
    'paymongo'
].includes(paymentMethod);

// A completed order must never be processed again.
        // This protects inventory from being deducted twice.
        if (order.status === 'completed') {
            await connection.rollback();

            if (status === 'completed') {
                return res.json({
                    message:
                        'Order is already completed. Inventory was not deducted again.'
                });
            }

            return res.status(400).json({
                error:
                    'A completed order cannot be changed back to another status.'
            });
        }

// Enforce valid order-status transitions on the SERVER.
//
// Normal online order flow:
//
// Cash:
// pending -> approved
//
// Online payment:
// awaiting_payment -> pending
//     (only after successful payment verification)
// pending -> approved
//
// approved -> processing
// processing -> ready (Pickup / Shop & Go)
// processing -> out_for_delivery (Delivery)
// ready / out_for_delivery -> completed
//
// Pending / awaiting-payment orders may also
// be rejected or cancelled.
//
// Inventory is still deducted ONLY when
// the order becomes completed.
//
// pending orders may also be rejected or cancelled.
// Cancelled and rejected orders are terminal and cannot be reopened.
//

const processingNextStatus =
    order.fulfillment === 'delivery'
        ? 'out_for_delivery'
        : 'ready';

const validTransitions = {
    pending: [
        'approved',
        'rejected',
        'cancelled'
    ],

    awaiting_payment: [
        'rejected',
        'cancelled'
    ],

    approved: [
        'processing',
        'cancelled'
    ],

    processing: [
        processingNextStatus,
        'cancelled'
    ],

    ready: [
        'completed',
        'cancelled'
    ],

    out_for_delivery: [
        'completed',
        'cancelled'
    ],

    rejected: [],
    cancelled: []
};

const isNormalTransition =
    validTransitions[order.status]?.includes(status);

if (!isNormalTransition) {
    await connection.rollback();

    return res.status(409).json({
        error:
            `Invalid order status transition: ` +
            `${order.status} -> ${status}.`
    });
}


// -----------------------------------------------------
// ONLINE PAYMENT VERIFICATION BEFORE ADMIN APPROVAL
// -----------------------------------------------------
//
// Cash orders do not require prior gateway payment.
// Card / GCash / PayMongo orders must already have
// a successfully verified Paid payment before the
// Admin is allowed to approve the order.

if (
    status === 'approved' &&
    requiresVerifiedOnlinePayment
) {
    // First confirm that the main order record
    // already reflects a successful payment.
    if (paymentStatus !== 'paid') {
        await connection.rollback();

        return res.status(409).json({
            error:
                'Online payment must be successfully verified before this order can be approved.'
        });
    }

    // Then confirm that a real verified successful
    // gateway-payment record exists for this order.
    const [verifiedPayments] =
        await connection.query(
            `
                SELECT payment_id
                FROM payments
                WHERE order_id = ?
                  AND payment_status = 'Paid'
                  AND gateway_transaction_id IS NOT NULL
                  AND verified_at IS NOT NULL
                LIMIT 1
            `,
            [id]
        );

    if (verifiedPayments.length === 0) {
        await connection.rollback();

        return res.status(409).json({
            error:
                'No verified successful online payment was found for this order.'
        });
    }
}


// Existing delivery-fee approval validation continues here.
if (
    status === 'approved' &&
    order.fulfillment === 'delivery' &&
    (
        order.delivery_fee === null ||
        order.delivery_fee === undefined ||
        !Number.isFinite(Number(order.delivery_fee))
    )
) {
    await connection.rollback();

    return res.status(400).json({
        error:
    'This delivery order does not have a valid system-calculated delivery fee. Review the delivery-rate configuration before approval.'
    });
}

        // Only deduct inventory when the NEW status is completed.
        if (status === 'completed') {
const [items] = await connection.query(
    `SELECT
        oi.product_id,
        oi.quantity,
        oi.price,
        p.name,
        p.stock
     FROM order_items oi
     JOIN products p
        ON p.id = oi.product_id
     WHERE oi.order_id = ?
     FOR UPDATE`,
    [id]
);

            if (items.length === 0) {
                throw new Error(
                    'This order has no order items.'
                );
            }

            // First verify that every product still has
            // enough stock before changing anything.
            for (const item of items) {
                const availableStock = Number(item.stock);
                const requiredQuantity = Number(item.quantity);

                if (availableStock < requiredQuantity) {
                    const stockError = new Error(
                        `Insufficient stock for ${item.name}. ` +
                        `Available: ${availableStock}, ` +
                        `required: ${requiredQuantity}.`
                    );

                    stockError.code = 'INSUFFICIENT_STOCK';
                    throw stockError;
                }
            }

            // Create the completed Sales record.
const saleOrderId =
    resolvedSalesSource === 'Onsite POS'
        ? null
        : id;

const [saleResult] = await connection.query(
    `
    INSERT INTO sales (
        order_id,
        admin_id,
        sales_source,
        total_amount,
        payment_status,
        payment_method,
        sale_date
    )
    VALUES (?, ?, ?, ?, 'Paid', ?, NOW())
    `,
    [
        saleOrderId,
        req.user.id,
        resolvedSalesSource,
        Number(order.total) +
            Number(order.service_fee || 0) +
            Number(order.delivery_fee || 0),
        order.payment_method
    ]
);

const saleId = saleResult.insertId;

// Save each sold product in Sale_Items.
for (const item of items) {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.price);

    const subtotal = Number(
        (quantity * unitPrice).toFixed(2)
    );

    await connection.query(
        `
        INSERT INTO sale_items (
            sale_id,
            product_id,
            quantity,
            unit_price,
            subtotal
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            saleId,
            item.product_id,
            quantity,
            unitPrice,
            subtotal
        ]
    );
}

// All items have sufficient stock.
// Calculate Weighted-Average Cost, deduct inventory,
// and create the Stock-Out movement for every sold item.
for (const item of items) {
    const requiredQuantity = Number(item.quantity);
    const sellingPrice = Number(item.price);

    // Read the latest stock while the transaction is locked.
    const [stockRows] = await connection.query(
        `
        SELECT stock
        FROM products
        WHERE id = ?
        FOR UPDATE
        `,
        [item.product_id]
    );

    const currentStock = Number(stockRows[0].stock);

    if (currentStock < requiredQuantity) {
        const stockError = new Error(
            `Insufficient stock for ${item.name}. ` +
            `Available: ${currentStock}, ` +
            `required: ${requiredQuantity}.`
        );

        stockError.code = 'INSUFFICIENT_STOCK';
        throw stockError;
    }

    // Calculate the current inventory value from movement history.
    const [costRows] = await connection.query(
        `
        SELECT
            COUNT(*) AS movement_count,
            COALESCE(
                SUM(
                    CASE
                        WHEN movement_type = 'Stock-In'
                            THEN quantity * supplier_price

                        WHEN movement_type = 'Stock-Out'
                            THEN -(quantity * supplier_price)

                        ELSE 0
                    END
                ),
                0
            ) AS inventory_value
        FROM inventory_movements
        WHERE product_id = ?
        `,
        [item.product_id]
    );

    const movementCount =
        Number(costRows[0].movement_count);

    const currentInventoryValue =
        Number(costRows[0].inventory_value);

    // Existing stock must have an opening inventory/cost history
    // before it can be sold using Weighted-Average Cost.
    if (currentStock > 0 && movementCount === 0) {
        const historyError = new Error(
            `Opening inventory must be recorded for ${item.name} ` +
            `before completing this sale.`
        );

        historyError.code = 'INVENTORY_HISTORY_REQUIRED';
        throw historyError;
    }

    const weightedAverageCost =
        Number(
            (
                currentInventoryValue /
                currentStock
            ).toFixed(2)
        );

    // Deduct the physical stock.
    const [result] = await connection.query(
        `
        UPDATE products
        SET stock = stock - ?
        WHERE id = ?
          AND stock >= ?
        `,
        [
            requiredQuantity,
            item.product_id,
            requiredQuantity
        ]
    );

    if (result.affectedRows !== 1) {
        const stockError = new Error(
            `Unable to deduct stock for ${item.name}.`
        );

        stockError.code = 'INSUFFICIENT_STOCK';
        throw stockError;
    }

    // Record the Stock-Out.
    //
    // supplier_price stores the Weighted-Average Cost per unit
    // for this outgoing inventory.
    //
    // selling_price stores the actual selling price of the sale.
    await connection.query(
        `
        INSERT INTO inventory_movements (
            product_id,
            admin_id,
            supplier_id,
            sale_id,
            movement_type,
            quantity,
            supplier_price,
            selling_price,
            movement_date,
            remarks
        )
        VALUES (?, ?, NULL, ?, 'Stock-Out', ?, ?, ?, NOW(), ?)
        `,
        [
            item.product_id,
            req.user.id,
            saleId,
            requiredQuantity,
            weightedAverageCost,
            sellingPrice,
            `${resolvedSalesSource} Sale`
        ]
    );
}

// CLOSE: if (status === 'completed')
}

// Update the order only after all required
// inventory operations succeed.

await connection.query(
    `UPDATE orders
     SET
         status = ?,
         previous_status = NULL,

         completed_at =
             CASE
                 WHEN ? = 'completed' THEN NOW()
                 ELSE completed_at
             END,

         payment_status =
             CASE ?
                 WHEN 'completed' THEN 'Paid'
                 WHEN 'cancelled' THEN 'Cancelled'
                 WHEN 'rejected' THEN 'Cancelled'
                 ELSE payment_status
             END

     WHERE id = ?`,
    [
        status,
        status,
        status,
        id
    ]
);

await recordOrderHistory(connection, {
    orderId: id,
    fromStatus: order.status,
    toStatus: status,
    adminId: req.user.id,
    note:
    order.fulfillment === 'pickup' &&
    order.status === 'ready' &&
    status === 'completed'
        ? 'Standard Pickup completed after the order was released to the customer.'
        : null,
});

await connection.commit();

        if (status === 'completed') {
            return res.json({
                message:
                    'Order completed successfully. Inventory has been deducted.'
            });
        }

        res.json({
            message: 'Order status updated successfully.'
        });

    } catch (err) {
        await connection.rollback();

        console.error(
            'Error updating order status:',
            err
        );

        if (err.code === 'INSUFFICIENT_STOCK') {
            return res.status(409).json({
                error: err.message
            });
        }
if (err.code === 'INVENTORY_HISTORY_REQUIRED') {
    return res.status(409).json({
        error: err.message
    });
}
        res.status(500).json({
            error: 'Failed to update order status.'
        });

    } finally {
        connection.release();
    }
    }
);

export default router;
