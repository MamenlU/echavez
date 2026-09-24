import express from 'express';
import pool from '../db.js';
import {
    authenticateToken,
    requireAdmin
} from '../middleware/auth.js';
const router = express.Router();

// Get all active categories
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                category_id,
                category_name,
                description,
                status
             FROM categories
             WHERE status = 'Active'
             ORDER BY category_name ASC`
        );

        res.json(rows);

    } catch (err) {
        console.error(
            'Error fetching categories:',
            err
        );

        res.status(500).json({
            error: 'Failed to fetch categories'
        });
    }
});
// Get all categories including inactive - ADMIN ONLY
router.get(
    '/admin/all',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT
                    category_id,
                    category_name,
                    description,
                    status
                 FROM categories
                 ORDER BY category_name ASC`
            );

            res.json(rows);

        } catch (err) {
            console.error(
                'Error fetching all categories:',
                err
            );

            res.status(500).json({
                error: 'Failed to fetch categories.'
            });
        }
    }
);
// Add a new category - ADMIN ONLY
router.post(
    '/',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                category_name,
                description
            } = req.body;

            if (
                !category_name ||
                !category_name.trim()
            ) {
                return res.status(400).json({
                    error: 'Category name is required.'
                });
            }

            const cleanName =
                category_name.trim();

            // Prevent duplicate category names
            const [existing] = await pool.query(
                `SELECT category_id
                 FROM categories
                 WHERE LOWER(category_name) = LOWER(?)
                 LIMIT 1`,
                [cleanName]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    error: 'Category already exists.'
                });
            }

            const [result] = await pool.query(
                `INSERT INTO categories
                 (
                    category_name,
                    description,
                    status
                 )
                 VALUES (?, ?, 'Active')`,
                [
                    cleanName,
                    description?.trim() || null
                ]
            );

            res.status(201).json({
                category_id: result.insertId,
                message: 'Category added successfully.'
            });

        } catch (err) {
            console.error(
                'Error adding category:',
                err
            );

            res.status(500).json({
                error: 'Failed to add category.'
            });
        }
    }
);

// Update a category - ADMIN ONLY
router.put(
    '/:id',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        const connection = await pool.getConnection();

        try {
            const { id } = req.params;

            const {
                category_name,
                description
            } = req.body;

            if (
                !category_name ||
                !category_name.trim()
            ) {
                return res.status(400).json({
                    error: 'Category name is required.'
                });
            }

            const cleanName = category_name.trim();

            await connection.beginTransaction();

            // Check whether category exists
            const [currentRows] = await connection.query(
                `SELECT category_id, category_name
                 FROM categories
                 WHERE category_id = ?
                 LIMIT 1`,
                [id]
            );

            if (currentRows.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    error: 'Category not found.'
                });
            }

            // Prevent duplicate category names
            const [duplicateRows] = await connection.query(
                `SELECT category_id
                 FROM categories
                 WHERE LOWER(category_name) = LOWER(?)
                   AND category_id <> ?
                 LIMIT 1`,
                [cleanName, id]
            );

            if (duplicateRows.length > 0) {
                await connection.rollback();

                return res.status(409).json({
                    error: 'Category already exists.'
                });
            }

            // Update the main Categories record
            await connection.query(
                `UPDATE categories
                 SET category_name = ?,
                     description = ?
                 WHERE category_id = ?`,
                [
                    cleanName,
                    description?.trim() || null,
                    id
                ]
            );

            /*
             * TEMPORARY SYNCHRONIZATION:
             * Products currently still contain the old category text field.
             * category_id remains the true relationship.
             */
            await connection.query(
                `UPDATE products
                 SET category = ?
                 WHERE category_id = ?`,
                [
                    cleanName,
                    id
                ]
            );

            await connection.commit();

            res.json({
                message: 'Category updated successfully.'
            });

        } catch (err) {
            await connection.rollback();

            console.error(
                'Error updating category:',
                err
            );

            res.status(500).json({
                error: 'Failed to update category.'
            });

        } finally {
            connection.release();
        }
    }
);

// Activate or deactivate a category - ADMIN ONLY
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
                    error: 'Invalid category status.'
                });
            }

            const [result] = await pool.query(
                `UPDATE categories
                 SET status = ?
                 WHERE category_id = ?`,
                [status, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Category not found.'
                });
            }

            res.json({
                message: `Category ${status.toLowerCase()} successfully.`
            });

        } catch (err) {
            console.error(
                'Error updating category status:',
                err
            );

            res.status(500).json({
                error: 'Failed to update category status.'
            });
        }
    }
);
export default router;

