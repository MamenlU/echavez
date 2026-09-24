-- Rayjin Stage 1. Run once in the existing echavez_web database after a backup.
-- MariaDB 10.4 compatible. No orders, users, sales, or inventory are deleted.
-- Existing orders remain NULL (unverified); a browser redirect is not evidence.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status
    ENUM('Pending','Paid','Failed','Cancelled') NULL DEFAULT NULL AFTER payment_method;

CREATE TABLE IF NOT EXISTS payments (
    payment_id INT NOT NULL AUTO_INCREMENT,
    order_id VARCHAR(50) NOT NULL,
    gateway_session_id VARCHAR(100) NOT NULL,
    gateway_transaction_id VARCHAR(100) NULL,
    payment_method VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PHP',
    payment_status ENUM('Pending','Paid','Failed','Cancelled') NOT NULL DEFAULT 'Pending',
    livemode TINYINT(1) NOT NULL,
    checkout_url VARCHAR(2048) NULL,
    verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    UNIQUE KEY uq_payment_session (gateway_session_id),
    UNIQUE KEY uq_payment_transaction (gateway_transaction_id),
    KEY idx_payments_order (order_id),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
