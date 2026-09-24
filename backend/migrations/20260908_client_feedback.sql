-- Rayjin Hardware client-feedback migration
-- Run this once in phpMyAdmin against the echavez_web database BEFORE restarting the apps.
-- This migration is additive: it does not delete existing orders, sales, products, or users.

USE echavez_web;

-- Persist the customer's primary and supporting address information.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS address TEXT NULL AFTER phone_number,
    ADD COLUMN IF NOT EXISTS supporting_address TEXT NULL AFTER address;

-- Extend the existing order workflow without changing existing order IDs or relationships.
ALTER TABLE orders
    MODIFY COLUMN status ENUM(
        'pending',
        'awaiting_payment',
        'approved',
        'processing',
        'ready',
        'out_for_delivery',
        'failed_delivery',
        'deactivated',
        'completed',
        'cancelled',
        'rejected'
    ) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total,
    ADD COLUMN IF NOT EXISTS previous_status VARCHAR(30) NULL AFTER status;

-- Preserve status transitions and Admin notes for defense-ready traceability.
CREATE TABLE IF NOT EXISTS order_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    from_status VARCHAR(30) NULL,
    to_status VARCHAR(30) NOT NULL,
    admin_id INT NULL,
    note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_status_history_order (order_id, created_at),
    CONSTRAINT fk_order_status_history_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_status_history_admin
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Enforce the uniqueness already checked by the Add Product screen/API.
-- Multiple NULL values remain allowed for products that do not use a barcode.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS status
        ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER brand,
    ADD UNIQUE INDEX IF NOT EXISTS uq_products_barcode (barcode);

-- Store receiving receipts without changing the existing inventory audit relationship.
ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS receipt_path MEDIUMTEXT NULL AFTER remarks,
    ADD COLUMN IF NOT EXISTS receiving_request_id VARCHAR(64) NULL AFTER receipt_path,
    ADD UNIQUE INDEX IF NOT EXISTS uq_inventory_receiving_request (receiving_request_id);

-- Capture the fulfillment and delivery details of Admin POS transactions.
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS fulfillment ENUM('pickup', 'delivery') NULL AFTER sales_source,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NULL AFTER payment_status,
    ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_amount,
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150) NULL AFTER delivery_fee,
    ADD COLUMN IF NOT EXISTS delivery_contact_person VARCHAR(150) NULL AFTER customer_name,
    ADD COLUMN IF NOT EXISTS delivery_contact_number VARCHAR(30) NULL AFTER delivery_contact_person,
    ADD COLUMN IF NOT EXISTS delivery_barangay VARCHAR(100) NULL AFTER delivery_contact_number,
    ADD COLUMN IF NOT EXISTS delivery_address TEXT NULL AFTER delivery_barangay,
    ADD COLUMN IF NOT EXISTS delivery_landmark VARCHAR(255) NULL AFTER delivery_address;
