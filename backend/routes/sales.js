import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const INitao_BARANGAYS = [
  'Aluna', 'Andales', 'Apas', 'Calacapan', 'Gimangpang', 'Jampason',
  'Kamelon', 'Kanitoan', 'Oguis', 'Pagahan', 'Poblacion', 'Pontacon',
  'San Pedro', 'Sinalac', 'Tawantawan', 'Tubigan',
];

router.use(authenticateToken, requireAdmin);

function cleanPosDetails(body) {
  const fulfillment = body.fulfillment === 'delivery' ? 'delivery' : 'pickup';
  const deliveryFee = fulfillment === 'delivery' ? Number(body.deliveryFee) : 0;
  const details = {
    fulfillment,
    deliveryFee,
    customerName: String(body.customerName || '').trim(),
    contactPerson: String(body.deliveryContactPerson || '').trim(),
    contactNumber: String(body.deliveryContactNumber || '').trim(),
    barangay: String(body.deliveryBarangay || '').trim(),
    address: String(body.deliveryAddress || '').trim(),
    landmark: String(body.deliveryLandmark || '').trim() || null,
  };

  if (fulfillment === 'delivery') {
    if (!details.customerName || !details.contactPerson || !details.contactNumber
      || !details.barangay || !details.address) {
      throw Object.assign(
        new Error('Customer name, contact person, contact number, barangay, and address are required.'),
        { statusCode: 400 }
      );
    }
    const match = INitao_BARANGAYS.find(
      (barangay) => barangay.toLowerCase() === details.barangay.toLowerCase()
    );
    if (!match) {
      throw Object.assign(
        new Error('Deliver Out is available only within Initao, Misamis Oriental.'),
        { statusCode: 400 }
      );
    }
    details.barangay = match;
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
      'SELECT sale_id, total_amount FROM sales WHERE pos_request_id = ? LIMIT 1',
      [posRequestId]
    );
    if (existing.length) {
      return res.json({ message: 'POS sale already completed.', saleId: existing[0].sale_id,
        totalAmount: Number(existing[0].total_amount), duplicate: true });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const processedItems = [];
      let productSubtotal = 0;

      for (const item of items) {
        const productId = item?.product?.id;
        const quantity = Number(item?.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
          throw Object.assign(new Error('Invalid POS product or quantity.'), { code: 'INVALID_POS_ITEM' });
        }

        const [products] = await connection.query(
          'SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE',
          [productId]
        );
        if (!products.length) {
          throw Object.assign(new Error(`Product ID ${productId} was not found.`), { code: 'PRODUCT_NOT_FOUND' });
        }

        const product = products[0];
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
          order_id, pos_request_id, admin_id, sales_source, fulfillment,
          total_amount, delivery_fee, customer_name, delivery_contact_person,
          delivery_contact_number, delivery_barangay, delivery_address,
          delivery_landmark, payment_status, payment_method, cash_received,
          change_amount, sale_date
        ) VALUES (NULL, ?, ?, 'Onsite POS', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid', ?, ?, ?, NOW())`,
        [posRequestId, req.user.id, pos.fulfillment, totalAmount, pos.deliveryFee,
          pos.customerName || null, pos.contactPerson || null, pos.contactNumber || null,
          pos.barangay || null, pos.address || null, pos.landmark, storedPayment,
          normalizedPayment === 'cash' ? normalizedCash : null, changeAmount]
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

      await connection.commit();
      return res.status(201).json({
        message: 'POS sale completed successfully.', saleId: saleResult.insertId,
        productSubtotal, deliveryFee: pos.deliveryFee, totalAmount,
        paymentMethod: storedPayment,
        cashReceived: normalizedPayment === 'cash' ? normalizedCash : null,
        changeAmount,
      });
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        const [duplicate] = await pool.query(
          'SELECT sale_id, total_amount FROM sales WHERE pos_request_id = ? LIMIT 1',
          [posRequestId]
        );
        if (duplicate.length) {
          return res.json({ message: 'POS sale already completed.', saleId: duplicate[0].sale_id,
            totalAmount: Number(duplicate[0].total_amount), duplicate: true });
        }
      }
      console.error('POS sale error:', error);
      const clientCodes = ['INSUFFICIENT_CASH', 'INVALID_POS_ITEM', 'PRODUCT_NOT_FOUND'];
      const conflictCodes = ['INSUFFICIENT_STOCK', 'INVENTORY_HISTORY_REQUIRED'];
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

router.get('/history', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        s.sale_id,
        s.order_id,
        s.admin_id,
        s.sales_source,
        s.total_amount AS revenue,
        s.payment_status,
        COALESCE(s.payment_method, o.payment_method, 'Cash') AS payment_method,
        s.cash_received,
        s.change_amount,
        s.sale_date,
        COALESCE(items.item_count, 0) AS item_count,
COALESCE(items.total_quantity, 0) AS total_quantity,
COALESCE(items.items_summary, '—') AS items_summary,
COALESCE(costs.cogs, 0) AS cogs,
        ROUND(s.total_amount - COALESCE(costs.cogs, 0), 2) AS gross_profit,
        COALESCE(s.order_id, CONCAT('POS-', LPAD(s.sale_id, 6, '0'))) AS reference,
        CASE
          WHEN s.order_id IS NOT NULL THEN
            CASE o.fulfillment
              WHEN 'shop_go' THEN 'Shop & Go'
              WHEN 'delivery' THEN 'Delivery'
              ELSE 'Pickup'
            END
          WHEN s.fulfillment = 'delivery' THEN 'Delivery'
          ELSE 'POS'
        END AS source_label
      FROM sales s
      LEFT JOIN orders o ON o.id = s.order_id
      LEFT JOIN (
  SELECT
    si.sale_id,
    COUNT(*) AS item_count,
    SUM(si.quantity) AS total_quantity,
    GROUP_CONCAT(
      CONCAT(
        COALESCE(
          p.name,
          CONCAT('Product #', si.product_id)
        ),
        ' × ',
        si.quantity
      )
      SEPARATOR ', '
    ) AS items_summary
  FROM sale_items si
  LEFT JOIN products p
    ON p.id = si.product_id
  GROUP BY si.sale_id
) items ON items.sale_id = s.sale_id
      LEFT JOIN (
        SELECT sale_id, ROUND(SUM(quantity * supplier_price), 2) AS cogs
        FROM inventory_movements
        WHERE movement_type = 'Stock-Out' AND sale_id IS NOT NULL
        GROUP BY sale_id
      ) costs ON costs.sale_id = s.sale_id
      WHERE s.payment_status = 'Paid'
      ORDER BY s.sale_date DESC, s.sale_id DESC`
    );

    const summary = rows.reduce((totals, sale) => ({
      total_sales: totals.total_sales + 1,
      total_revenue: totals.total_revenue + Number(sale.revenue),
      total_cogs: totals.total_cogs + Number(sale.cogs),
      total_gross_profit: totals.total_gross_profit + Number(sale.gross_profit),
    }), { total_sales: 0, total_revenue: 0, total_cogs: 0, total_gross_profit: 0 });

    summary.total_revenue = Number(summary.total_revenue.toFixed(2));
    summary.total_cogs = Number(summary.total_cogs.toFixed(2));
    summary.total_gross_profit = Number(summary.total_gross_profit.toFixed(2));
    res.json({ summary, sales: rows });
  } catch (error) {
    console.error('Sales history report error:', error);
    res.status(500).json({ error: 'Unable to load sales history report.' });
  }
});

export default router;
