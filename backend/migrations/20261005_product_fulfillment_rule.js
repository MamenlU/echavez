// Focused, idempotent migration for product fulfillment restrictions.
// Adds one independent product-level rule only. Existing products keep their
// current behavior because the new column defaults to "all".
//
// This migration does NOT change product prices, stock, delivery classes,
// delivery fees, orders, sales, payments, inventory movements, authentication,
// or any historical transaction data.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function hasColumn(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  return rows.length > 0;
}

const databaseName = process.env.DB_NAME || 'echavez_web';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
});

try {
  console.log(`Running product fulfillment-rule migration on: ${databaseName}`);

  const [tableRows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
     LIMIT 1`
  );

  if (tableRows.length === 0) {
    throw new Error('The products table does not exist in the selected database.');
  }

  if (await hasColumn(connection, 'products', 'fulfillment_rule')) {
    console.log('Column "products.fulfillment_rule" already exists. No schema change was needed.');
  } else {
    await connection.query(
      `ALTER TABLE products
       ADD COLUMN fulfillment_rule ENUM('all','delivery_only')
       NOT NULL DEFAULT 'all'
       AFTER bulk_quantity_threshold`
    );

    console.log('Added "products.fulfillment_rule" with default "all".');
  }

  const [[summary]] = await connection.query(
    `SELECT
       COUNT(*) AS total_products,
       SUM(fulfillment_rule = 'all') AS all_products,
       SUM(fulfillment_rule = 'delivery_only') AS delivery_only_products
     FROM products`
  );

  console.log(`Total products: ${Number(summary.total_products || 0)}`);
  console.log(`Normal/all-fulfillment products: ${Number(summary.all_products || 0)}`);
  console.log(`Delivery-only products: ${Number(summary.delivery_only_products || 0)}`);
  console.log('Product fulfillment-rule migration completed successfully.');
} catch (error) {
  console.error('Product fulfillment-rule migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
