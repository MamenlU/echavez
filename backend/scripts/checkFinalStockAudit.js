import pool from '../db.js';

async function main() {
  try {
    const [columnRows] = await pool.query(
      `SELECT IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'inventory_movements'
         AND COLUMN_NAME = 'supplier_reference'`
    );

    if (!columnRows.length) {
      throw new Error('inventory_movements.supplier_reference is missing. Run the approved Stage A migration first.');
    }

    if (columnRows[0].IS_NULLABLE !== 'YES') {
      throw new Error('supplier_reference must remain nullable/optional.');
    }

    const [duplicateOpeningRows] = await pool.query(
      `SELECT product_id, COUNT(*) AS opening_count
       FROM inventory_movements
       WHERE movement_type = 'Stock-In'
         AND remarks = 'Opening Inventory'
       GROUP BY product_id
       HAVING COUNT(*) > 1`
    );

    const [duplicateReceivingRows] = await pool.query(
      `SELECT receiving_request_id, COUNT(*) AS receipt_count
       FROM inventory_movements
       WHERE receiving_request_id IS NOT NULL
       GROUP BY receiving_request_id
       HAVING COUNT(*) > 1`
    );

    const [summaryRows] = await pool.query(
      `SELECT
         COUNT(*) AS stock_in_count,
         SUM(CASE WHEN remarks = 'Opening Inventory' THEN 1 ELSE 0 END) AS opening_count,
         SUM(CASE WHEN remarks <> 'Opening Inventory' OR remarks IS NULL THEN 1 ELSE 0 END) AS receiving_count,
         SUM(CASE WHEN supplier_reference IS NOT NULL AND TRIM(supplier_reference) <> '' THEN 1 ELSE 0 END) AS with_supplier_reference,
         SUM(CASE WHEN receipt_path IS NOT NULL AND TRIM(receipt_path) <> '' THEN 1 ELSE 0 END) AS with_receipt
       FROM inventory_movements
       WHERE movement_type = 'Stock-In'`
    );

    if (duplicateOpeningRows.length) {
      throw new Error(`Found ${duplicateOpeningRows.length} product(s) with duplicate Opening Inventory Stock-In rows.`);
    }

    if (duplicateReceivingRows.length) {
      throw new Error(`Found ${duplicateReceivingRows.length} duplicated receiving request ID(s).`);
    }

    const summary = summaryRows[0] || {};
    console.log('Final Stock Audit read-only check passed.');
    console.log(`Supplier reference nullable: yes`);
    console.log(`Stock-In movements: ${Number(summary.stock_in_count || 0)}`);
    console.log(`Opening Inventory movements: ${Number(summary.opening_count || 0)}`);
    console.log(`Other Stock Receiving movements: ${Number(summary.receiving_count || 0)}`);
    console.log(`Stock-In rows with supplier reference: ${Number(summary.with_supplier_reference || 0)}`);
    console.log(`Stock-In rows with receipt attachment: ${Number(summary.with_receipt || 0)}`);
    console.log('Duplicate Opening Inventory rows: 0');
    console.log('Duplicate receiving_request_id rows: 0');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Final Stock Audit check failed:', error.message);
  process.exitCode = 1;
});
