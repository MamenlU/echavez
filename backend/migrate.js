import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'echavez_web',
        multipleStatements: true
    });

    try {
        const sql = fs.readFileSync('../project/schema.sql', 'utf8');
        console.log('Running schema.sql...');
        await pool.query(sql);
        console.log('Migration successful! Tables created and seeded.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

runMigration();
