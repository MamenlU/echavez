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

async function hasIndex(connection, tableName, indexName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName]
  );

  return rows.length > 0;
}

async function addColumnIfMissing(connection, tableName, columnName, definition) {
  if (await hasColumn(connection, tableName, columnName)) {
    console.log(`Column "${tableName}.${columnName}" already exists.`);
    return;
  }

  await connection.query(
    `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`
  );

  console.log(`Added "${tableName}.${columnName}".`);
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'echavez_web',
  });

  try {
    // Existing safe schema alignments retained from the working project.
    await addColumnIfMissing(
      connection,
      'products',
      'status',
      "ENUM('active', 'inactive') NOT NULL DEFAULT 'active'"
    );

    await addColumnIfMissing(
      connection,
      'users',
      'first_order_discount_used',
      'TINYINT(1) NOT NULL DEFAULT 0'
    );

    await addColumnIfMissing(
      connection,
      'orders',
      'original_subtotal',
      'DECIMAL(12,2) NULL AFTER total'
    );

    await addColumnIfMissing(
      connection,
      'orders',
      'discount_amount',
      'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER original_subtotal'
    );

    await connection.query(
      `UPDATE orders
       SET original_subtotal = total
       WHERE original_subtotal IS NULL`
    );

    await connection.query(
      `ALTER TABLE orders
       MODIFY COLUMN original_subtotal DECIMAL(12,2) NOT NULL DEFAULT 0`
    );

    await connection.query(
      `UPDATE users u
       SET u.first_order_discount_used = 1
       WHERE u.role = 'customer'
         AND EXISTS (
           SELECT 1
           FROM orders o
           WHERE o.user_id = u.id
         )`
    );

    // ---------------------------------------------------------------
    // Delivery-area expansion: Initao, Libertad, Naawan, and Gitagum.
    // Existing delivery-rate rows were created while the system was
    // Initao-only, so they are safely backfilled as Initao.
    // ---------------------------------------------------------------
    await addColumnIfMissing(
      connection,
      'delivery_rates',
      'municipality',
      'VARCHAR(100) NULL AFTER id'
    );

    await connection.query(
      `UPDATE delivery_rates
       SET municipality = 'Initao'
       WHERE municipality IS NULL OR TRIM(municipality) = ''`
    );

    await connection.query(
      `ALTER TABLE delivery_rates
       MODIFY COLUMN municipality VARCHAR(100) NOT NULL`
    );

    if (await hasIndex(connection, 'delivery_rates', 'unique_barangay')) {
      await connection.query(
        'ALTER TABLE delivery_rates DROP INDEX unique_barangay'
      );
      console.log('Removed old delivery_rates.unique_barangay index.');
    }

    if (!(await hasIndex(connection, 'delivery_rates', 'unique_municipality_barangay'))) {
      await connection.query(
        `ALTER TABLE delivery_rates
         ADD UNIQUE KEY unique_municipality_barangay (municipality, barangay)`
      );
      console.log('Added delivery_rates municipality + barangay unique index.');
    }

    await addColumnIfMissing(
      connection,
      'orders',
      'delivery_municipality',
      'VARCHAR(100) NULL AFTER delivery_contact_number'
    );

    await connection.query(
      `UPDATE orders
       SET delivery_municipality = 'Initao'
       WHERE fulfillment = 'delivery'
         AND delivery_barangay IS NOT NULL
         AND (delivery_municipality IS NULL OR TRIM(delivery_municipality) = '')`
    );

    await addColumnIfMissing(
      connection,
      'sales',
      'delivery_municipality',
      'VARCHAR(100) NULL AFTER delivery_contact_number'
    );

    await connection.query(
      `UPDATE sales
       SET delivery_municipality = 'Initao'
       WHERE fulfillment = 'delivery'
         AND delivery_barangay IS NOT NULL
         AND (delivery_municipality IS NULL OR TRIM(delivery_municipality) = '')`
    );

    // The current working database already has these columns, but keeping
    // them in the idempotent updater protects clean/future installations.
    await addColumnIfMissing(
      connection,
      'orders',
      'delivery_latitude',
      'DECIMAL(10,7) NULL AFTER completed_at'
    );

    await addColumnIfMissing(
      connection,
      'orders',
      'delivery_longitude',
      'DECIMAL(10,7) NULL AFTER delivery_latitude'
    );

    console.log('Rayjin Hardware schema update completed successfully.');
  } catch (error) {
    console.error('Schema update failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

run();
