import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Uses DATABASE_URL (Railway) if set, otherwise local
const DATABASE_URL = process.env.LEGACY_MYSQL_DATABASE_URL;

if (!DATABASE_URL) throw new Error('LEGACY_MYSQL_DATABASE_URL is required.');

async function run() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connected to Railway MySQL!');

  try {
    // Drop existing tables to avoid conflict with template/previous databases
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS notifications');
    await connection.query('DROP TABLE IF EXISTS reports');
    await connection.query('DROP TABLE IF EXISTS order_items');
    await connection.query('DROP TABLE IF EXISTS orders');
    await connection.query('DROP TABLE IF EXISTS products');
    await connection.query('DROP TABLE IF EXISTS users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🗑️ Dropped conflicting tables (if they existed)');

    await connection.query(`
      CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NULL,
          role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
          first_name VARCHAR(50),
          last_name VARCHAR(50),
          phone_number VARCHAR(20),
          google_id VARCHAR(255) NULL UNIQUE,
          avatar_url VARCHAR(512) NULL,
          status ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
          last_login TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ users table ready');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          category VARCHAR(100) NOT NULL,
          image VARCHAR(255) NOT NULL,
          stock INT NOT NULL DEFAULT 0,
          brand VARCHAR(100) NOT NULL,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ products table ready');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(50) PRIMARY KEY,
          user_id INT NOT NULL,
          total DECIMAL(10, 2) NOT NULL,
          fulfillment ENUM('pickup', 'delivery', 'shop_go') NOT NULL,
          payment_method ENUM('paymongo', 'cash', 'card', 'gcash') NOT NULL,
          status ENUM('pending', 'processing', 'ready', 'completed', 'awaiting_payment', 'cancelled') NOT NULL DEFAULT 'pending',
          paymongo_link_id VARCHAR(100) NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ orders table ready');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id VARCHAR(50) NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ order_items table ready');

    // Seed default admin — use parameterized query to avoid $ interpolation issues
    const adminHash = ['$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'].join('');
    await connection.execute(
      'INSERT INTO users (username, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
      ['admin', 'admin@rayjin.com', adminHash, 'admin', 'System', 'Administrator']
    );
    console.log('✅ Default admin seeded (username: admin, password: password)');

    console.log('\n🎉 Railway database migration complete!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

run();
