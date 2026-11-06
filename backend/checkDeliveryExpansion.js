// READ-ONLY preflight for the four-municipality delivery expansion.
// This script performs SELECT queries only. It does not ALTER, UPDATE,
// INSERT, DELETE, DROP, CREATE, or otherwise change the database.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'echavez_web',
});

try {
  console.log(`Database: ${process.env.DB_NAME || 'echavez_web'}`);

  const [rateColumns] = await connection.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'delivery_rates'
     ORDER BY ORDINAL_POSITION`
  );

  const [orderColumns] = await connection.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'orders'
       AND COLUMN_NAME IN (
         'delivery_municipality', 'delivery_barangay',
         'delivery_latitude', 'delivery_longitude'
       )
     ORDER BY ORDINAL_POSITION`
  );

  const [saleColumns] = await connection.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sales'
       AND COLUMN_NAME IN ('delivery_municipality', 'delivery_barangay')
     ORDER BY ORDINAL_POSITION`
  );

  const [indexes] = await connection.query(
    `SELECT INDEX_NAME, NON_UNIQUE,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') AS columns
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'delivery_rates'
     GROUP BY INDEX_NAME, NON_UNIQUE
     ORDER BY INDEX_NAME`
  );

  const [rates] = await connection.query(
    `SELECT id,
            ${rateColumns.some((column) => column.COLUMN_NAME === 'municipality') ? 'municipality,' : "'Initao' AS municipality,"}
            barangay, zone, surcharge, is_active
     FROM delivery_rates
     ORDER BY barangay ASC`
  );

  console.log('\nDELIVERY_RATES COLUMNS');
  console.table(rateColumns);
  console.log('\nORDERS DELIVERY COLUMNS');
  console.table(orderColumns);
  console.log('\nSALES DELIVERY COLUMNS');
  console.table(saleColumns);
  console.log('\nDELIVERY_RATES INDEXES');
  console.table(indexes);
  console.log('\nCURRENT CONFIGURED DELIVERY RATES (READ ONLY)');
  console.table(rates);
  console.log('\nPreflight completed. No database changes were made.');
} finally {
  await connection.end();
}
