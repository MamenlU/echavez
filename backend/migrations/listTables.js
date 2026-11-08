import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.LEGACY_MYSQL_DATABASE_URL;

if (!DATABASE_URL) throw new Error('LEGACY_MYSQL_DATABASE_URL is required.');

async function run() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connected to Railway MySQL!');

  try {
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables:');
    console.log(rows);
  } catch (err) {
    console.error('Error listing tables:', err.message);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

run();
