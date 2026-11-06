import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { normalizeSupplierReference } from '../lib/stockAudit.js';
import { recordAuditLog } from '../lib/auditService.js';
import { syncPurchaseOrderStatus } from '../lib/purchaseOrderService.js';
import {
  createSignedImageUrl,
  safelyDeleteStoredImage,
  storeReceiptImage,
} from '../lib/imageStorage.js';

const router = express.Router();

router.use(authenticateToken, requireAdmin);

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
        im.movement_reason,
        im.quantity,
        im.supplier_price,
        im.selling_price,
        im.movement_date,
        im.remarks,
        im.receipt_path,
        im.supplier_reference,
        im.adjustment_request_id,
        im.sale_adjustment_item_id,
        im.purchase_order_item_id,
        po.po_number AS purchase_order_number,
        CASE
          WHEN im.adjustment_request_id IS NOT NULL THEN 'Stock Adjustment'
          WHEN im.sale_adjustment_item_id IS NOT NULL AND sa.adjustment_type = 'Void' THEN 'Sale Void Reversal'
          WHEN im.sale_adjustment_item_id IS NOT NULL THEN 'Sales Return'
          WHEN im.purchase_order_item_id IS NOT NULL THEN 'Purchase Order Receiving'
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
          WHEN im.adjustment_request_id IS NOT NULL THEN CONCAT('ADJ-', LPAD(im.movement_id::text, 6, '0'))
          WHEN im.sale_adjustment_item_id IS NOT NULL AND sa.adjustment_type = 'Void' THEN CONCAT('VOID-', LPAD(sa.adjustment_id::text, 6, '0'))
          WHEN im.sale_adjustment_item_id IS NOT NULL THEN CONCAT('RET-', LPAD(sa.adjustment_id::text, 6, '0'))
          WHEN im.purchase_order_item_id IS NOT NULL THEN po.po_number
          WHEN s.order_id IS NOT NULL THEN s.order_id
          WHEN im.sale_id IS NOT NULL THEN CONCAT('POS-', LPAD(im.sale_id::text, 6, '0'))
          WHEN im.remarks = 'Opening Inventory' THEN CONCAT('OPEN-', LPAD(im.movement_id::text, 6, '0'))
          ELSE CONCAT('RCV-', LPAD(im.movement_id::text, 6, '0'))
        END AS reference_label
      FROM inventory_movements im
      INNER JOIN products p ON p.id = im.product_id
      LEFT JOIN suppliers sup ON sup.supplier_id = im.supplier_id
      LEFT JOIN users u ON u.id = im.admin_id
      LEFT JOIN sales s ON s.sale_id = im.sale_id
      LEFT JOIN orders o ON o.id = s.order_id
      LEFT JOIN sale_adjustment_items sai ON sai.adjustment_item_id = im.sale_adjustment_item_id
      LEFT JOIN sale_adjustments sa ON sa.adjustment_id = sai.adjustment_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_item_id = im.purchase_order_item_id
      LEFT JOIN purchase_orders po ON po.purchase_order_id = poi.purchase_order_id
      ORDER BY im.movement_date DESC, im.movement_id DESC`
    );

    const rowsWithSignedReceipts = await Promise.all(rows.map(async (row) => ({
      ...row,
      receipt_path: await createSignedImageUrl(row.receipt_path),
    })));
    res.json(rowsWithSignedReceipts);
  } catch (error) {
    console.error('Inventory movement history error:', error);
    res.status(500).json({ error: 'Unable to load inventory movement history.' });
  }
});

// Retained for backward compatibility. New products now create opening inventory atomically.
router.post('/opening', async (req, res) => {
  const { product_id, supplier_id, supplier_price, supplier_reference } = req.body;
  const supplierPrice = Number(supplier_price);
  if (!product_id) return res.status(400).json({ error: 'Product is required.' });
  if (!Number.isFinite(supplierPrice) || supplierPrice <= 0) {
    return res.status(400).json({ error: 'Supplier price must be greater than zero.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.query(
      'SELECT id, name, stock, price, supplier_id FROM products WHERE id = ? FOR UPDATE',
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

    const supplierReference = normalizeSupplierReference(supplier_reference);
    await connection.query(
      `INSERT INTO inventory_movements (
        product_id, admin_id, supplier_id, sale_id, movement_type, movement_reason,
        quantity, supplier_price, selling_price, movement_date, remarks,
        supplier_reference
      ) VALUES (?, ?, ?, NULL, 'Stock-In', 'Opening Inventory', ?, ?, ?, NOW(), 'Opening Inventory', ?)`,
      [product_id, req.user.id, supplier_id || null, products[0].stock,
        Number(supplierPrice.toFixed(2)), products[0].price, supplierReference]
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
    remarks, receipt_image, supplier_reference, receivingRequestId, purchase_order_item_id,
  } = req.body;
  const receivedQuantity = Number(quantity);
  const supplierPrice = Number(supplier_price);
  const requestId = String(receivingRequestId || '').trim();
  const purchaseOrderItemId = purchase_order_item_id === undefined || purchase_order_item_id === null || purchase_order_item_id === ''
    ? null
    : Number(purchase_order_item_id);

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
  if (purchaseOrderItemId !== null && (!Number.isInteger(purchaseOrderItemId) || purchaseOrderItemId <= 0)) {
    return res.status(400).json({ error: 'Invalid purchase-order item.' });
  }

  let supplierReference;
  try {
    supplierReference = normalizeSupplierReference(supplier_reference);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }


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
  let receiptPath = null;
  try {
    receiptPath = await storeReceiptImage(receipt_image);
    await connection.beginTransaction();

    const [productRows] = await connection.query(
      'SELECT id, name, stock, price, supplier_id FROM products WHERE id = ? FOR UPDATE',
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

    let purchaseOrderContext = null;
    if (purchaseOrderItemId !== null) {
      const [poRows] = await connection.query(
        `SELECT
           poi.purchase_order_item_id,
           poi.purchase_order_id,
           poi.product_id,
           poi.ordered_quantity,
           poi.expected_unit_cost,
           po.po_number,
           po.supplier_id,
           po.status
         FROM purchase_order_items poi
         INNER JOIN purchase_orders po ON po.purchase_order_id = poi.purchase_order_id
         WHERE poi.purchase_order_item_id = ?
         FOR UPDATE`,
        [purchaseOrderItemId]
      );
      if (!poRows.length) {
        throw Object.assign(new Error('Purchase-order item not found.'), { statusCode: 404 });
      }
      const poItem = poRows[0];
      if (!['Ordered', 'Partially Received'].includes(poItem.status)) {
        throw Object.assign(
          new Error('Only Ordered or Partially Received purchase orders can receive stock.'),
          { statusCode: 409 }
        );
      }
      if (Number(poItem.product_id) !== Number(product_id)) {
        throw Object.assign(new Error('The selected product does not match this purchase-order item.'), { statusCode: 400 });
      }
      if (Number(poItem.supplier_id) !== Number(supplier_id)) {
        throw Object.assign(new Error('The selected supplier does not match this purchase order.'), { statusCode: 400 });
      }

      const [receivedRows] = await connection.query(
        `SELECT COALESCE(SUM(quantity), 0) AS received_quantity
         FROM inventory_movements
         WHERE purchase_order_item_id = ? AND movement_type = 'Stock-In'`,
        [purchaseOrderItemId]
      );
      const alreadyReceived = Number(receivedRows[0].received_quantity || 0);
      const remainingQuantity = Math.max(Number(poItem.ordered_quantity) - alreadyReceived, 0);
      if (remainingQuantity <= 0) {
        throw Object.assign(new Error('This purchase-order item is already fully received.'), { statusCode: 409 });
      }
      if (receivedQuantity > remainingQuantity) {
        throw Object.assign(
          new Error(`Received quantity exceeds the ${remainingQuantity} unit(s) remaining on ${poItem.po_number}.`),
          { statusCode: 409 }
        );
      }
      purchaseOrderContext = {
        ...poItem,
        already_received: alreadyReceived,
        remaining_before: remainingQuantity,
      };
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
        product_id, admin_id, supplier_id, sale_id, movement_type, movement_reason, quantity,
        supplier_price, selling_price, movement_date, remarks, receipt_path,
        supplier_reference, receiving_request_id, purchase_order_item_id
      ) VALUES (?, ?, ?, NULL, 'Stock-In', 'Stock Receiving', ?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
      [product.id, req.user.id, supplierRows[0].supplier_id, receivedQuantity,
        Number(supplierPrice.toFixed(2)), Number(selectedSellingPrice.toFixed(2)),
        String(remarks || 'Stock Receiving').trim(), receiptPath, supplierReference, requestId, purchaseOrderItemId]
    );

    await connection.query(
      'UPDATE products SET stock = ?, price = ?, supplier_id = ? WHERE id = ?',
      [newStock, selectedSellingPrice, supplierRows[0].supplier_id, product.id]
    );

    let purchaseOrderProgress = null;
    if (purchaseOrderContext) {
      purchaseOrderProgress = await syncPurchaseOrderStatus(
        connection,
        purchaseOrderContext.purchase_order_id
      );
    }

    await recordAuditLog(connection, purchaseOrderContext ? {
      adminId: req.user.id,
      action: 'purchase_order.receive',
      entityType: 'purchase_order',
      entityId: purchaseOrderContext.purchase_order_id,
      summary: `Received ${receivedQuantity} unit(s) of ${product.name} against ${purchaseOrderContext.po_number}.`,
      before: {
        status: purchaseOrderContext.status,
        purchase_order_item_id: purchaseOrderItemId,
        item_received_quantity: purchaseOrderContext.already_received,
        item_remaining_quantity: purchaseOrderContext.remaining_before,
        product_stock: Number(product.stock),
      },
      after: {
        status: purchaseOrderProgress?.status || purchaseOrderContext.status,
        purchase_order_item_id: purchaseOrderItemId,
        item_received_quantity: purchaseOrderContext.already_received + receivedQuantity,
        item_remaining_quantity: Math.max(purchaseOrderContext.remaining_before - receivedQuantity, 0),
        product_stock: newStock,
        actual_unit_cost: Number(supplierPrice.toFixed(2)),
        inventory_movement_id: movementResult.insertId,
      },
      reason: String(remarks || 'Purchase Order Receiving').trim(),
    } : {
      adminId: req.user.id,
      action: 'inventory.receive',
      entityType: 'product',
      entityId: product.id,
      summary: `Received ${receivedQuantity} unit(s) of ${product.name}.`,
      before: {
        stock: Number(product.stock),
        selling_price: Number(product.price),
        supplier_id: product.supplier_id === null ? null : Number(product.supplier_id),
      },
      after: {
        stock: newStock,
        selling_price: Number(selectedSellingPrice.toFixed(2)),
        supplier_id: Number(supplierRows[0].supplier_id),
        received_quantity: receivedQuantity,
        supplier_cost: Number(supplierPrice.toFixed(2)),
        inventory_movement_id: movementResult.insertId,
      },
      reason: String(remarks || 'Stock Receiving').trim(),
    });

    await connection.commit();

    res.status(201).json({
      message: purchaseOrderContext
        ? `Stock received successfully against ${purchaseOrderContext.po_number}.`
        : 'Stock received successfully.',
      movement_id: movementResult.insertId,
      purchase_order: purchaseOrderContext ? {
        purchase_order_id: purchaseOrderContext.purchase_order_id,
        po_number: purchaseOrderContext.po_number,
        status: purchaseOrderProgress?.status || purchaseOrderContext.status,
        received_quantity: Number(purchaseOrderProgress?.received_quantity || 0),
        remaining_quantity: Number(purchaseOrderProgress?.remaining_quantity || 0),
      } : null,
      inventory: { previous_stock: Number(product.stock), received_quantity: receivedQuantity,
        new_stock: newStock, supplier_price: supplierPrice,
        selling_price: selectedSellingPrice, weighted_average_cost: averageCost },
    });
  } catch (error) {
    await connection.rollback();
    await safelyDeleteStoredImage(receiptPath);
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


router.post('/adjust', async (req, res) => {
  const productId = Number(req.body.product_id);
  const countedStock = Number(req.body.counted_stock);
  const expectedStock = Number(req.body.expected_stock);
  const requestId = String(req.body.adjustmentRequestId || '').trim();
  const reason = String(req.body.reason || '').trim().replace(/\s+/g, ' ');
  const notes = String(req.body.notes || '').trim().replace(/\s+/g, ' ');

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Select a valid product.' });
  }
  if (!Number.isInteger(countedStock) || countedStock < 0 || countedStock > 1000000) {
    return res.status(400).json({ error: 'Physical count must be a whole number from 0 to 1,000,000.' });
  }
  if (!Number.isInteger(expectedStock) || expectedStock < 0) {
    return res.status(400).json({ error: 'Expected system stock is required. Refresh the page and try again.' });
  }
  if (!requestId || requestId.length > 64) {
    return res.status(400).json({ error: 'Invalid or missing adjustment request ID.' });
  }
  if (reason.length < 3 || reason.length > 120) {
    return res.status(400).json({ error: 'Adjustment reason must be 3 to 120 characters.' });
  }
  if (notes.length > 500) {
    return res.status(400).json({ error: 'Adjustment notes must not exceed 500 characters.' });
  }

  const [duplicates] = await pool.query(
    `SELECT movement_id, product_id, movement_type, quantity
     FROM inventory_movements WHERE adjustment_request_id = ? LIMIT 1`,
    [requestId]
  );
  if (duplicates.length) {
    return res.json({
      message: 'This stock adjustment was already recorded.',
      movement_id: duplicates[0].movement_id,
      duplicate: true,
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [productRows] = await connection.query(
      `SELECT id, name, stock, price
       FROM products WHERE id = ? FOR UPDATE`,
      [productId]
    );
    if (!productRows.length) {
      throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
    }

    const product = productRows[0];
    const currentStock = Number(product.stock);
    if (currentStock !== expectedStock) {
      throw Object.assign(
        new Error(`Stock changed from ${expectedStock} to ${currentStock} while you were counting. Refresh and verify the physical count before adjusting.`),
        { statusCode: 409 }
      );
    }

    const difference = countedStock - currentStock;
    if (difference === 0) {
      await connection.rollback();
      return res.json({
        message: 'Physical count matches system stock. No adjustment was recorded.',
        adjusted: false,
        inventory: { previous_stock: currentStock, counted_stock: countedStock, new_stock: currentStock },
      });
    }

    const [costRows] = await connection.query(
      `SELECT
         COUNT(*) AS movement_count,
         COALESCE(SUM(CASE
           WHEN movement_type = 'Stock-In' THEN quantity * supplier_price
           WHEN movement_type = 'Stock-Out' THEN -(quantity * supplier_price)
           ELSE 0 END), 0) AS inventory_value
       FROM inventory_movements
       WHERE product_id = ?`,
      [productId]
    );

    const movementCount = Number(costRows[0].movement_count || 0);
    const inventoryValue = Number(costRows[0].inventory_value || 0);
    let unitCost = currentStock > 0 ? inventoryValue / currentStock : 0;

    if ((!Number.isFinite(unitCost) || unitCost <= 0) && difference > 0) {
      const [latestCostRows] = await connection.query(
        `SELECT supplier_price
         FROM inventory_movements
         WHERE product_id = ? AND supplier_price > 0
         ORDER BY movement_date DESC, movement_id DESC
         LIMIT 1`,
        [productId]
      );
      if (latestCostRows.length) unitCost = Number(latestCostRows[0].supplier_price);
    }

    if (movementCount === 0 || !Number.isFinite(unitCost) || unitCost <= 0) {
      throw Object.assign(
        new Error('A reliable inventory cost basis is missing for this product. Record/repair its opening inventory or receiving history before applying a physical-count adjustment.'),
        { statusCode: 409 }
      );
    }

    const movementType = difference > 0 ? 'Stock-In' : 'Stock-Out';
    const movementReason = difference > 0 ? 'Physical Count Increase' : 'Physical Count Decrease';
    const quantity = Math.abs(difference);
    const remarks = `Physical count adjustment — ${reason}${notes ? ` — ${notes}` : ''}`;

    const [movementResult] = await connection.query(
      `INSERT INTO inventory_movements (
        product_id, admin_id, supplier_id, sale_id, movement_type, movement_reason,
        quantity, supplier_price, selling_price, movement_date, remarks,
        receipt_path, supplier_reference, receiving_request_id, adjustment_request_id
      ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, NOW(), ?, NULL, NULL, NULL, ?)`,
      [productId, req.user.id, movementType, movementReason, quantity,
        Number(unitCost.toFixed(2)), Number(product.price), remarks, requestId]
    );

    await connection.query(
      'UPDATE products SET stock = ? WHERE id = ?',
      [countedStock, productId]
    );

    await recordAuditLog(connection, {
      adminId: req.user.id,
      action: 'inventory.adjust',
      entityType: 'product',
      entityId: productId,
      summary: `Adjusted ${product.name} from ${currentStock} to ${countedStock}.`,
      before: {
        stock: currentStock,
      },
      after: {
        stock: countedStock,
        difference,
        movement_type: movementType,
        quantity,
        unit_cost: Number(unitCost.toFixed(2)),
        inventory_movement_id: movementResult.insertId,
      },
      reason: notes ? `${reason} — ${notes}` : reason,
    });

    await connection.commit();
    return res.status(201).json({
      message: 'Inventory adjustment recorded successfully.',
      movement_id: movementResult.insertId,
      adjusted: true,
      inventory: {
        previous_stock: currentStock,
        counted_stock: countedStock,
        difference,
        movement_type: movementType,
        quantity,
        unit_cost: Number(unitCost.toFixed(2)),
        new_stock: countedStock,
      },
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const [existing] = await pool.query(
        'SELECT movement_id FROM inventory_movements WHERE adjustment_request_id = ? LIMIT 1',
        [requestId]
      );
      if (existing.length) {
        return res.json({
          message: 'This stock adjustment was already recorded.',
          movement_id: existing[0].movement_id,
          duplicate: true,
        });
      }
    }

    console.error('Inventory adjustment error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to record inventory adjustment.',
    });
  } finally {
    connection.release();
  }
});

export default router;
