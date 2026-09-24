import express from 'express';
import { randomInt } from 'node:crypto';
import fs from 'fs';
import path from 'path';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (process.env.NODE_ENV !== 'production' && !fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
    bulk_quantity_threshold
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  ]
);

    if (product.stock > 0) {
      await connection.query(
        `INSERT INTO inventory_movements (
          product_id, admin_id, supplier_id, sale_id, movement_type,
          quantity, supplier_price, selling_price, movement_date, remarks
        ) VALUES (?, ?, ?, NULL, 'Stock-In', ?, ?, ?, NOW(), 'Opening Inventory')`,
        [result.insertId, req.user.id, related.supplierId, product.stock,
          Number(openingCost.toFixed(2)), product.price]
      );
    }

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
    stock = ?,
    reorder_level = ?,
    brand = ?,
    status = ?,
    delivery_class = ?,
    bulk_quantity_threshold = ?
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
    product.stock,
    product.reorderLevel,
    product.brand,
    product.status,
    product.deliveryClass,
    product.bulkQuantityThreshold,
    req.params.id,
  ]
);

    if (result.affectedRows === 0) {
      throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
    }

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

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'This product has transaction history and cannot be deleted. Mark it inactive instead.',
      });
    }
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

export default router;
