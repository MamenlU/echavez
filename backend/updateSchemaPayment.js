import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'echavez_web'
  });
  try {
    await connection.query(`
      ALTER TABLE orders MODIFY COLUMN payment_method ENUM('paymongo', 'cash', 'card', 'gcash') NOT NULL
    `);
    console.log('Column "payment_method" updated successfully in "orders" table!');
  } catch (err) {
    console.log('Error modifying table column:', err.message);
  } finally {
    await connection.end();
  }
}
run();
