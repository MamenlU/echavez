import 'dotenv/config';
import mysql from 'mysql2/promise';

let pool;

// Railway / cloud providers supply DATABASE_URL as a full connection string.
// mysql2 doesn't have a native `uri` option for createPool, so we parse it manually.
if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    pool = mysql.createPool({
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.replace('/', ''),
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        ssl: process.env.DB_SSL_CA
    ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
    : undefined,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ssl: { rejectUnauthorized: false },
    });
} else {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'echavez_web',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });
}

// Test connection only in local dev — avoid cold-start overhead on Vercel
if (process.env.NODE_ENV !== 'production') {
    pool.getConnection()
        .then(conn => { console.log('Connected to MySQL database!'); conn.release(); })
        .catch(err => console.error('DB connection error:', err.message));
}

export default pool;
