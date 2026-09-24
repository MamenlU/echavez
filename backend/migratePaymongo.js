/**
 * migratePaymongo.js
 * 
 * Run this ONCE to update the DB schema for PayMongo payment integration:
 *   node migratePaymongo.js
 * 
 * What it does:
 *  1. Adds 'awaiting_payment' and 'cancelled' to the orders.status ENUM
 *  2. Adds a paymongo_link_id column to orders for tracking PayMongo links
 */

import pool from './db.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    console.log('🔄 Running PayMongo schema migration...\n');

    try {
        // 1. Modify orders.status ENUM to include new values
        console.log("→ Adding 'awaiting_payment' and 'cancelled' to orders.status ENUM...");
        await pool.query(`
            ALTER TABLE orders 
            MODIFY COLUMN status 
            ENUM('pending', 'processing', 'ready', 'completed', 'awaiting_payment', 'cancelled') 
            NOT NULL DEFAULT 'pending'
        `);
        console.log('   ✅ orders.status ENUM updated.\n');

        // 2. Add paymongo_link_id column (if it doesn't exist)
        console.log('→ Adding paymongo_link_id column to orders...');
        try {
            await pool.query(`
                ALTER TABLE orders 
                ADD COLUMN paymongo_link_id VARCHAR(100) NULL DEFAULT NULL
            `);
            console.log('   ✅ paymongo_link_id column added.\n');
        } catch (colErr) {
            if (colErr.code === 'ER_DUP_FIELDNAME') {
                console.log('   ℹ️  paymongo_link_id already exists, skipping.\n');
            } else {
                throw colErr;
            }
        }

        console.log('✅ Migration complete! Your DB is ready for PayMongo payments.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
