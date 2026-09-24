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
      ALTER TABLE products ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'
    `);
    console.log('Column "status" added successfully to "products" table!');
  } catch (err) {
    console.log('Notice/Error:', err.message);
  } finally {
    await connection.end();
  }
}
run();
