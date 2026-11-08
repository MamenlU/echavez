// Additive supplier receipt/reference audit field for Stock-In movements.
// No inventory quantities, costs, sales, order statuses, or historical rows are changed.
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

async function hasColumn(tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function inventorySnapshot() {
  const [[row]] = await connection.query(
    `SELECT
       COUNT(*) AS movement_rows,
       COALESCE(SUM(CASE WHEN movement_type = 'Stock-In' THEN quantity ELSE 0 END), 0) AS stock_in_quantity,
       COALESCE(SUM(CASE WHEN movement_type = 'Stock-Out' THEN quantity ELSE 0 END), 0) AS stock_out_quantity
     FROM inventory_movements`
  );
  return {
    movementRows: Number(row.movement_rows || 0),
    stockInQuantity: Number(row.stock_in_quantity || 0),
    stockOutQuantity: Number(row.stock_out_quantity || 0),
  };
}

try {
  console.log(`Running supplier-reference stock-audit migration on: ${databaseName}`);
  const before = await inventorySnapshot();

  if (!(await hasColumn('inventory_movements', 'supplier_reference'))) {
    await connection.query(
      `ALTER TABLE inventory_movements
       ADD COLUMN supplier_reference VARCHAR(120) NULL AFTER receipt_path`
    );
    console.log('Added inventory_movements.supplier_reference.');
  } else {
    console.log('inventory_movements.supplier_reference already exists.');
  }

  const after = await inventorySnapshot();
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`Inventory snapshot changed unexpectedly: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  }

  console.log(`Inventory rows preserved: ${after.movementRows}`);
  console.log(`Stock-In quantity preserved: ${after.stockInQuantity}`);
  console.log(`Stock-Out quantity preserved: ${after.stockOutQuantity}`);
  console.log('Supplier-reference stock-audit migration completed successfully.');
} catch (error) {
  console.error('Supplier-reference stock-audit migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
