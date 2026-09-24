import express from 'express';
import pool from '../db.js';

import {
    authenticateToken,
    requireAdmin
} from '../middleware/auth.js';

const router = express.Router();


// List all registered customer accounts with order statistics.
router.get(
    '/',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone_number,
                    u.avatar_url,
                    u.status,
                    u.created_at,
                    u.last_login,
                    COUNT(o.id) AS total_orders,
                    SUM(
                        CASE
                            WHEN o.status = 'completed' THEN 1
                            ELSE 0
                        END
                    ) AS completed_orders,
                    SUM(
                        CASE
                            WHEN o.status IN (
                                'pending',
                                'awaiting_payment',
                                'approved',
                                'processing',
                                'ready',
                                'out_for_delivery',
                                'failed_delivery',
                                'deactivated'
                            ) THEN 1
                            ELSE 0
                        END
                    ) AS active_orders,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN o.status = 'completed'
                                THEN o.total + COALESCE(o.service_fee, 0) + COALESCE(o.delivery_fee, 0)
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_spent
                 FROM users u
                 LEFT JOIN orders o
                    ON o.user_id = u.id
                 WHERE u.role = 'customer'
                 GROUP BY
                    u.id,
                    u.username,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone_number,
                    u.avatar_url,
                    u.status,
                    u.created_at,
                    u.last_login
                 ORDER BY u.created_at DESC, u.id DESC`
            );

            res.json(rows);

        } catch (err) {
            console.error(
                'Error fetching customer accounts:',
                err
            );

            res.status(500).json({
                error: 'Failed to fetch customer accounts.'
            });
        }
    }
);


// View the order history of one registered customer.
router.get(
    '/:id/orders',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const customerId = Number(req.params.id);

            if (!Number.isInteger(customerId) || customerId <= 0) {
                return res.status(400).json({
                    error: 'Invalid customer ID.'
                });
            }

            const [customerRows] = await pool.query(
                `SELECT id
                 FROM users
                 WHERE id = ?
                   AND role = 'customer'
                 LIMIT 1`,
                [customerId]
            );

            if (customerRows.length === 0) {
                return res.status(404).json({
                    error: 'Customer account was not found.'
                });
            }

            const [orderRows] = await pool.query(
                `SELECT
                    id,
                    total,
                    fulfillment,
                    payment_method,
                    status,
                    service_fee,
                    delivery_fee,
                    created_at
                 FROM orders
                 WHERE user_id = ?
                 ORDER BY created_at DESC, id DESC`,
                [customerId]
            );

            res.json(orderRows);

        } catch (err) {
            console.error(
                'Error fetching customer order history:',
                err
            );

            res.status(500).json({
                error: 'Failed to fetch customer order history.'
            });
        }
    }
);


// Activate or deactivate one customer account.
router.patch(
    '/:id/status',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const customerId = Number(req.params.id);
            const { status } = req.body;

            if (!Number.isInteger(customerId) || customerId <= 0) {
                return res.status(400).json({
                    error: 'Invalid customer ID.'
                });
            }

            const allowedStatuses = [
                'active',
                'inactive'
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    error: 'Customer status must be active or inactive.'
                });
            }

            const [result] = await pool.query(
                `UPDATE users
                 SET status = ?
                 WHERE id = ?
                   AND role = 'customer'`,
                [status, customerId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Customer account was not found.'
                });
            }

            res.json({
                message:
                    status === 'active'
                        ? 'Customer account activated successfully.'
                        : 'Customer account deactivated successfully.',
                status
            });

        } catch (err) {
            console.error(
                'Error updating customer status:',
                err
            );

            res.status(500).json({
                error: 'Failed to update customer status.'
            });
        }
    }
);


export default router;
