import express from 'express';
import pool from '../db.js';
import { recordAuditLog } from '../lib/auditService.js';
import {
    authenticateToken,
    requireAdmin
} from '../middleware/auth.js';

const router = express.Router();

function normalizeLeadTime(value) {
    if (value === undefined || value === null || value === '') return null;

    const leadTime = Number(value);
    if (!Number.isInteger(leadTime) || leadTime < 0 || leadTime > 365) {
        const error = new Error('Supplier lead time must be a whole number from 0 to 365 days.');
        error.statusCode = 400;
        throw error;
    }

    return leadTime;
}

function supplierSnapshot(supplier) {
    if (!supplier) return null;
    return {
        supplier_id: Number(supplier.supplier_id),
        supplier_name: supplier.supplier_name ?? null,
        contact_person: supplier.contact_person ?? null,
        contact_number: supplier.contact_number ?? null,
        address: supplier.address ?? null,
        lead_time_days: supplier.lead_time_days === null || supplier.lead_time_days === undefined
            ? null
            : Number(supplier.lead_time_days),
        status: supplier.status ?? null,
    };
}

// View all suppliers - ADMIN ONLY
router.get(
    '/',
    authenticateToken,
    requireAdmin,
    async (_req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT
                    supplier_id,
                    supplier_name,
                    contact_person,
                    contact_number,
                    address,
                    lead_time_days,
                    status
                 FROM suppliers
                 ORDER BY supplier_name ASC`
            );

            res.json(rows);

        } catch (err) {
            console.error('Error fetching suppliers:', err);
            res.status(500).json({ error: 'Failed to fetch suppliers.' });
        }
    }
);

// Add a supplier - ADMIN ONLY
router.post(
    '/',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        const connection = await pool.getConnection();

        try {
            const {
                supplier_name,
                contact_person,
                contact_number,
                address
            } = req.body;
            const leadTimeDays = normalizeLeadTime(req.body.lead_time_days);

            if (!supplier_name || !supplier_name.trim()) {
                return res.status(400).json({ error: 'Supplier name is required.' });
            }

            const cleanName = supplier_name.trim();
            await connection.beginTransaction();

            const [existingRows] = await connection.query(
                `SELECT supplier_id
                 FROM suppliers
                 WHERE LOWER(supplier_name) = LOWER(?)
                 LIMIT 1`,
                [cleanName]
            );

            if (existingRows.length > 0) {
                await connection.rollback();
                return res.status(409).json({ error: 'Supplier already exists.' });
            }

            const [result] = await connection.query(
                `INSERT INTO suppliers (
                    supplier_name,
                    contact_person,
                    contact_number,
                    address,
                    lead_time_days,
                    status
                 )
                 VALUES (?, ?, ?, ?, ?, 'Active')`,
                [
                    cleanName,
                    contact_person?.trim() || null,
                    contact_number?.trim() || null,
                    address?.trim() || null,
                    leadTimeDays
                ]
            );

            const [createdRows] = await connection.query(
                `SELECT supplier_id, supplier_name, contact_person, contact_number,
                        address, lead_time_days, status
                 FROM suppliers
                 WHERE supplier_id = ?
                 LIMIT 1`,
                [result.insertId]
            );

            await recordAuditLog(connection, {
                adminId: req.user.id, actorRole: req.user.role,
                action: 'supplier.create',
                entityType: 'supplier',
                entityId: result.insertId,
                summary: `Created supplier ${cleanName}.`,
                before: null,
                after: supplierSnapshot(createdRows[0]),
                reason: 'Admin created supplier record.',
            });

            await connection.commit();

            res.status(201).json({
                message: 'Supplier added successfully.',
                supplier_id: result.insertId
            });

        } catch (err) {
            try { await connection.rollback(); } catch {}
            console.error('Error adding supplier:', err);
            res.status(err.statusCode || 500).json({
                error: err.statusCode ? err.message : 'Failed to add supplier.'
            });
        } finally {
            connection.release();
        }
    }
);

// Update a supplier - ADMIN ONLY
router.put(
    '/:id',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        const connection = await pool.getConnection();

        try {
            const { id } = req.params;
            const {
                supplier_name,
                contact_person,
                contact_number,
                address
            } = req.body;
            const leadTimeDays = normalizeLeadTime(req.body.lead_time_days);

            if (!supplier_name || !supplier_name.trim()) {
                return res.status(400).json({ error: 'Supplier name is required.' });
            }

            const cleanName = supplier_name.trim();
            await connection.beginTransaction();

            const [currentRows] = await connection.query(
                `SELECT supplier_id, supplier_name, contact_person, contact_number,
                        address, lead_time_days, status
                 FROM suppliers
                 WHERE supplier_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [id]
            );

            if (currentRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Supplier not found.' });
            }

            const [duplicateRows] = await connection.query(
                `SELECT supplier_id
                 FROM suppliers
                 WHERE LOWER(supplier_name) = LOWER(?)
                   AND supplier_id <> ?
                 LIMIT 1`,
                [cleanName, id]
            );

            if (duplicateRows.length > 0) {
                await connection.rollback();
                return res.status(409).json({ error: 'Supplier already exists.' });
            }

            await connection.query(
                `UPDATE suppliers
                 SET supplier_name = ?,
                     contact_person = ?,
                     contact_number = ?,
                     address = ?,
                     lead_time_days = ?
                 WHERE supplier_id = ?`,
                [
                    cleanName,
                    contact_person?.trim() || null,
                    contact_number?.trim() || null,
                    address?.trim() || null,
                    leadTimeDays,
                    id
                ]
            );

            const [updatedRows] = await connection.query(
                `SELECT supplier_id, supplier_name, contact_person, contact_number,
                        address, lead_time_days, status
                 FROM suppliers
                 WHERE supplier_id = ?
                 LIMIT 1`,
                [id]
            );

            const before = supplierSnapshot(currentRows[0]);
            const after = supplierSnapshot(updatedRows[0]);
            const leadTimeChanged = before.lead_time_days !== after.lead_time_days;

            await recordAuditLog(connection, {
                adminId: req.user.id, actorRole: req.user.role,
                action: leadTimeChanged ? 'supplier.lead_time_update' : 'supplier.update',
                entityType: 'supplier',
                entityId: id,
                summary: leadTimeChanged
                    ? `Updated ${cleanName} lead time from ${before.lead_time_days ?? 'not set'} to ${after.lead_time_days ?? 'not set'} day(s).`
                    : `Updated supplier ${cleanName}.`,
                before,
                after,
                reason: leadTimeChanged
                    ? 'Admin updated supplier delivery lead time used by reorder suggestions.'
                    : 'Admin updated supplier information.',
            });

            await connection.commit();
            res.json({ message: 'Supplier updated successfully.' });

        } catch (err) {
            try { await connection.rollback(); } catch {}
            console.error('Error updating supplier:', err);
            res.status(err.statusCode || 500).json({
                error: err.statusCode ? err.message : 'Failed to update supplier.'
            });
        } finally {
            connection.release();
        }
    }
);

// Activate or deactivate a supplier - ADMIN ONLY
router.patch(
    '/:id/status',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        const connection = await pool.getConnection();

        try {
            const { id } = req.params;
            const { status } = req.body;

            const allowedStatuses = ['Active', 'Inactive'];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid supplier status.' });
            }

            await connection.beginTransaction();
            const [currentRows] = await connection.query(
                `SELECT supplier_id, supplier_name, contact_person, contact_number,
                        address, lead_time_days, status
                 FROM suppliers
                 WHERE supplier_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [id]
            );

            if (currentRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Supplier not found.' });
            }

            await connection.query(
                `UPDATE suppliers
                 SET status = ?
                 WHERE supplier_id = ?`,
                [status, id]
            );

            const after = { ...supplierSnapshot(currentRows[0]), status };
            await recordAuditLog(connection, {
                adminId: req.user.id, actorRole: req.user.role,
                action: 'supplier.status_change',
                entityType: 'supplier',
                entityId: id,
                summary: `${status === 'Active' ? 'Activated' : 'Deactivated'} supplier ${currentRows[0].supplier_name}.`,
                before: supplierSnapshot(currentRows[0]),
                after,
                reason: 'Admin changed supplier availability status.',
            });

            await connection.commit();
            res.json({ message: `Supplier ${status.toLowerCase()} successfully.` });

        } catch (err) {
            try { await connection.rollback(); } catch {}
            console.error('Error updating supplier status:', err);
            res.status(500).json({ error: 'Failed to update supplier status.' });
        } finally {
            connection.release();
        }
    }
);

export default router;
