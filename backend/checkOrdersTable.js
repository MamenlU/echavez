import pool from './db.js';

async function run() {
  try {
    const [rows] = await pool.query('DESCRIBE orders');
    console.log('Orders Table structure:');
    console.log(rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}
run();
