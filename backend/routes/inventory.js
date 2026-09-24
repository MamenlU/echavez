import express from 'express';
import { randomInt } from 'node:crypto';
import fs from 'fs';
import path from 'path';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const RECEIPTS_DIR = path.join(process.cwd(), 'uploads', 'receipts');

router.use(authenticateToken, requireAdmin);

function processReceipt(receiptImage) {
  if (!receiptImage) return null;
  const value = String(receiptImage);
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  if (!match) {
    throw Object.assign(new Error('Receipt must be a JPG, PNG, or WEBP image.'), { statusCode: 400 });
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw Object.assign(new Error('Receipt image must not exceed 5 MB.'), { statusCode: 400 });
  }

  if (process.env.NODE_ENV === 'production') return value;
  if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const fileName = `receipt_${Date.now()}_${randomInt(1000, 10000)}.${extension}`;
  fs.writeFileSync(path.join(RECEIPTS_DIR, fileName), buffer);
  return `/api/uploads/receipts/${fileName}`;
}

router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Inventory module is ready.', admin_id: req.user.id });
});

router.get('/movements', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        im.movement_id,
        im.product_id,
        p.name AS product_name,
        p.barcode,
        p.category,
        im.admin_id,
        CONCAT_WS(' ', u.first_name, u.last_name) AS recorded_by,
        im.supplier_id,
        sup.supplier_name,
        im.sale_id,
        s.order_id,
        im.movement_type,
        im.quantity,
        im.supplier_price,
        im.selling_price,
        im.movement_date,
        im.remarks,
        im.receipt_path,
        CASE
          WHEN im.movement_type = 'Stock-In' AND im.remarks = 'Opening Inventory' THEN 'Opening Inventory'
          WHEN im.movement_type = 'Stock-In' THEN 'Stock Receiving'
          WHEN s.order_id IS NOT NULL THEN
            CASE o.fulfillment
              WHEN 'shop_go' THEN 'Shop & Go'
              WHEN 'delivery' THEN 'Delivery'
              ELSE 'Pickup'
            END
          WHEN s.fulfillment = 'delivery' THEN 'Delivery'
          ELSE 'POS'
        END AS source_label,
        CASE
          WHEN s.order_id IS NOT NULL THEN s.order_id
          WHEN im.sale_id IS NOT NULL THEN CONCAT('POS-', LPAD(im.sale_id, 6, '0'))
          WHEN im.remarks = 'Opening Inventory' THEN CONCAT('OPEN-', LPAD(im.movement_id, 6, '0'))
          ELSE CONCAT('RCV-', LPAD(im.movement_id, 6, '0'))
        END AS reference_label
      FROM inventory_movements im
      INNER JOIN products p ON p.id = im.product_id
      LEFT JOIN suppliers sup ON sup.supplier_id = im.supplier_id
      LEFT JOIN users u ON u.id = im.admin_id
      LEFT JOIN sales s ON s.sale_id = im.sale_id
      LEFT JOIN orders o ON o.id = s.order_id
      ORDER BY im.movement_date DESC, im.movement_id DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Inventory movement history error:', error);
    res.status(500).json({ error: 'Unable to load inventory movement history.' });
  }
});

// Retained for backward compatibility. New products now create opening inventory atomically.
router.post('/opening', async (req, res) => {
  const { product_id, supplier_id, supplier_price } = req.body;
  const supplierPrice = Number(supplier_price);
  if (!product_id) return res.status(400).json({ error: 'Product is required.' });
  if (!Number.isFinite(supplierPrice) || supplierPrice <= 0) {
    return res.status(400).json({ error: 'Supplier price must be greater than zero.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.query(
      'SELECT id, name, stock, price FROM products WHERE id = ? FOR UPDATE',
      [product_id]
    );
    if (!products.length) throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
    if (Number(products[0].stock) <= 0) {
      throw Object.assign(new Error('Opening inventory requires stock greater than zero.'), { statusCode: 400 });
    }
    const [existing] = await connection.query(
      'SELECT movement_id FROM inventory_movements WHERE product_id = ? LIMIT 1',
      [product_id]
    );
    if (existing.length) {
      throw Object.assign(new Error('This product already has inventory history.'), { statusCode: 409 });
    }

    await connection.query(
      `INSERT INTO inventory_movements (
        product_id, admin_id, supplier_id, sale_id, movement_type,
        quantity, supplier_price, selling_price, movement_date, remarks
      ) VALUES (?, ?, ?, NULL, 'Stock-In', ?, ?, ?, NOW(), 'Opening Inventory')`,
      [product_id, req.user.id, supplier_id || null, products[0].stock,
        Number(supplierPrice.toFixed(2)), products[0].price]
    );
    await connection.commit();
    res.status(201).json({ message: 'Opening inventory recorded successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Opening inventory error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to record opening inventory.',
    });
  } finally {
    connection.release();
  }
});

router.post('/receive', async (req, res) => {
  const {
    product_id, supplier_id, quantity, supplier_price, selling_price,
    remarks, receipt_image, receivingRequestId,
  } = req.body;
  const receivedQuantity = Number(quantity);
  const supplierPrice = Number(supplier_price);
  const requestId = String(receivingRequestId || '').trim();

  if (!product_id) return res.status(400).json({ error: 'Product is required.' });
  if (!supplier_id) return res.status(400).json({ error: 'Supplier is required.' });
  if (!Number.isInteger(receivedQuantity) || receivedQuantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be a whole number greater than zero.' });
  }
  if (!Number.isFinite(supplierPrice) || supplierPrice <= 0) {
    return res.status(400).json({ error: 'Supplier cost must be greater than zero.' });
  }
  if (!requestId || requestId.length > 64) {
    return res.status(400).json({ error: 'Invalid or missing receiving request ID.' });
  }
  if (!receipt_image) return res.status(400).json({ error: 'Receipt attachment is required.' });

  const [duplicates] = await pool.query(
    'SELECT movement_id FROM inventory_movements WHERE receiving_request_id = ? LIMIT 1',
    [requestId]
  );
  if (duplicates.length) {
    return res.json({
      message: 'This stock receipt was already recorded.',
      movement_id: duplicates[0].movement_id,
      duplicate: true,
    });
  }

  const connection = await pool.getConnection();
  try {
    const receiptPath = processReceipt(receipt_image);
    await connection.beginTransaction();

    const [productRows] = await connection.query(
      'SELECT id, name, stock, price FROM products WHERE id = ? FOR UPDATE',
      [product_id]
    );
    if (!productRows.length) throw Object.assign(new Error('Product not found.'), { statusCode: 404 });

    const [supplierRows] = await connection.query(
      `SELECT supplier_id, supplier_name FROM suppliers
       WHERE supplier_id = ? AND status = 'Active' LIMIT 1`,
      [supplier_id]
    );
    if (!supplierRows.length) {
      throw Object.assign(new Error('Select an active supplier.'), { statusCode: 400 });
    }

    const product = productRows[0];
    let selectedSellingPrice = Number(product.price);
    if (selling_price !== undefined && selling_price !== null && String(selling_price).trim() !== '') {
      selectedSellingPrice = Number(selling_price);
      if (!Number.isFinite(selectedSellingPrice) || selectedSellingPrice <= 0) {
        throw Object.assign(new Error('Selling price must be greater than zero.'), { statusCode: 400 });
      }
    }

    const [costRows] = await connection.query(
      `SELECT COUNT(*) AS movement_count,
        COALESCE(SUM(CASE
          WHEN movement_type = 'Stock-In' THEN quantity * supplier_price
          WHEN movement_type = 'Stock-Out' THEN -(quantity * supplier_price)
          ELSE 0 END), 0) AS inventory_value
       FROM inventory_movements WHERE product_id = ?`,
      [product.id]
    );
    if (Number(product.stock) > 0 && Number(costRows[0].movement_count) === 0) {
      throw Object.assign(
        new Error('Opening inventory must be recorded before receiving additional stock.'),
        { statusCode: 409 }
      );
    }

    const newStock = Number(product.stock) + receivedQuantity;
    const newValue = Number(costRows[0].inventory_value) + (receivedQuantity * supplierPrice);
    const averageCost = newStock > 0 ? Number((newValue / newStock).toFixed(2)) : 0;
    const [movementResult] = await connection.query(
      `INSERT INTO inventory_movements (
        product_id, admin_id, supplier_id, sale_id, movement_type, quantity,
        supplier_price, selling_price, movement_date, remarks, receipt_path,
        receiving_request_id
      ) VALUES (?, ?, ?, NULL, 'Stock-In', ?, ?, ?, NOW(), ?, ?, ?)`,
      [product.id, req.user.id, supplierRows[0].supplier_id, receivedQuantity,
        Number(supplierPrice.toFixed(2)), Number(selectedSellingPrice.toFixed(2)),
        String(remarks || 'Stock Receiving').trim(), receiptPath, requestId]
    );

    await connection.query(
      'UPDATE products SET stock = ?, price = ?, supplier_id = ? WHERE id = ?',
      [newStock, selectedSellingPrice, supplierRows[0].supplier_id, product.id]
    );
    await connection.commit();

    res.status(201).json({
      message: 'Stock received successfully.',
      movement_id: movementResult.insertId,
      inventory: { previous_stock: Number(product.stock), received_quantity: receivedQuantity,
        new_stock: newStock, supplier_price: supplierPrice,
        selling_price: selectedSellingPrice, weighted_average_cost: averageCost },
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const [existing] = await pool.query(
        'SELECT movement_id FROM inventory_movements WHERE receiving_request_id = ? LIMIT 1',
        [requestId]
      );
      if (existing.length) {
        return res.json({ message: 'This stock receipt was already recorded.',
          movement_id: existing[0].movement_id, duplicate: true });
      }
    }
    console.error('Stock receiving error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to receive stock.',
    });
  } finally {
    connection.release();
  }
});

export default router;
