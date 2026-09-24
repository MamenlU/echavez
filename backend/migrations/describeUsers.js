import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:iKTWIfFrAkPCspNHGTjwmHibpWTYGFaz@hayabusa.proxy.rlwy.net:41315/railway';

async function run() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connected to Railway MySQL!');

  try {
    const [rows] = await connection.query('DESCRIBE users');
    console.log('Users table structure:');
    console.log(rows);
  } catch (err) {
    console.error('Error describing users table:', err.message);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

run();
