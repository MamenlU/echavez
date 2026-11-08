// Focused, idempotent migration for the approved four-municipality delivery
// expansion. This script does not change order statuses, pricing amounts,
// inventory, sales totals, payment records, authentication, or promotion data.
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

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'echavez_web',
});

try {
  console.log(`Running delivery expansion migration on: ${process.env.DB_NAME || 'echavez_web'}`);

  await addColumnIfMissing(
    connection,
    'delivery_rates',
    'municipality',
    'VARCHAR(100) NULL AFTER id'
  );

  // Every existing delivery-rate row belongs to Initao because the current
  // production code was Initao-only before this migration.
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
    console.log('Removed old unique_barangay index.');
  }

  if (!(await hasIndex(connection, 'delivery_rates', 'unique_municipality_barangay'))) {
    await connection.query(
      `ALTER TABLE delivery_rates
       ADD UNIQUE KEY unique_municipality_barangay (municipality, barangay)`
    );
    console.log('Added unique_municipality_barangay index.');
  }

  await addColumnIfMissing(
    connection,
    'orders',
    'delivery_municipality',
    'VARCHAR(100) NULL AFTER delivery_contact_number'
  );

  // Historical delivery orders were all validated against the old Initao-only
  // list, so this backfill preserves their correct municipality.
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

  // Existing POS Deliver Out records were also Initao-only.
  await connection.query(
    `UPDATE sales
     SET delivery_municipality = 'Initao'
     WHERE fulfillment = 'delivery'
       AND delivery_barangay IS NOT NULL
       AND (delivery_municipality IS NULL OR TRIM(delivery_municipality) = '')`
  );

  // Existing working database already has these map fields; these checks only
  // protect installations where they are still missing.
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

  console.log('Delivery-area expansion migration completed successfully.');
} catch (error) {
  console.error('Delivery-area expansion migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
