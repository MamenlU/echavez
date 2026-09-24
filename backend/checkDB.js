import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkProducts() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'echavez_web'
    });

    try {
        const [rows] = await pool.query('SELECT * FROM products');
        console.log('Products in DB:', rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkProducts();
