import express from 'express';
import pool from '../db.js';

import {
    authenticateToken,
    requireAdmin
} from '../middleware/auth.js';

const router = express.Router();


// View all suppliers - ADMIN ONLY
router.get(
    '/',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT
                    supplier_id,
                    supplier_name,
                    contact_person,
                    contact_number,
                    address,
                    status
                 FROM suppliers
                 ORDER BY supplier_name ASC`
            );

            res.json(rows);

        } catch (err) {
            console.error(
                'Error fetching suppliers:',
                err
            );

            res.status(500).json({
                error: 'Failed to fetch suppliers.'
            });
        }
    }
);

// Add a supplier - ADMIN ONLY
router.post(
    '/',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                supplier_name,
                contact_person,
                contact_number,
                address
            } = req.body;

            if (
                !supplier_name ||
                !supplier_name.trim()
            ) {
                return res.status(400).json({
                    error: 'Supplier name is required.'
                });
            }

            const cleanName = supplier_name.trim();

            // Prevent duplicate supplier names
            const [existingRows] = await pool.query(
                `SELECT supplier_id
                 FROM suppliers
                 WHERE LOWER(supplier_name) = LOWER(?)
                 LIMIT 1`,
                [cleanName]
            );

            if (existingRows.length > 0) {
                return res.status(409).json({
                    error: 'Supplier already exists.'
                });
            }

            const [result] = await pool.query(
                `INSERT INTO suppliers (
                    supplier_name,
                    contact_person,
                    contact_number,
                    address,
                    status
                 )
                 VALUES (?, ?, ?, ?, 'Active')`,
                [
                    cleanName,
                    contact_person?.trim() || null,
                    contact_number?.trim() || null,
                    address?.trim() || null
                ]
            );

            res.status(201).json({
                message: 'Supplier added successfully.',
                supplier_id: result.insertId
            });

        } catch (err) {
            console.error(
                'Error adding supplier:',
                err
            );

            res.status(500).json({
                error: 'Failed to add supplier.'
            });
        }
    }
);

// Update a supplier - ADMIN ONLY
router.put(
    '/:id',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;

            const {
                supplier_name,
                contact_person,
                contact_number,
                address
            } = req.body;

            if (
                !supplier_name ||
                !supplier_name.trim()
            ) {
                return res.status(400).json({
                    error: 'Supplier name is required.'
                });
            }

            const cleanName = supplier_name.trim();

            // Check whether supplier exists
            const [currentRows] = await pool.query(
                `SELECT supplier_id
                 FROM suppliers
                 WHERE supplier_id = ?
                 LIMIT 1`,
                [id]
            );

            if (currentRows.length === 0) {
                return res.status(404).json({
                    error: 'Supplier not found.'
                });
            }

            // Prevent duplicate supplier names
            const [duplicateRows] = await pool.query(
                `SELECT supplier_id
                 FROM suppliers
                 WHERE LOWER(supplier_name) = LOWER(?)
                   AND supplier_id <> ?
                 LIMIT 1`,
                [cleanName, id]
            );

            if (duplicateRows.length > 0) {
                return res.status(409).json({
                    error: 'Supplier already exists.'
                });
            }

            await pool.query(
                `UPDATE suppliers
                 SET supplier_name = ?,
                     contact_person = ?,
                     contact_number = ?,
                     address = ?
                 WHERE supplier_id = ?`,
                [
                    cleanName,
                    contact_person?.trim() || null,
                    contact_number?.trim() || null,
                    address?.trim() || null,
                    id
                ]
            );

            res.json({
                message: 'Supplier updated successfully.'
            });

        } catch (err) {
            console.error(
                'Error updating supplier:',
                err
            );

            res.status(500).json({
                error: 'Failed to update supplier.'
            });
        }
    }
);

// Activate or deactivate a supplier - ADMIN ONLY
router.patch(
    '/:id/status',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const allowedStatuses = [
                'Active',
                'Inactive'
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    error: 'Invalid supplier status.'
                });
            }

            const [result] = await pool.query(
                `UPDATE suppliers
                 SET status = ?
                 WHERE supplier_id = ?`,
                [status, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Supplier not found.'
                });
            }

            res.json({
                message: `Supplier ${status.toLowerCase()} successfully.`
            });

        } catch (err) {
            console.error(
                'Error updating supplier status:',
                err
            );

            res.status(500).json({
                error: 'Failed to update supplier status.'
            });
        }
    }
);

export default router;