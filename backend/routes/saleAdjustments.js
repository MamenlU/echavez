import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { recordAuditLog } from '../lib/auditService.js';
import {
  calculateReturnLine,
  getSaleAdjustmentSnapshot,
  normalizeRefundMethod,
  requiresExternalRefundConfirmation,
} from '../lib/saleAdjustmentService.js';
import { getOpenShiftForAdmin, requireOpenShiftForAdmin } from '../lib/cashierShiftService.js';

const router = express.Router();
router.use(authenticateToken, requireAdmin);

const money = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
};

function normalizeReason(value) {
  const reason = String(value || '').trim().replace(/\s+/g, ' ');
  if (reason.length < 5 || reason.length > 500) {
    throw Object.assign(new Error('Reason must be 5 to 500 characters.'), { statusCode: 400 });
  }
  return reason;
}

function normalizeRequestId(value) {
  const requestId = String(value || '').trim();
  if (!requestId || requestId.length > 64) {
    throw Object.assign(new Error('Invalid or missing adjustment request ID.'), { statusCode: 400 });
  }
  return requestId;
}

function normalizeRefundReference(value) {
  const reference = String(value || '').trim().replace(/\s+/g, ' ');
  if (reference.length > 150) {
    throw Object.assign(new Error('Refund reference must not exceed 150 characters.'), { statusCode: 400 });
  }
  return reference || null;
}

function validateRefundEvidence({ refundMethod, refundReference, externalRefundConfirmed }) {
  const externalRequired = requiresExternalRefundConfirmation(refundMethod);
  if (externalRequired && externalRefundConfirmed !== true) {
    throw Object.assign(
      new Error('Confirm that the non-cash refund was completed externally before recording it in Rayjin Hardware.'),
      { statusCode: 400, code: 'EXTERNAL_REFUND_CONFIRMATION_REQUIRED' }
    );
  }
  if (externalRequired && !refundReference) {
    throw Object.assign(
      new Error('Enter the external refund/reference number for this non-cash refund.'),
      { statusCode: 400, code: 'REFUND_REFERENCE_REQUIRED' }
    );
  }
}

async function findDuplicate(requestId) {
  const [rows] = await pool.query(
    `SELECT adjustment_id, sale_id, adjustment_type, total_refund_amount
     FROM sale_adjustments
     WHERE adjustment_request_id = ?
     LIMIT 1`,
    [requestId]
  );
  return rows[0] || null;
}

async function addRestockMovement(connection, {
  adminId,
  saleId,
  adjustmentItemId,
  productId,
  quantity,
  unitCost,
  sellingPrice,
  movementReason,
  remarks,
}) {
  const [productRows] = await connection.query(
    'SELECT id, stock FROM products WHERE id = ? FOR UPDATE',
    [productId]
  );
  if (!productRows.length) {
    throw Object.assign(new Error('Returned product record no longer exists.'), {
      statusCode: 409,
      code: 'RETURN_PRODUCT_MISSING',
    });
  }

  await connection.query(
    'UPDATE products SET stock = stock + ? WHERE id = ?',
    [quantity, productId]
  );

  await connection.query(
    `INSERT INTO inventory_movements (
      product_id, admin_id, supplier_id, sale_id, movement_type, movement_reason,
      quantity, supplier_price, selling_price, movement_date, remarks,
      sale_adjustment_item_id
    ) VALUES (?, ?, NULL, ?, 'Stock-In', ?, ?, ?, ?, NOW(), ?, ?)`,
    [
      productId,
      adminId,
      saleId,
      movementReason,
      quantity,
      money(unitCost),
      money(sellingPrice),
      remarks,
      adjustmentItemId,
    ]
  );
}

router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const type = String(req.query.type || '').trim();
    const requestedLimit = Number(req.query.limit || 200);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 250)
      : 200;

    const conditions = [];
    const params = [];
    if (type === 'Return' || type === 'Void') {
      conditions.push('sa.adjustment_type = ?');
      params.push(type);
    }
    if (search) {
      conditions.push(`(
        CAST(sa.adjustment_id AS CHAR) LIKE ? OR
        CAST(sa.sale_id AS CHAR) LIKE ? OR
        COALESCE(s.order_id, '') LIKE ? OR
        sa.reason LIKE ? OR
        COALESCE(sa.refund_reference, '') LIKE ? OR
        CONCAT_WS(' ', u.first_name, u.last_name) LIKE ? OR
        u.username LIKE ?
      )`);
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
        sa.adjustment_id,
        sa.sale_id,
        sa.adjustment_type,
        sa.reason,
        sa.merchandise_refund_amount,
        sa.service_fee_refund_amount,
        sa.delivery_fee_refund_amount,
        sa.total_refund_amount,
        sa.refund_method,
        sa.refund_reference,
        sa.external_refund_confirmed,
        sa.processed_by_admin_id,
        sa.shift_id,
        sa.processed_at,
        s.order_id,
        s.sales_source,
        s.payment_method AS original_payment_method,
        CONCAT_WS(' ', u.first_name, u.last_name) AS processed_by,
        u.username AS processed_by_username,
        COALESCE(items.item_lines, 0) AS item_lines,
        COALESCE(items.total_quantity, 0) AS total_quantity,
        COALESCE(items.restocked_quantity, 0) AS restocked_quantity,
        COALESCE(items.non_restocked_quantity, 0) AS non_restocked_quantity,
        COALESCE(items.items_summary, '—') AS items_summary
       FROM sale_adjustments sa
       INNER JOIN sales s ON s.sale_id = sa.sale_id
       INNER JOIN users u ON u.id = sa.processed_by_admin_id
       LEFT JOIN (
         SELECT
           sai.adjustment_id,
           COUNT(*) AS item_lines,
           SUM(sai.quantity) AS total_quantity,
           SUM(CASE WHEN sai.restockable = 1 THEN sai.quantity ELSE 0 END) AS restocked_quantity,
           SUM(CASE WHEN sai.restockable = 0 THEN sai.quantity ELSE 0 END) AS non_restocked_quantity,
           GROUP_CONCAT(CONCAT(p.name, ' × ', sai.quantity) ORDER BY sai.adjustment_item_id SEPARATOR ', ') AS items_summary
         FROM sale_adjustment_items sai
         INNER JOIN products p ON p.id = sai.product_id
         GROUP BY sai.adjustment_id
       ) items ON items.adjustment_id = sa.adjustment_id
       ${where}
       ORDER BY sa.processed_at DESC, sa.adjustment_id DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json({
      adjustments: rows.map((row) => ({
        ...row,
        adjustment_reference: `${row.adjustment_type === 'Void' ? 'VOID' : 'RET'}-${String(row.adjustment_id).padStart(6, '0')}`,
        sale_reference: row.order_id || `POS-${String(row.sale_id).padStart(6, '0')}`,
      })),
      count: rows.length,
      limit,
    });
  } catch (error) {
    console.error('Sale adjustment history error:', error);
    res.status(500).json({ error: 'Unable to load return/refund/void history.' });
  }
});

router.get('/sales/:saleId/eligibility', async (req, res) => {
  try {
    const snapshot = await getSaleAdjustmentSnapshot(pool, req.params.saleId);
    if (!snapshot) return res.status(404).json({ error: 'Sale not found.' });
    res.json(snapshot);
  } catch (error) {
    console.error('Sale adjustment eligibility error:', error);
    res.status(500).json({ error: 'Unable to load sale adjustment eligibility.' });
  }
});

router.get('/:adjustmentId', async (req, res) => {
  try {
    const adjustmentId = Number(req.params.adjustmentId);
    if (!Number.isInteger(adjustmentId) || adjustmentId <= 0) {
      return res.status(400).json({ error: 'Invalid adjustment ID.' });
    }

    const [headers] = await pool.query(
      `SELECT
        sa.*,
        s.order_id,
        s.sales_source,
        s.sale_date,
        CONCAT_WS(' ', u.first_name, u.last_name) AS processed_by,
        u.username AS processed_by_username
       FROM sale_adjustments sa
       INNER JOIN sales s ON s.sale_id = sa.sale_id
       INNER JOIN users u ON u.id = sa.processed_by_admin_id
       WHERE sa.adjustment_id = ?
       LIMIT 1`,
      [adjustmentId]
    );
    if (!headers.length) return res.status(404).json({ error: 'Adjustment not found.' });

    const [items] = await pool.query(
      `SELECT
        sai.adjustment_item_id,
        sai.sale_item_id,
        sai.product_id,
        p.name AS product_name,
        sai.quantity,
        sai.unit_refund_amount,
        sai.refund_subtotal,
        sai.unit_cost,
        sai.restockable,
        im.movement_id AS restock_movement_id
       FROM sale_adjustment_items sai
       INNER JOIN products p ON p.id = sai.product_id
       LEFT JOIN inventory_movements im ON im.sale_adjustment_item_id = sai.adjustment_item_id
       WHERE sai.adjustment_id = ?
       ORDER BY sai.adjustment_item_id ASC`,
      [adjustmentId]
    );

    const header = headers[0];
    res.json({
      adjustment: {
        ...header,
        adjustment_reference: `${header.adjustment_type === 'Void' ? 'VOID' : 'RET'}-${String(header.adjustment_id).padStart(6, '0')}`,
        sale_reference: header.order_id || `POS-${String(header.sale_id).padStart(6, '0')}`,
      },
      items,
    });
  } catch (error) {
    console.error('Sale adjustment detail error:', error);
    res.status(500).json({ error: 'Unable to load adjustment details.' });
  }
});

router.post('/returns', async (req, res) => {
  let requestId;
  try {
    requestId = normalizeRequestId(req.body.adjustmentRequestId);
    const duplicate = await findDuplicate(requestId);
    if (duplicate) {
      return res.json({
        message: 'This return/refund was already recorded.',
        adjustmentId: duplicate.adjustment_id,
        saleId: duplicate.sale_id,
        totalRefundAmount: money(duplicate.total_refund_amount),
        duplicate: true,
      });
    }

    const saleId = Number(req.body.saleId);
    if (!Number.isInteger(saleId) || saleId <= 0) {
      return res.status(400).json({ error: 'Select a valid completed sale.' });
    }
    const reason = normalizeReason(req.body.reason);
    const refundMethod = normalizeRefundMethod(req.body.refundMethod, null);
    if (!refundMethod) return res.status(400).json({ error: 'Select a valid refund method.' });
    const refundReference = normalizeRefundReference(req.body.refundReference);
    const externalRefundConfirmed = req.body.externalRefundConfirmed === true;
    validateRefundEvidence({ refundMethod, refundReference, externalRefundConfirmed });

    const requestedServiceFeeRefund = money(req.body.serviceFeeRefundAmount);
    const requestedDeliveryFeeRefund = money(req.body.deliveryFeeRefundAmount);
    if (requestedServiceFeeRefund < 0 || requestedDeliveryFeeRefund < 0) {
      return res.status(400).json({ error: 'Refund amounts cannot be negative.' });
    }
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ error: 'Select at least one product to return.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const snapshot = await getSaleAdjustmentSnapshot(connection, saleId, { lock: true });
      if (!snapshot) throw Object.assign(new Error('Sale not found.'), { statusCode: 404 });
      if (snapshot.payment_status !== 'Paid') {
        throw Object.assign(new Error('Only completed paid sales can be returned.'), { statusCode: 409 });
      }

      if (requestedServiceFeeRefund > snapshot.remaining_service_fee + 0.001) {
        throw Object.assign(new Error('Service-fee refund exceeds the remaining refundable service fee.'), { statusCode: 409 });
      }
      if (requestedDeliveryFeeRefund > snapshot.remaining_delivery_fee + 0.001) {
        throw Object.assign(new Error('Delivery-fee refund exceeds the remaining refundable delivery fee.'), { statusCode: 409 });
      }

      const seen = new Set();
      const processedItems = [];
      for (const requestedItem of req.body.items) {
        const saleItemId = Number(requestedItem?.saleItemId);
        if (!Number.isInteger(saleItemId) || saleItemId <= 0 || seen.has(saleItemId)) {
          throw Object.assign(new Error('Return item list contains an invalid or duplicate sale item.'), { statusCode: 400 });
        }
        seen.add(saleItemId);
        const item = snapshot.items.find((entry) => entry.sale_item_id === saleItemId);
        if (!item) {
          throw Object.assign(new Error('One selected item does not belong to this sale.'), { statusCode: 400 });
        }
        const calculated = calculateReturnLine(item, requestedItem.quantity);
        processedItems.push({
          item,
          ...calculated,
          restockable: requestedItem.restockable !== false,
        });
      }

      const merchandiseRefund = money(
        processedItems.reduce((sum, item) => sum + item.refundSubtotal, 0)
      );
      const totalRefund = money(
        merchandiseRefund + requestedServiceFeeRefund + requestedDeliveryFeeRefund
      );
      if (totalRefund <= 0) {
        throw Object.assign(new Error('Calculated refund must be greater than zero.'), { statusCode: 400 });
      }

      const cashierShift = refundMethod === 'Cash'
        ? await requireOpenShiftForAdmin(connection, req.user.id, { lock: true })
        : await getOpenShiftForAdmin(connection, req.user.id, { lock: true });
      const shiftId = cashierShift ? Number(cashierShift.shift_id) : null;

      const [headerResult] = await connection.query(
        `INSERT INTO sale_adjustments (
          sale_id, adjustment_type, reason,
          merchandise_refund_amount, service_fee_refund_amount,
          delivery_fee_refund_amount, total_refund_amount,
          refund_method, refund_reference, external_refund_confirmed,
          processed_by_admin_id, shift_id, adjustment_request_id, processed_at
        ) VALUES (?, 'Return', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          saleId,
          reason,
          merchandiseRefund,
          requestedServiceFeeRefund,
          requestedDeliveryFeeRefund,
          totalRefund,
          refundMethod,
          refundReference,
          externalRefundConfirmed ? 1 : 0,
          req.user.id,
          shiftId,
          requestId,
        ]
      );
      const adjustmentId = headerResult.insertId;

      for (const processed of processedItems) {
        const [lineResult] = await connection.query(
          `INSERT INTO sale_adjustment_items (
            adjustment_id, sale_item_id, product_id, quantity,
            unit_refund_amount, refund_subtotal, unit_cost, restockable
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            adjustmentId,
            processed.item.sale_item_id,
            processed.item.product_id,
            processed.quantity,
            processed.unitRefundAmount,
            processed.refundSubtotal,
            processed.unitCost,
            processed.restockable ? 1 : 0,
          ]
        );

        if (processed.restockable) {
          await addRestockMovement(connection, {
            adminId: req.user.id,
            saleId,
            adjustmentItemId: lineResult.insertId,
            productId: processed.item.product_id,
            quantity: processed.quantity,
            unitCost: processed.unitCost,
            sellingPrice: processed.item.unit_price,
            movementReason: 'Sales Return',
            remarks: `Restocked from return RET-${String(adjustmentId).padStart(6, '0')}`,
          });
        }
      }

      await recordAuditLog(connection, {
        adminId: req.user.id,
        action: 'sale.return',
        entityType: 'sale_adjustment',
        entityId: adjustmentId,
        summary: `Recorded return/refund for ${snapshot.reference} totaling ₱${totalRefund.toFixed(2)}.`,
        before: {
          sale_id: saleId,
          sale_reference: snapshot.reference,
          remaining_merchandise_refundable: snapshot.remaining_merchandise_refundable,
          remaining_service_fee: snapshot.remaining_service_fee,
          remaining_delivery_fee: snapshot.remaining_delivery_fee,
          prior_total_refunded: snapshot.total_refunded,
        },
        after: {
          adjustment_type: 'Return',
          merchandise_refund_amount: merchandiseRefund,
          service_fee_refund_amount: requestedServiceFeeRefund,
          delivery_fee_refund_amount: requestedDeliveryFeeRefund,
          total_refund_amount: totalRefund,
          refund_method: refundMethod,
          refund_reference: refundReference,
          cashier_shift_id: shiftId,
          item_count: processedItems.length,
          returned_quantity: processedItems.reduce((sum, item) => sum + item.quantity, 0),
          restocked_quantity: processedItems.reduce((sum, item) => sum + (item.restockable ? item.quantity : 0), 0),
        },
        reason,
      });

      await connection.commit();
      return res.status(201).json({
        message: 'Return/refund recorded successfully.',
        adjustmentId,
        adjustmentReference: `RET-${String(adjustmentId).padStart(6, '0')}`,
        saleId,
        merchandiseRefundAmount: merchandiseRefund,
        serviceFeeRefundAmount: requestedServiceFeeRefund,
        deliveryFeeRefundAmount: requestedDeliveryFeeRefund,
        totalRefundAmount: totalRefund,
      });
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        const duplicate = await findDuplicate(requestId);
        if (duplicate) {
          return res.json({
            message: 'This return/refund was already recorded.',
            adjustmentId: duplicate.adjustment_id,
            saleId: duplicate.sale_id,
            totalRefundAmount: money(duplicate.total_refund_amount),
            duplicate: true,
          });
        }
      }
      console.error('Sale return/refund error:', error);
      return res.status(error.statusCode || 500).json({
        error: error.statusCode ? error.message : 'Unable to record return/refund.',
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Sale return/refund validation error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to validate return/refund.',
    });
  }
});

router.post('/voids', async (req, res) => {
  let requestId;
  try {
    requestId = normalizeRequestId(req.body.adjustmentRequestId);
    const duplicate = await findDuplicate(requestId);
    if (duplicate) {
      return res.json({
        message: 'This sale void was already recorded.',
        adjustmentId: duplicate.adjustment_id,
        saleId: duplicate.sale_id,
        totalRefundAmount: money(duplicate.total_refund_amount),
        duplicate: true,
      });
    }

    const saleId = Number(req.body.saleId);
    if (!Number.isInteger(saleId) || saleId <= 0) {
      return res.status(400).json({ error: 'Select a valid POS sale.' });
    }
    const reason = normalizeReason(req.body.reason);
    const refundMethod = normalizeRefundMethod(req.body.refundMethod, null);
    if (!refundMethod) return res.status(400).json({ error: 'Select a valid refund method.' });
    const refundReference = normalizeRefundReference(req.body.refundReference);
    const externalRefundConfirmed = req.body.externalRefundConfirmed === true;
    validateRefundEvidence({ refundMethod, refundReference, externalRefundConfirmed });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const snapshot = await getSaleAdjustmentSnapshot(connection, saleId, { lock: true });
      if (!snapshot) throw Object.assign(new Error('Sale not found.'), { statusCode: 404 });
      if (snapshot.sales_source !== 'Onsite POS') {
        throw Object.assign(
          new Error('Phase 4 full sale void is limited to Onsite POS sales. Use Return/Refund for completed online orders.'),
          { statusCode: 409 }
        );
      }
      if (snapshot.payment_status !== 'Paid') {
        throw Object.assign(new Error('Only paid POS sales can be voided.'), { statusCode: 409 });
      }
      if (!snapshot.can_void || snapshot.adjustment_count > 0) {
        throw Object.assign(new Error('This POS sale already has an adjustment and can no longer be fully voided.'), { statusCode: 409 });
      }
      if (!snapshot.items.length) {
        throw Object.assign(new Error('This POS sale has no sale items to reverse.'), { statusCode: 409 });
      }

      const merchandiseRefund = money(snapshot.remaining_merchandise_refundable);
      const serviceFeeRefund = money(snapshot.remaining_service_fee);
      const deliveryFeeRefund = money(snapshot.remaining_delivery_fee);
      const totalRefund = money(merchandiseRefund + serviceFeeRefund + deliveryFeeRefund);

      const cashierShift = refundMethod === 'Cash'
        ? await requireOpenShiftForAdmin(connection, req.user.id, { lock: true })
        : await getOpenShiftForAdmin(connection, req.user.id, { lock: true });
      const shiftId = cashierShift ? Number(cashierShift.shift_id) : null;

      const [headerResult] = await connection.query(
        `INSERT INTO sale_adjustments (
          sale_id, adjustment_type, reason,
          merchandise_refund_amount, service_fee_refund_amount,
          delivery_fee_refund_amount, total_refund_amount,
          refund_method, refund_reference, external_refund_confirmed,
          processed_by_admin_id, shift_id, adjustment_request_id, processed_at
        ) VALUES (?, 'Void', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          saleId,
          reason,
          merchandiseRefund,
          serviceFeeRefund,
          deliveryFeeRefund,
          totalRefund,
          refundMethod,
          refundReference,
          externalRefundConfirmed ? 1 : 0,
          req.user.id,
          shiftId,
          requestId,
        ]
      );
      const adjustmentId = headerResult.insertId;

      for (const item of snapshot.items) {
        if (item.remaining_quantity !== item.sold_quantity || item.remaining_quantity <= 0) {
          throw Object.assign(new Error('A full void requires every original sold quantity to remain unadjusted.'), { statusCode: 409 });
        }
        const calculated = calculateReturnLine(item, item.remaining_quantity);
        const [lineResult] = await connection.query(
          `INSERT INTO sale_adjustment_items (
            adjustment_id, sale_item_id, product_id, quantity,
            unit_refund_amount, refund_subtotal, unit_cost, restockable
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            adjustmentId,
            item.sale_item_id,
            item.product_id,
            calculated.quantity,
            calculated.unitRefundAmount,
            calculated.refundSubtotal,
            calculated.unitCost,
          ]
        );

        await addRestockMovement(connection, {
          adminId: req.user.id,
          saleId,
          adjustmentItemId: lineResult.insertId,
          productId: item.product_id,
          quantity: calculated.quantity,
          unitCost: calculated.unitCost,
          sellingPrice: item.unit_price,
          movementReason: 'Sale Void Reversal',
          remarks: `Restocked from POS void VOID-${String(adjustmentId).padStart(6, '0')}`,
        });
      }

      await recordAuditLog(connection, {
        adminId: req.user.id,
        action: 'sale.void',
        entityType: 'sale_adjustment',
        entityId: adjustmentId,
        summary: `Voided ${snapshot.reference} and recorded refund of ₱${totalRefund.toFixed(2)}.`,
        before: {
          sale_id: saleId,
          sale_reference: snapshot.reference,
          total_amount: snapshot.original_total_amount,
          item_quantity: snapshot.items.reduce((sum, item) => sum + item.sold_quantity, 0),
        },
        after: {
          adjustment_type: 'Void',
          merchandise_refund_amount: merchandiseRefund,
          service_fee_refund_amount: serviceFeeRefund,
          delivery_fee_refund_amount: deliveryFeeRefund,
          total_refund_amount: totalRefund,
          refund_method: refundMethod,
          refund_reference: refundReference,
          cashier_shift_id: shiftId,
          restocked_quantity: snapshot.items.reduce((sum, item) => sum + item.sold_quantity, 0),
        },
        reason,
      });

      await connection.commit();
      return res.status(201).json({
        message: 'POS sale void recorded successfully.',
        adjustmentId,
        adjustmentReference: `VOID-${String(adjustmentId).padStart(6, '0')}`,
        saleId,
        totalRefundAmount: totalRefund,
      });
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        const duplicate = await findDuplicate(requestId);
        if (duplicate) {
          return res.json({
            message: 'This sale void was already recorded.',
            adjustmentId: duplicate.adjustment_id,
            saleId: duplicate.sale_id,
            totalRefundAmount: money(duplicate.total_refund_amount),
            duplicate: true,
          });
        }
      }
      console.error('POS void error:', error);
      return res.status(error.statusCode || 500).json({
        error: error.statusCode ? error.message : 'Unable to void POS sale.',
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('POS void validation error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to validate POS void.',
    });
  }
});

export default router;
