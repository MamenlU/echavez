import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin, requirePosStaff } from '../middleware/auth.js';
import { recordAuditLog } from '../lib/auditService.js';
import {
  normalizeDeliveryMunicipality,
  normalizeDeliveryBarangay,
} from '../lib/deliveryAreas.js';
import { getSalesFinancialHistory } from '../lib/financialMetrics.js';
import { requireOpenShiftForAdmin } from '../lib/cashierShiftService.js';
import { getPosReceipt, matchesPosReceipt } from '../lib/posReceiptService.js';

const router = express.Router();

router.use(authenticateToken, requirePosStaff);

function cleanPosDetails(body) {
  const fulfillment = body.fulfillment === 'delivery' ? 'delivery' : 'pickup';
  const deliveryFee = fulfillment === 'delivery' ? Number(body.deliveryFee) : 0;
  const details = {
    fulfillment,
    deliveryFee,
    customerName: String(body.customerName || '').trim(),
    contactPerson: String(body.deliveryContactPerson || '').trim(),
    contactNumber: String(body.deliveryContactNumber || '').trim(),
    municipality: String(body.deliveryMunicipality || '').trim(),
    barangay: String(body.deliveryBarangay || '').trim(),
    address: String(body.deliveryAddress || '').trim(),
    landmark: String(body.deliveryLandmark || '').trim() || null,
  };

  if (fulfillment === 'delivery') {
    if (!details.customerName || !details.contactPerson || !details.contactNumber
      || !details.municipality || !details.barangay || !details.address) {
      throw Object.assign(
        new Error('Customer name, contact person, contact number, municipality, barangay, and address are required.'),
        { statusCode: 400 }
      );
    }

    const municipality = normalizeDeliveryMunicipality(details.municipality);
    const barangay = normalizeDeliveryBarangay(municipality, details.barangay);

    if (!municipality || !barangay) {
      throw Object.assign(
        new Error('Select a valid supported municipality and barangay for Deliver Out.'),
        { statusCode: 400 }
      );
    }

    details.municipality = municipality;
    details.barangay = barangay;
    if (!/^\+?\d{7,15}$/.test(details.contactNumber.replace(/[\s\-()]/g, ''))) {
      throw Object.assign(new Error('Enter a valid delivery contact number.'), { statusCode: 400 });
    }
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0 || deliveryFee > 10000) {
      throw Object.assign(new Error('Delivery fee must be from ₱0.00 to ₱10,000.00.'), { statusCode: 400 });
    }
  }

  return details;
}

router.post('/pos', async (req, res) => {
  const { items, posRequestId, paymentMethod, cashReceived, cardPaymentConfirmed } = req.body;
  const cardPaymentReference = String(req.body.cardPaymentReference || '').trim();

  try {
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'The POS sale must contain at least one product.' });
    }
    if (typeof posRequestId !== 'string' || !posRequestId.trim() || posRequestId.length > 64) {
      return res.status(400).json({ error: 'Invalid or missing POS request ID.' });
    }

    const normalizedPayment = String(paymentMethod || '').trim().toLowerCase();
    if (!['cash', 'card'].includes(normalizedPayment)) {
      return res.status(400).json({ error: 'POS payment method must be Cash or Card.' });
    }
    if (normalizedPayment === 'card' && !/^[a-zA-Z0-9][a-zA-Z0-9 ._:/#-]{2,79}$/.test(cardPaymentReference)) {
      return res.status(400).json({ error: 'Enter the external card terminal payment reference (3–80 allowed characters).' });
    }
    if (normalizedPayment === 'card' && cardPaymentConfirmed !== true) {
      return res.status(400).json({ error: 'Confirm the external card payment before checkout.' });
    }

    let normalizedCash = null;
    if (normalizedPayment === 'cash') {
      normalizedCash = Number(cashReceived);
      if (cashReceived === '' || !Number.isFinite(normalizedCash) || normalizedCash < 0) {
        return res.status(400).json({ error: 'Cash received must be a valid amount.' });
      }
      normalizedCash = Number(normalizedCash.toFixed(2));
    }

    const pos = cleanPosDetails(req.body);

    const [existing] = await pool.query(
      'SELECT sale_id, total_amount, admin_id FROM sales WHERE pos_request_id = ? LIMIT 1',
      [posRequestId]
    );
    if (existing.length) {
      if (Number(existing[0].admin_id) !== req.user.id) {
        return res.status(409).json({ error: 'POS request ID already used.' });
      }
      const receipt = await getPosReceipt(pool, existing[0].sale_id);
      if (!matchesPosReceipt(receipt, { items, paymentMethod: normalizedPayment, cashReceived: normalizedCash, cardPaymentReference, pos })) {
        return res.status(409).json({ error: 'This POS request ID belongs to a different completed sale. Start a new sale to continue.' });
      }
      return res.json({ message: 'POS sale already completed.', saleId: existing[0].sale_id,
        totalAmount: Number(existing[0].total_amount), duplicate: true, receipt });
    }

    if (pos.fulfillment === 'delivery') {
      const [rateRows] = await pool.query(
        `SELECT id
         FROM delivery_rates
         WHERE municipality = ?
           AND barangay = ?
           AND is_active = 1
         LIMIT 1`,
        [pos.municipality, pos.barangay]
      );

      if (!rateRows.length) {
        return res.status(400).json({
          error: 'Deliver Out is not active for the selected municipality and barangay.'
        });
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const cashierShift = await requireOpenShiftForAdmin(connection, req.user.id, { lock: true });
      const processedItems = [];
      let productSubtotal = 0;

      for (const item of items) {
        const productId = item?.product?.id;
        const quantity = Number(item?.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
          throw Object.assign(new Error('Invalid POS product or quantity.'), { code: 'INVALID_POS_ITEM' });
        }

        const [products] = await connection.query(
          'SELECT id, name, price, stock, status, fulfillment_rule FROM products WHERE id = ? FOR UPDATE',
          [productId]
        );
        if (!products.length) {
          throw Object.assign(new Error(`Product ID ${productId} was not found.`), { code: 'PRODUCT_NOT_FOUND' });
        }

        const product = products[0];
        if (String(product.status || 'active').toLowerCase() !== 'active') {
          throw Object.assign(
            new Error(`${product.name} is inactive and cannot be sold through POS.`),
            { code: 'PRODUCT_INACTIVE' }
          );
        }

        // The POS backend independently enforces the same product rule.
        if (
          product.fulfillment_rule === 'delivery_only' &&
          pos.fulfillment !== 'delivery'
        ) {
          throw Object.assign(
            new Error(`${product.name} is Delivery-only. Use Deliver Out for this POS cart.`),
            { code: 'DELIVERY_ONLY_PRODUCT' }
          );
        }

        const currentStock = Number(product.stock);
        if (currentStock < quantity) {
          throw Object.assign(
            new Error(`Insufficient stock for ${product.name}. Available: ${currentStock}, required: ${quantity}.`),
            { code: 'INSUFFICIENT_STOCK' }
          );
        }

        const [costRows] = await connection.query(
          `SELECT COUNT(*) AS movement_count,
            COALESCE(SUM(CASE
              WHEN movement_type = 'Stock-In' THEN quantity * supplier_price
              WHEN movement_type = 'Stock-Out' THEN -(quantity * supplier_price)
              ELSE 0 END), 0) AS inventory_value
           FROM inventory_movements WHERE product_id = ?`,
          [productId]
        );
        if (currentStock > 0 && Number(costRows[0].movement_count) === 0) {
          throw Object.assign(
            new Error(`Opening inventory must be recorded for ${product.name} before completing this POS sale.`),
            { code: 'INVENTORY_HISTORY_REQUIRED' }
          );
        }

        const sellingPrice = Number(product.price);
        const averageCost = Number((Number(costRows[0].inventory_value) / currentStock).toFixed(2));
        const subtotal = Number((sellingPrice * quantity).toFixed(2));
        productSubtotal += subtotal;
        processedItems.push({ productId, productName: product.name, quantity,
          sellingPrice, averageCost, subtotal });
      }

      productSubtotal = Number(productSubtotal.toFixed(2));
      const totalAmount = Number((productSubtotal + pos.deliveryFee).toFixed(2));
      let changeAmount = null;
      if (normalizedPayment === 'cash') {
        if (normalizedCash < totalAmount) {
          throw Object.assign(
            new Error(`Cash received is insufficient. Total bill: ₱${totalAmount.toFixed(2)}.`),
            { code: 'INSUFFICIENT_CASH' }
          );
        }
        changeAmount = Number((normalizedCash - totalAmount).toFixed(2));
      }

      const storedPayment = normalizedPayment === 'cash' ? 'Cash' : 'Card';
      const [saleResult] = await connection.query(
        `INSERT INTO sales (
          order_id, pos_request_id, admin_id, shift_id, sales_source, fulfillment,
          total_amount, delivery_fee, customer_name, delivery_contact_person,
          delivery_contact_number, delivery_municipality, delivery_barangay, delivery_address,
          delivery_landmark, payment_status, payment_method, cash_received,
          change_amount, card_payment_reference, sale_date
        ) VALUES (NULL, ?, ?, ?, 'Onsite POS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid', ?, ?, ?, ?, NOW())`,
        [posRequestId, req.user.id, cashierShift.shift_id, pos.fulfillment, totalAmount, pos.deliveryFee,
          pos.customerName || null, pos.contactPerson || null, pos.contactNumber || null,
          pos.municipality || null, pos.barangay || null, pos.address || null, pos.landmark, storedPayment,
          normalizedPayment === 'cash' ? normalizedCash : null, changeAmount,
          normalizedPayment === 'card' ? cardPaymentReference : null]
      );

      for (const item of processedItems) {
        await connection.query(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [saleResult.insertId, item.productId, item.quantity, item.sellingPrice, item.subtotal]
        );
        const [stockResult] = await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [item.quantity, item.productId, item.quantity]
        );
        if (stockResult.affectedRows !== 1) {
          throw Object.assign(new Error(`Unable to deduct stock for ${item.productName}.`), {
            code: 'INSUFFICIENT_STOCK',
          });
        }
        await connection.query(
          `INSERT INTO inventory_movements (
            product_id, admin_id, supplier_id, sale_id, movement_type,
            quantity, supplier_price, selling_price, movement_date, remarks
          ) VALUES (?, ?, NULL, ?, 'Stock-Out', ?, ?, ?, NOW(), ?)`,
          [item.productId, req.user.id, saleResult.insertId, item.quantity,
            item.averageCost, item.sellingPrice,
            pos.fulfillment === 'delivery' ? 'POS Deliver Out Sale' : 'Onsite POS Sale']
        );
      }

      await recordAuditLog(connection, {
        adminId: req.user.id, actorRole: req.user.role, action: 'sale.pos.complete', entityType: 'sale',
        entityId: saleResult.insertId,
        summary: `Completed POS sale #${saleResult.insertId} for ₱${totalAmount.toFixed(2)}.`,
        after: { shift_id: Number(cashierShift.shift_id),
          staff_role: req.user.role, fulfillment: pos.fulfillment,
          customer_name: pos.customerName || null, item_count: processedItems.length,
          total_amount: totalAmount, payment_method: storedPayment,
          card_reference_recorded: normalizedPayment === 'card' },
      });
      await connection.commit();
      // Once committed, receipt lookup failure must not misreport a saved sale as failed.
      let receipt = null;
      try { receipt = await getPosReceipt(pool, saleResult.insertId); }
      catch (receiptError) { console.error('POS saved; receipt lookup deferred:', receiptError); }
      return res.status(201).json({
        message: 'POS sale completed successfully.', saleId: saleResult.insertId,
        productSubtotal, deliveryFee: pos.deliveryFee, totalAmount,
        paymentMethod: storedPayment,
        cashReceived: normalizedPayment === 'cash' ? normalizedCash : null,
        changeAmount,
        shiftId: Number(cashierShift.shift_id), receipt,
      });
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        const [duplicate] = await pool.query(
          'SELECT sale_id, total_amount, admin_id FROM sales WHERE pos_request_id = ? LIMIT 1',
          [posRequestId]
        );
        if (duplicate.length) {
          if (Number(duplicate[0].admin_id) !== req.user.id) {
            return res.status(409).json({ error: 'POS request ID already used.' });
          }
          const receipt = await getPosReceipt(pool, duplicate[0].sale_id);
          if (!matchesPosReceipt(receipt, { items, paymentMethod: normalizedPayment, cashReceived: normalizedCash, cardPaymentReference, pos })) {
            return res.status(409).json({ error: 'This POS request ID belongs to a different completed sale.' });
          }
          return res.json({ message: 'POS sale already completed.', saleId: duplicate[0].sale_id,
            totalAmount: Number(duplicate[0].total_amount), duplicate: true, receipt });
        }
      }
      console.error('POS sale error:', error);
      const clientCodes = ['INSUFFICIENT_CASH', 'INVALID_POS_ITEM', 'PRODUCT_NOT_FOUND', 'DELIVERY_ONLY_PRODUCT'];
      const conflictCodes = ['INSUFFICIENT_STOCK', 'INVENTORY_HISTORY_REQUIRED', 'PRODUCT_INACTIVE', 'CASHIER_SHIFT_REQUIRED'];
      if (clientCodes.includes(error.code)) return res.status(400).json({ error: error.message });
      if (conflictCodes.includes(error.code)) return res.status(409).json({ error: error.message });
      return res.status(500).json({ error: 'Unable to complete POS sale.' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('POS validation error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to validate POS checkout.',
    });
  }
});

// Persisted receipt reprint. Cashier is limited to own transactions; managers may review all.
router.get('/pos/:saleId/receipt', async (req, res) => {
  const saleId = Number(req.params.saleId);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) return res.status(400).json({ error: 'Invalid POS Sale ID.' });
  try {
    const receipt = await getPosReceipt(pool, saleId);
    if (!receipt) return res.status(404).json({ error: 'POS sale not found.' });
    if (req.user.role === 'cashier' && receipt.operatorId !== req.user.id) {
      return res.status(403).json({ error: 'Cashiers may only view their own POS receipts.' });
    }
    return res.json({ receipt });
  } catch (error) {
    console.error('POS receipt retrieval error:', error);
    return res.status(500).json({ error: 'Unable to retrieve recorded POS receipt.' });
  }
});

// Cashiers can see only their own POS sales; no global financial reporting access.
router.get('/my-pos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.sale_id, s.total_amount, s.sale_date, s.payment_method, s.customer_name,
              s.fulfillment, s.shift_id, s.payment_status, s.card_payment_reference, s.cash_received, s.change_amount,
              CONCAT_WS(' ', u.first_name, u.last_name) AS operator_name,
              u.username AS operator_username, u.role AS operator_role,
              COALESCE(a.adjustment_count, 0) AS adjustment_count,
              COALESCE(a.void_count, 0) AS void_count
       FROM sales s
       INNER JOIN users u ON u.id = s.admin_id
       LEFT JOIN (
         SELECT sale_id, COUNT(*) AS adjustment_count,
                SUM(CASE WHEN adjustment_type = 'Void' THEN 1 ELSE 0 END) AS void_count
         FROM sale_adjustments GROUP BY sale_id
       ) a ON a.sale_id = s.sale_id
       WHERE s.admin_id = ? AND s.sales_source = 'Onsite POS'
       ORDER BY s.sale_id DESC LIMIT 100`,
      [req.user.id]
    );
    return res.json({ sales: rows.map(row => ({
      ...row, reference: `POS-${String(row.sale_id).padStart(6, '0')}`,
      sales_source: 'Onsite POS', source_label: 'POS',
      adjustment_state: Number(row.void_count) > 0 ? 'Voided'
        : Number(row.adjustment_count) > 0 ? 'Adjusted' : 'Completed',
      total_revenue: Number(row.total_amount),
    })) });
  } catch (error) {
    console.error('Cashier POS history error:', error);
    return res.status(500).json({ error: 'Unable to load personal POS history.' });
  }
});

// Optional display-name lookup. Does NOT expose full customer records.
router.get('/customer-lookup', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ customers: [] });
  try {
    const escaped = q.replace(/[\\%_]/g, '\\$&');
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name FROM users
       WHERE role = 'customer' AND status = 'active'
         AND (first_name LIKE ? OR last_name LIKE ? OR username LIKE ?)
       ORDER BY first_name, last_name LIMIT 15`,
      [`%${escaped}%`, `%${escaped}%`, `%${escaped}%`]
    );
    return res.json({ customers: rows.map(u => ({
      id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
    })) });
  } catch (error) {
    console.error('POS customer lookup error:', error);
    return res.status(500).json({ error: 'Customer lookup unavailable.' });
  }
});

router.get('/history', requireAdmin, async (_req, res) => {
  try {
    res.json(await getSalesFinancialHistory(pool));
  } catch (error) {
    console.error('Sales history report error:', error);
    res.status(500).json({ error: 'Unable to load sales history report.' });
  }
});

export default router;
