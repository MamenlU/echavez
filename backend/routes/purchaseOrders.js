import express from 'express';
import { randomInt } from 'node:crypto';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { recordAuditLog } from '../lib/auditService.js';
import { getPurchaseOrderProgress } from '../lib/purchaseOrderService.js';

const router = express.Router();
router.use(authenticateToken, requireAdmin);

const MAX_ITEMS = 100;

function cleanOptionalText(value, maxLength) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  if (text.length > maxLength) {
    throw Object.assign(new Error(`Text must not exceed ${maxLength} characters.`), { statusCode: 400 });
  }
  return text;
}

function normalizeExpectedDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw Object.assign(new Error('Expected delivery date must use YYYY-MM-DD format.'), { statusCode: 400 });
  }
  return text;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ITEMS) {
    throw Object.assign(new Error(`Purchase order must contain 1 to ${MAX_ITEMS} product lines.`), { statusCode: 400 });
  }

  const seen = new Set();
  return items.map((item) => {
    const productId = Number(item.product_id);
    const quantity = Number(item.ordered_quantity);
    const expectedUnitCost = Number(item.expected_unit_cost);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw Object.assign(new Error('Every purchase-order line needs a valid product.'), { statusCode: 400 });
    }
    if (seen.has(productId)) {
      throw Object.assign(new Error('A product may appear only once in the same purchase order.'), { statusCode: 400 });
    }
    seen.add(productId);

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000000) {
      throw Object.assign(new Error('Ordered quantity must be a whole number from 1 to 1,000,000.'), { statusCode: 400 });
    }
    if (!Number.isFinite(expectedUnitCost) || expectedUnitCost <= 0 || expectedUnitCost > 9999999999) {
      throw Object.assign(new Error('Expected unit cost must be greater than zero.'), { statusCode: 400 });
    }

    return {
      product_id: productId,
      ordered_quantity: quantity,
      expected_unit_cost: Number(expectedUnitCost.toFixed(2)),
    };
  });
}

function createPoNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `PO-${y}${m}${d}-${h}${min}${sec}-${randomInt(10, 100)}`;
}

async function validateSupplierAndProducts(db, supplierId, items) {
  const [suppliers] = await db.query(
    `SELECT supplier_id, supplier_name, status
     FROM suppliers
     WHERE supplier_id = ? AND status = 'Active'
     LIMIT 1`,
    [supplierId]
  );
  if (!suppliers.length) {
    throw Object.assign(new Error('Select an active supplier.'), { statusCode: 400 });
  }

  const ids = items.map((item) => item.product_id);
  const placeholders = ids.map(() => '?').join(', ');
  const [products] = await db.query(
    `SELECT id, name, status
     FROM products
     WHERE id IN (${placeholders})`,
    ids
  );
  if (products.length !== ids.length) {
    throw Object.assign(new Error('One or more selected products no longer exist.'), { statusCode: 400 });
  }
  const inactive = products.find((product) => product.status !== 'active');
  if (inactive) {
    throw Object.assign(new Error(`Product "${inactive.name}" is inactive and cannot be added to a new purchase order.`), { statusCode: 400 });
  }

  return { supplier: suppliers[0], products };
}

async function insertItems(db, purchaseOrderId, items) {
  for (const item of items) {
    await db.query(
      `INSERT INTO purchase_order_items (
         purchase_order_id, product_id, ordered_quantity, expected_unit_cost, created_at
       ) VALUES (?, ?, ?, ?, NOW())`,
      [purchaseOrderId, item.product_id, item.ordered_quantity, item.expected_unit_cost]
    );
  }
}

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         po.purchase_order_id,
         po.po_number,
         po.supplier_id,
         s.supplier_name,
         po.status,
         po.expected_delivery_date,
         po.notes,
         po.created_by_admin_id,
         CONCAT_WS(' ', creator.first_name, creator.last_name) AS created_by,
         po.ordered_by_admin_id,
         CONCAT_WS(' ', ordered_by.first_name, ordered_by.last_name) AS ordered_by,
         po.ordered_at,
         po.cancelled_at,
         po.created_at,
         po.updated_at,
         COALESCE(metrics.item_count, 0) AS item_count,
         COALESCE(metrics.ordered_quantity, 0) AS ordered_quantity,
         COALESCE(metrics.received_quantity, 0) AS received_quantity,
         COALESCE(metrics.remaining_quantity, 0) AS remaining_quantity,
         COALESCE(metrics.expected_cost, 0) AS expected_cost,
         COALESCE(metrics.actual_received_cost, 0) AS actual_received_cost
       FROM purchase_orders po
       INNER JOIN suppliers s ON s.supplier_id = po.supplier_id
       LEFT JOIN users creator ON creator.id = po.created_by_admin_id
       LEFT JOIN users ordered_by ON ordered_by.id = po.ordered_by_admin_id
       LEFT JOIN (
         SELECT
           poi.purchase_order_id,
           COUNT(*) AS item_count,
           SUM(poi.ordered_quantity) AS ordered_quantity,
           SUM(poi.ordered_quantity * poi.expected_unit_cost) AS expected_cost,
           SUM(COALESCE(receipts.received_quantity, 0)) AS received_quantity,
           SUM(GREATEST(poi.ordered_quantity - COALESCE(receipts.received_quantity, 0), 0)) AS remaining_quantity,
           SUM(COALESCE(receipts.received_cost, 0)) AS actual_received_cost
         FROM purchase_order_items poi
         LEFT JOIN (
           SELECT
             purchase_order_item_id,
             SUM(quantity) AS received_quantity,
             SUM(quantity * supplier_price) AS received_cost
           FROM inventory_movements
           WHERE purchase_order_item_id IS NOT NULL
             AND movement_type = 'Stock-In'
           GROUP BY purchase_order_item_id
         ) receipts ON receipts.purchase_order_item_id = poi.purchase_order_item_id
         GROUP BY poi.purchase_order_id
       ) metrics ON metrics.purchase_order_id = po.purchase_order_id
       ORDER BY po.created_at DESC, po.purchase_order_id DESC`
    );

    res.json({ purchase_orders: rows });
  } catch (error) {
    console.error('Purchase-order list error:', error);
    res.status(500).json({ error: 'Unable to load purchase orders.' });
  }
});

router.get('/:id', async (req, res) => {
  const purchaseOrderId = Number(req.params.id);
  if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) {
    return res.status(400).json({ error: 'Invalid purchase order.' });
  }

  try {
    const [headers] = await pool.query(
      `SELECT
         po.*,
         s.supplier_name,
         CONCAT_WS(' ', creator.first_name, creator.last_name) AS created_by,
         CONCAT_WS(' ', ordered_by.first_name, ordered_by.last_name) AS ordered_by,
         CONCAT_WS(' ', cancelled_by.first_name, cancelled_by.last_name) AS cancelled_by,
         COALESCE(metrics.item_count, 0) AS item_count,
         COALESCE(metrics.ordered_quantity, 0) AS ordered_quantity,
         COALESCE(metrics.received_quantity, 0) AS received_quantity,
         COALESCE(metrics.remaining_quantity, 0) AS remaining_quantity,
         COALESCE(metrics.expected_cost, 0) AS expected_cost,
         COALESCE(metrics.actual_received_cost, 0) AS actual_received_cost
       FROM purchase_orders po
       INNER JOIN suppliers s ON s.supplier_id = po.supplier_id
       LEFT JOIN users creator ON creator.id = po.created_by_admin_id
       LEFT JOIN users ordered_by ON ordered_by.id = po.ordered_by_admin_id
       LEFT JOIN users cancelled_by ON cancelled_by.id = po.cancelled_by_admin_id
       LEFT JOIN (
         SELECT
           poi.purchase_order_id,
           COUNT(*) AS item_count,
           SUM(poi.ordered_quantity) AS ordered_quantity,
           SUM(poi.ordered_quantity * poi.expected_unit_cost) AS expected_cost,
           SUM(COALESCE(receipts.received_quantity, 0)) AS received_quantity,
           SUM(GREATEST(poi.ordered_quantity - COALESCE(receipts.received_quantity, 0), 0)) AS remaining_quantity,
           SUM(COALESCE(receipts.received_cost, 0)) AS actual_received_cost
         FROM purchase_order_items poi
         LEFT JOIN (
           SELECT
             purchase_order_item_id,
             SUM(quantity) AS received_quantity,
             SUM(quantity * supplier_price) AS received_cost
           FROM inventory_movements
           WHERE purchase_order_item_id IS NOT NULL
             AND movement_type = 'Stock-In'
           GROUP BY purchase_order_item_id
         ) receipts ON receipts.purchase_order_item_id = poi.purchase_order_item_id
         GROUP BY poi.purchase_order_id
       ) metrics ON metrics.purchase_order_id = po.purchase_order_id
       WHERE po.purchase_order_id = ?
       LIMIT 1`,
      [purchaseOrderId]
    );
    if (!headers.length) return res.status(404).json({ error: 'Purchase order not found.' });

    const [items] = await pool.query(
      `SELECT
         poi.purchase_order_item_id,
         poi.product_id,
         p.name AS product_name,
         p.barcode,
         p.unit,
         p.price AS current_selling_price,
         p.stock AS current_stock,
         poi.ordered_quantity,
         poi.expected_unit_cost,
         COALESCE(receipts.received_quantity, 0) AS received_quantity,
         GREATEST(poi.ordered_quantity - COALESCE(receipts.received_quantity, 0), 0) AS remaining_quantity,
         COALESCE(receipts.actual_received_cost, 0) AS actual_received_cost,
         CASE
           WHEN COALESCE(receipts.received_quantity, 0) > 0
             THEN ROUND(receipts.actual_received_cost / receipts.received_quantity, 2)
           ELSE NULL
         END AS average_received_unit_cost
       FROM purchase_order_items poi
       INNER JOIN products p ON p.id = poi.product_id
       LEFT JOIN (
         SELECT
           purchase_order_item_id,
           SUM(quantity) AS received_quantity,
           SUM(quantity * supplier_price) AS actual_received_cost
         FROM inventory_movements
         WHERE purchase_order_item_id IS NOT NULL
           AND movement_type = 'Stock-In'
         GROUP BY purchase_order_item_id
       ) receipts ON receipts.purchase_order_item_id = poi.purchase_order_item_id
       WHERE poi.purchase_order_id = ?
       ORDER BY poi.purchase_order_item_id ASC`,
      [purchaseOrderId]
    );

    res.json({ purchase_order: headers[0], items });
  } catch (error) {
    console.error('Purchase-order detail error:', error);
    res.status(500).json({ error: 'Unable to load purchase-order details.' });
  }
});

router.post('/', async (req, res) => {
  const supplierId = Number(req.body.supplier_id);
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return res.status(400).json({ error: 'Select a valid supplier.' });
  }

  let items;
  let expectedDeliveryDate;
  let notes;
  try {
    items = normalizeItems(req.body.items);
    expectedDeliveryDate = normalizeExpectedDate(req.body.expected_delivery_date);
    notes = cleanOptionalText(req.body.notes, 500);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { supplier, products } = await validateSupplierAndProducts(connection, supplierId, items);
    const poNumber = createPoNumber();
    const [result] = await connection.query(
      `INSERT INTO purchase_orders (
         po_number, supplier_id, status, expected_delivery_date, notes,
         created_by_admin_id, created_at, updated_at
       ) VALUES (?, ?, 'Draft', ?, ?, ?, NOW(), NOW())`,
      [poNumber, supplierId, expectedDeliveryDate, notes, req.user.id]
    );
    await insertItems(connection, result.insertId, items);

    await recordAuditLog(connection, {
      adminId: req.user.id,
      action: 'purchase_order.create',
      entityType: 'purchase_order',
      entityId: result.insertId,
      summary: `Created draft purchase order ${poNumber} for ${supplier.supplier_name}.`,
      after: {
        po_number: poNumber,
        supplier_id: supplierId,
        supplier_name: supplier.supplier_name,
        expected_delivery_date: expectedDeliveryDate,
        item_count: items.length,
        expected_cost: Number(items.reduce((sum, item) => sum + item.ordered_quantity * item.expected_unit_cost, 0).toFixed(2)),
        items: items.map((item) => ({
          ...item,
          product_name: products.find((product) => Number(product.id) === item.product_id)?.name || null,
        })),
      },
      reason: notes || 'Purchase order draft created.',
    });

    await connection.commit();
    res.status(201).json({
      message: 'Draft purchase order created successfully.',
      purchase_order_id: result.insertId,
      po_number: poNumber,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Purchase-order create error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to create purchase order.' });
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const purchaseOrderId = Number(req.params.id);
  const supplierId = Number(req.body.supplier_id);
  if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) return res.status(400).json({ error: 'Invalid purchase order.' });
  if (!Number.isInteger(supplierId) || supplierId <= 0) return res.status(400).json({ error: 'Select a valid supplier.' });

  let items;
  let expectedDeliveryDate;
  let notes;
  try {
    items = normalizeItems(req.body.items);
    expectedDeliveryDate = normalizeExpectedDate(req.body.expected_delivery_date);
    notes = cleanOptionalText(req.body.notes, 500);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [currentRows] = await connection.query(
      `SELECT po.*, s.supplier_name
       FROM purchase_orders po
       INNER JOIN suppliers s ON s.supplier_id = po.supplier_id
       WHERE po.purchase_order_id = ? FOR UPDATE`,
      [purchaseOrderId]
    );
    if (!currentRows.length) throw Object.assign(new Error('Purchase order not found.'), { statusCode: 404 });
    const current = currentRows[0];
    if (current.status !== 'Draft') {
      throw Object.assign(new Error('Only Draft purchase orders can be edited.'), { statusCode: 409 });
    }

    const { supplier, products } = await validateSupplierAndProducts(connection, supplierId, items);
    await connection.query(
      `UPDATE purchase_orders
       SET supplier_id = ?, expected_delivery_date = ?, notes = ?, updated_at = NOW()
       WHERE purchase_order_id = ?`,
      [supplierId, expectedDeliveryDate, notes, purchaseOrderId]
    );
    await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [purchaseOrderId]);
    await insertItems(connection, purchaseOrderId, items);

    await recordAuditLog(connection, {
      adminId: req.user.id,
      action: 'purchase_order.update',
      entityType: 'purchase_order',
      entityId: purchaseOrderId,
      summary: `Updated draft purchase order ${current.po_number}.`,
      before: {
        supplier_id: Number(current.supplier_id),
        supplier_name: current.supplier_name,
        expected_delivery_date: current.expected_delivery_date,
        notes: current.notes,
      },
      after: {
        supplier_id: supplierId,
        supplier_name: supplier.supplier_name,
        expected_delivery_date: expectedDeliveryDate,
        notes,
        item_count: items.length,
        items: items.map((item) => ({
          ...item,
          product_name: products.find((product) => Number(product.id) === item.product_id)?.name || null,
        })),
      },
      reason: notes || 'Draft purchase order updated.',
    });

    await connection.commit();
    res.json({ message: 'Draft purchase order updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Purchase-order update error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to update purchase order.' });
  } finally {
    connection.release();
  }
});

router.post('/:id/order', async (req, res) => {
  const purchaseOrderId = Number(req.params.id);
  if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) return res.status(400).json({ error: 'Invalid purchase order.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT purchase_order_id, po_number, supplier_id, status, expected_delivery_date
       FROM purchase_orders WHERE purchase_order_id = ? FOR UPDATE`,
      [purchaseOrderId]
    );
    if (!rows.length) throw Object.assign(new Error('Purchase order not found.'), { statusCode: 404 });
    const purchaseOrder = rows[0];
    if (purchaseOrder.status !== 'Draft') {
      throw Object.assign(new Error('Only Draft purchase orders can be marked Ordered.'), { statusCode: 409 });
    }
    const [itemCountRows] = await connection.query(
      'SELECT COUNT(*) AS item_count FROM purchase_order_items WHERE purchase_order_id = ?',
      [purchaseOrderId]
    );
    if (Number(itemCountRows[0].item_count) < 1) {
      throw Object.assign(new Error('Purchase order must contain at least one product.'), { statusCode: 409 });
    }

    await connection.query(
      `UPDATE purchase_orders
       SET status = 'Ordered', ordered_by_admin_id = ?, ordered_at = NOW(), updated_at = NOW()
       WHERE purchase_order_id = ?`,
      [req.user.id, purchaseOrderId]
    );
    await recordAuditLog(connection, {
      adminId: req.user.id,
      action: 'purchase_order.order',
      entityType: 'purchase_order',
      entityId: purchaseOrderId,
      summary: `Marked purchase order ${purchaseOrder.po_number} as Ordered.`,
      before: { status: 'Draft' },
      after: { status: 'Ordered', ordered_by_admin_id: req.user.id },
      reason: 'Admin confirmed that the purchase order was placed with the supplier.',
    });
    await connection.commit();
    res.json({ message: 'Purchase order marked as Ordered.' });
  } catch (error) {
    await connection.rollback();
    console.error('Purchase-order order action error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to mark purchase order as Ordered.' });
  } finally {
    connection.release();
  }
});

router.post('/:id/cancel', async (req, res) => {
  const purchaseOrderId = Number(req.params.id);
  if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) return res.status(400).json({ error: 'Invalid purchase order.' });
  let reason;
  try {
    reason = cleanOptionalText(req.body.reason, 500) || 'Purchase order cancelled by Admin.';
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT purchase_order_id, po_number, status FROM purchase_orders WHERE purchase_order_id = ? FOR UPDATE',
      [purchaseOrderId]
    );
    if (!rows.length) throw Object.assign(new Error('Purchase order not found.'), { statusCode: 404 });
    const purchaseOrder = rows[0];
    if (purchaseOrder.status === 'Cancelled') {
      throw Object.assign(new Error('This purchase order is already cancelled.'), { statusCode: 409 });
    }
    if (purchaseOrder.status === 'Received') {
      throw Object.assign(new Error('A fully received purchase order cannot be cancelled.'), { statusCode: 409 });
    }

    const progress = await getPurchaseOrderProgress(connection, purchaseOrderId);
    await connection.query(
      `UPDATE purchase_orders
       SET status = 'Cancelled', cancelled_by_admin_id = ?, cancelled_at = NOW(), updated_at = NOW()
       WHERE purchase_order_id = ?`,
      [req.user.id, purchaseOrderId]
    );

    await recordAuditLog(connection, {
      adminId: req.user.id,
      action: 'purchase_order.cancel',
      entityType: 'purchase_order',
      entityId: purchaseOrderId,
      summary: Number(progress?.received_quantity || 0) > 0
        ? `Cancelled remaining quantities on ${purchaseOrder.po_number}.`
        : `Cancelled purchase order ${purchaseOrder.po_number}.`,
      before: {
        status: purchaseOrder.status,
        received_quantity: Number(progress?.received_quantity || 0),
        remaining_quantity: Number(progress?.remaining_quantity || 0),
      },
      after: { status: 'Cancelled' },
      reason,
    });

    await connection.commit();
    res.json({ message: Number(progress?.received_quantity || 0) > 0
      ? 'Remaining quantities cancelled. Already received stock remains unchanged.'
      : 'Purchase order cancelled successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Purchase-order cancel error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to cancel purchase order.' });
  } finally {
    connection.release();
  }
});

export default router;
