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

  const steps = [
    {
      sql: `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER phone_number`,
      msg: 'Column "google_id" added to users table.',
    },
    {
      sql: `ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL AFTER google_id`,
      msg: 'Column "avatar_url" added to users table.',
    },
    {
      sql: `ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL`,
      msg: 'Column "password_hash" made nullable (required for Google-only accounts).',
    },
  ];

  for (const step of steps) {
    try {
      await connection.query(step.sql);
      console.log('✅', step.msg);
    } catch (err) {
      console.log('⚠️  Notice (may already exist):', err.message);
    }
  }

  await connection.end();
  console.log('\nDone! Google auth columns are ready.');
}

run();
