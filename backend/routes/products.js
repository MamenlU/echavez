import express from 'express';
import { randomInt } from 'node:crypto';
import fs from 'fs';
import path from 'path';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { normalizeSupplierReference } from '../lib/stockAudit.js';
import { productAuditSnapshot, recordAuditLog } from '../lib/auditService.js';

const router = express.Router();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const RECEIPTS_DIR = path.join(UPLOADS_DIR, 'receipts');

if (process.env.NODE_ENV !== 'production') {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  if (!fs.existsSync(RECEIPTS_DIR)) {
    fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
  }
}

function processBase64Image(imageValue) {
  if (!imageValue || !String(imageValue).startsWith('data:image/')) return imageValue;
  if (process.env.NODE_ENV === 'production') return imageValue;

  const match = String(imageValue).match(/^data:image\/([A-Za-z0-9-+]+);base64,(.+)$/);
  if (!match) {
    throw Object.assign(new Error('Invalid product image.'), { statusCode: 400 });
  }

  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const fileName = `prod_${Date.now()}_${randomInt(100, 1000)}.${extension}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), Buffer.from(match[2], 'base64'));
  return `/api/uploads/${fileName}`;
}

function processOpeningReceipt(receiptImage) {
  if (!receiptImage) return null;

  const value = String(receiptImage);
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);

  if (!match) {
    throw Object.assign(
      new Error('Opening supplier receipt must be a JPG, PNG, or WEBP image.'),
      { statusCode: 400 }
    );
  }

  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    throw Object.assign(
      new Error('Opening supplier receipt must not exceed 5 MB.'),
      { statusCode: 400 }
    );
  }

  if (process.env.NODE_ENV === 'production') {
    return value;
  }

  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const fileName = `opening_receipt_${Date.now()}_${randomInt(1000, 10000)}.${extension}`;

  fs.writeFileSync(path.join(RECEIPTS_DIR, fileName), buffer);
  return `/api/uploads/receipts/${fileName}`;
}

function normalizeProductInput(body) {
  const name = String(body.name || '').trim();

  const description =
    typeof body.description === 'string' &&
    body.description.trim()
      ? body.description.trim()
      : null;

  const unit = String(body.unit || '').trim();

  const price = Number(body.price);
  const stock = Number(body.stock);
  const reorderLevel = Number(body.reorder_level);

  const category = String(body.category || '').trim();
  const brand = String(body.brand || 'Generic').trim() || 'Generic';
  const barcode = String(body.barcode || '').trim() || null;

  const status =
    body.status === 'inactive'
      ? 'inactive'
      : 'active';

  const deliveryClass = String(
    body.delivery_class || 'standard'
  ).toLowerCase();

  const fulfillmentRule = String(
    body.fulfillment_rule || 'all'
  ).toLowerCase();

  const allowedDeliveryClasses = [
    'light',
    'standard',
    'bulky'
  ];

  if (!name) {
    throw Object.assign(
      new Error('Product name is required.'),
      { statusCode: 400 }
    );
  }

  if (!unit) {
    throw Object.assign(
      new Error('Unit of measurement is required.'),
      { statusCode: 400 }
    );
  }

  if (unit.length > 50) {
    throw Object.assign(
      new Error(
        'Unit of measurement must not exceed 50 characters.'
      ),
      { statusCode: 400 }
    );
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw Object.assign(
      new Error(
        'Selling price must be greater than zero.'
      ),
      { statusCode: 400 }
    );
  }

  if (!Number.isInteger(stock) || stock < 0) {
    throw Object.assign(
      new Error(
        'Stock must be a whole number of zero or greater.'
      ),
      { statusCode: 400 }
    );
  }

  if (
    !Number.isInteger(reorderLevel) ||
    reorderLevel < 0 ||
    reorderLevel > 100000
  ) {
    throw Object.assign(
      new Error(
        'Reorder level must be a whole number from 0 to 100,000.'
      ),
      { statusCode: 400 }
    );
  }

  if (!category) {
    throw Object.assign(
      new Error('Category is required.'),
      { statusCode: 400 }
    );
  }

  if (
    !allowedDeliveryClasses.includes(
      deliveryClass
    )
  ) {
    throw Object.assign(
      new Error(
        'Delivery class must be light, standard, or bulky.'
      ),
      { statusCode: 400 }
    );
  }

  if (!['all', 'delivery_only'].includes(fulfillmentRule)) {
    throw Object.assign(
      new Error(
        'Fulfillment availability must be All methods or Delivery only.'
      ),
      { statusCode: 400 }
    );
  }

  let bulkQuantityThreshold = null;

  const hasThreshold =
    body.bulk_quantity_threshold !== undefined &&
    body.bulk_quantity_threshold !== null &&
    String(
      body.bulk_quantity_threshold
    ).trim() !== '';

  if (
    deliveryClass !== 'bulky' &&
    hasThreshold
  ) {
    const parsedThreshold = Number(
      body.bulk_quantity_threshold
    );

    if (
      !Number.isInteger(parsedThreshold) ||
      parsedThreshold < 1 ||
      parsedThreshold > 100000
    ) {
      throw Object.assign(
        new Error(
          'Bulk quantity threshold must be a whole number from 1 to 100,000.'
        ),
        { statusCode: 400 }
      );
    }

    bulkQuantityThreshold =
      parsedThreshold;
  }

  return {
    name,
    description,
    unit,
    barcode,
    price: Number(price.toFixed(2)),
    stock,
    reorderLevel,
    category,
    brand,
    status,
    deliveryClass,
    bulkQuantityThreshold,
    fulfillmentRule,
    image: processBase64Image(
      body.image || '📦'
    ),
  };
}

async function findCategoryAndSupplier(connection, categoryName, supplierId) {
  const [categoryRows] = await connection.query(
    `SELECT category_id, category_name
     FROM categories
     WHERE category_name = ? AND status = 'Active'
     LIMIT 1`,
    [categoryName]
  );

  if (categoryRows.length === 0) {
    throw Object.assign(new Error('Invalid or inactive product category.'), { statusCode: 400 });
  }

  let selectedSupplierId = null;
  if (supplierId !== undefined && supplierId !== null && String(supplierId).trim() !== '') {
    const [supplierRows] = await connection.query(
      `SELECT supplier_id FROM suppliers
       WHERE supplier_id = ? AND status = 'Active'
       LIMIT 1`,
      [supplierId]
    );
    if (supplierRows.length === 0) {
      throw Object.assign(new Error('Invalid or inactive supplier.'), { statusCode: 400 });
    }
    selectedSupplierId = supplierRows[0].supplier_id;
  }

  return { category: categoryRows[0], supplierId: selectedSupplierId };
}

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Generates a unique inventory code only. Barcode artwork/printing remains outside scope.
router.get('/generate-barcode', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    let barcode = '';
    let exists = true;

    while (exists) {
      const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      barcode = `RJ${date}${randomInt(100000, 1000000)}`;
      const [rows] = await pool.query('SELECT id FROM products WHERE barcode = ? LIMIT 1', [barcode]);
      exists = rows.length > 0;
    }

    res.json({ barcode });
  } catch (error) {
    console.error('Barcode generation error:', error);
    res.status(500).json({ error: 'Unable to generate a product code.' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const product = normalizeProductInput(req.body);
    const openingCost = Number(req.body.opening_supplier_price);

    if (product.stock > 0 && (!Number.isFinite(openingCost) || openingCost <= 0)) {
      return res.status(400).json({
        error: 'Opening supplier cost is required when opening stock is greater than zero.',
      });
    }
    if (product.stock > 0 && !req.body.supplier_id) {
      return res.status(400).json({
        error: 'Supplier is required when opening stock is greater than zero.',
      });
    }

    const openingSupplierReference = product.stock > 0
      ? normalizeSupplierReference(req.body.opening_supplier_reference)
      : null;
    const openingReceiptPath = product.stock > 0
      ? processOpeningReceipt(req.body.opening_receipt_image)
      : null;

    await connection.beginTransaction();

    if (product.barcode) {
      const [existing] = await connection.query(
        'SELECT id FROM products WHERE barcode = ? LIMIT 1 FOR UPDATE',
        [product.barcode]
      );
      if (existing.length > 0) {
        throw Object.assign(new Error('This barcode is already assigned to another product.'), {
          statusCode: 409,
        });
      }
    }

    const related = await findCategoryAndSupplier(connection, product.category, req.body.supplier_id);
    const [result] = await connection.query(
  `INSERT INTO products (
    barcode,
    name,
    description,
    unit,
    price,
    category,
    category_id,
    supplier_id,
    image,
    stock,
    reorder_level,
    brand,
    status,
    delivery_class,
    bulk_quantity_threshold,
    fulfillment_rule
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    product.barcode,
    product.name,
    product.description,
    product.unit,
    product.price,
    related.category.category_name,
    related.category.category_id,
    related.supplierId,
    product.image,
    product.stock,
    product.reorderLevel,
    product.brand,
    product.status,
    product.deliveryClass,
    product.bulkQuantityThreshold,
    product.fulfillmentRule,
  ]
);

    if (product.stock > 0) {
      await connection.query(
        `INSERT INTO inventory_movements (
          product_id, admin_id, supplier_id, sale_id, movement_type, movement_reason,
          quantity, supplier_price, selling_price, movement_date, remarks,
          receipt_path, supplier_reference
        ) VALUES (?, ?, ?, NULL, 'Stock-In', 'Opening Inventory', ?, ?, ?, NOW(), 'Opening Inventory', ?, ?)`,
        [
          result.insertId,
          req.user.id,
          related.supplierId,
          product.stock,
          Number(openingCost.toFixed(2)),
          product.price,
          openingReceiptPath,
          openingSupplierReference,
        ]
      );
    }

    await recordAuditLog(connection, {
      adminId: req.user.id,
      action: 'product.create',
      entityType: 'product',
      entityId: result.insertId,
      summary: `Created product ${product.name}.`,
      after: productAuditSnapshot({
        id: result.insertId,
        ...product,
        reorder_level: product.reorderLevel,
        category: related.category.category_name,
        category_id: related.category.category_id,
        supplier_id: related.supplierId,
        delivery_class: product.deliveryClass,
        bulk_quantity_threshold: product.bulkQuantityThreshold,
        fulfillment_rule: product.fulfillmentRule,
      }),
      reason: product.stock > 0 ? 'Product created with opening inventory.' : 'Product created.',
    });

    await connection.commit();
    res.status(201).json({
      id: result.insertId,
      message: product.stock > 0
        ? 'Product and opening inventory saved successfully.'
        : 'Product saved successfully.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding product:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This barcode is already assigned to another product.' });
    }
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Failed to add product.',
    });
  } finally {
    connection.release();
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const product = normalizeProductInput(req.body);
    await connection.beginTransaction();

    const [currentRows] = await connection.query(
      `SELECT id, barcode, name, unit, price, category, category_id, supplier_id,
              stock, reorder_level, brand, status, delivery_class,
              bulk_quantity_threshold, fulfillment_rule
       FROM products
       WHERE id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (currentRows.length === 0) {
      throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
    }

    const currentStock = Number(currentRows[0].stock);
    if (product.stock !== currentStock) {
      throw Object.assign(
        new Error('Stock cannot be changed from Edit Product. Refresh the product and use Inventory Adjustment / Physical Count instead.'),
        { statusCode: 409 }
      );
    }

    if (product.barcode) {
      const [existing] = await connection.query(
        'SELECT id FROM products WHERE barcode = ? AND id <> ? LIMIT 1 FOR UPDATE',
        [product.barcode, req.params.id]
      );
      if (existing.length > 0) {
        throw Object.assign(new Error('This barcode is already assigned to another product.'), {
          statusCode: 409,
        });
      }
    }

    const related = await findCategoryAndSupplier(connection, product.category, req.body.supplier_id);
    const [result] = await connection.query(
  `UPDATE products SET
    barcode = ?,
    name = ?,
    description = ?,
    unit = ?,
    price = ?,
    category = ?,
    category_id = ?,
    supplier_id = ?,
    image = ?,
    reorder_level = ?,
    brand = ?,
    status = ?,
    delivery_class = ?,
    bulk_quantity_threshold = ?,
    fulfillment_rule = ?
   WHERE id = ?`,
  [
    product.barcode,
    product.name,
    product.description,
    product.unit,
    product.price,
    related.category.category_name,
    related.category.category_id,
    related.supplierId,
    product.image,
    product.reorderLevel,
    product.brand,
    product.status,
    product.deliveryClass,
    product.bulkQuantityThreshold,
    product.fulfillmentRule,
    req.params.id,
  ]
);

    if (result.affectedRows === 0) {
      throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
    }

    const beforeProduct = productAuditSnapshot(currentRows[0]);
    const afterProduct = productAuditSnapshot({
      id: Number(req.params.id),
      ...product,
      stock: currentStock,
      reorder_level: product.reorderLevel,
      category: related.category.category_name,
      category_id: related.category.category_id,
      supplier_id: related.supplierId,
      delivery_class: product.deliveryClass,
      bulk_quantity_threshold: product.bulkQuantityThreshold,
      fulfillment_rule: product.fulfillmentRule,
    });

    const priceChanged = Number(beforeProduct?.price || 0) !== Number(afterProduct?.price || 0);
    await recordAuditLog(connection, {
      adminId: req.user.id,
      action: priceChanged ? 'product.price_update' : 'product.update',
      entityType: 'product',
      entityId: req.params.id,
      summary: priceChanged
        ? `Updated ${product.name} selling price from ₱${Number(beforeProduct.price).toFixed(2)} to ₱${Number(afterProduct.price).toFixed(2)}.`
        : `Updated product ${product.name}.`,
      before: beforeProduct,
      after: afterProduct,
      reason: priceChanged ? 'Admin product price/details update.' : 'Admin product details update.',
    });

    await connection.commit();
    res.json({ message: 'Product updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating product:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This barcode is already assigned to another product.' });
    }
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Failed to update product.',
    });
  } finally {
    connection.release();
  }
});

// Activate or deactivate a product without removing historical references.
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const productId = Number(req.params.id);
    const status = String(req.body.status || '').toLowerCase();

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        error: 'Invalid product ID.',
      });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        error: 'Product status must be active or inactive.',
      });
    }

    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT id, name, status FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (rows.length === 0) {
      throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
    }

    const previousStatus = String(rows[0].status);
    if (previousStatus !== status) {
      await connection.query(
        'UPDATE products SET status = ? WHERE id = ?',
        [status, productId]
      );

      await recordAuditLog(connection, {
        adminId: req.user.id,
        action: 'product.status_change',
        entityType: 'product',
        entityId: productId,
        summary: `${status === 'active' ? 'Activated' : 'Deactivated'} product ${rows[0].name}.`,
        before: { status: previousStatus },
        after: { status },
        reason: 'Admin changed product availability status.',
      });
    }

    await connection.commit();
    res.json({
      message:
        status === 'active'
          ? 'Product activated successfully.'
          : 'Product deactivated successfully.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating product status:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Failed to update product status.',
    });
  } finally {
    connection.release();
  }
});

// Permanent deletion is intentionally disabled so order, sales, and inventory
// history cannot be accidentally orphaned or destroyed.
router.delete('/:id', authenticateToken, requireAdmin, (_req, res) => {
  return res.status(405).json({
    error:
      'Permanent product deletion is disabled. Deactivate the product instead.',
  });
});

export default router;
