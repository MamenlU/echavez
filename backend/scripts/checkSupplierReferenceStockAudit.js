// Read-only verification for the supplier-reference Stock-In enhancement.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const databaseName = process.env.DB_NAME || 'echavez_web';
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
});

try {
  const [[column]] = await connection.query(
    `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'inventory_movements'
       AND COLUMN_NAME = 'supplier_reference'
     LIMIT 1`
  );

  if (!column) throw new Error('inventory_movements.supplier_reference is missing.');
  if (String(column.COLUMN_TYPE).toLowerCase() !== 'varchar(120)') {
    throw new Error(`Unexpected supplier_reference type: ${column.COLUMN_TYPE}`);
  }

  const [[totals]] = await connection.query(
    `SELECT
       COUNT(*) AS movement_rows,
       SUM(movement_type = 'Stock-In') AS stock_in_rows,
       SUM(movement_type = 'Stock-Out') AS stock_out_rows,
       SUM(movement_type = 'Stock-In' AND remarks = 'Opening Inventory') AS opening_rows,
       SUM(movement_type = 'Stock-In' AND supplier_reference IS NOT NULL AND TRIM(supplier_reference) <> '') AS referenced_stock_in_rows
     FROM inventory_movements`
  );

  const [duplicateReceiving] = await connection.query(
    `SELECT receiving_request_id, COUNT(*) AS row_count
     FROM inventory_movements
     WHERE receiving_request_id IS NOT NULL
     GROUP BY receiving_request_id
     HAVING COUNT(*) > 1`
  );

  console.log('Read-only supplier-reference Stock-In verification passed.');
  console.log(`Database: ${databaseName}`);
  console.log(`Column: ${column.COLUMN_TYPE}, nullable=${column.IS_NULLABLE}`);
  console.log(`Inventory movement rows: ${Number(totals.movement_rows || 0)}`);
  console.log(`Stock-In rows: ${Number(totals.stock_in_rows || 0)}`);
  console.log(`Opening Inventory rows: ${Number(totals.opening_rows || 0)}`);
  console.log(`Stock-Out rows: ${Number(totals.stock_out_rows || 0)}`);
  console.log(`Stock-In rows already carrying supplier references: ${Number(totals.referenced_stock_in_rows || 0)}`);
  console.log(`Duplicate receiving request IDs: ${duplicateReceiving.length}`);

  if (duplicateReceiving.length > 0) {
    throw new Error('Duplicate receiving request IDs were found; stop before further testing.');
  }
} catch (error) {
  console.error('Supplier-reference Stock-In verification failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
