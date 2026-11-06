-- Phase 7: Cashier Shift and Cash Reconciliation
-- Adds one cashier_shifts table and nullable links from sales/refunds.
-- Historical sales/adjustments remain compatible because shift_id is nullable.

CREATE TABLE IF NOT EXISTS cashier_shifts (
  shift_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id INT NOT NULL,
  opening_cash DECIMAL(12,2) NOT NULL,
  status ENUM('Open','Closed') NOT NULL DEFAULT 'Open',
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME DEFAULT NULL,
  pos_transaction_count INT UNSIGNED DEFAULT NULL,
  cash_sales_amount DECIMAL(12,2) DEFAULT NULL,
  card_sales_amount DECIMAL(12,2) DEFAULT NULL,
  cash_refunds_amount DECIMAL(12,2) DEFAULT NULL,
  expected_cash DECIMAL(12,2) DEFAULT NULL,
  actual_cash DECIMAL(12,2) DEFAULT NULL,
  discrepancy DECIMAL(12,2) DEFAULT NULL,
  notes VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (shift_id),
  KEY idx_cashier_shifts_admin_status (admin_id, status, opened_at),
  KEY idx_cashier_shifts_opened_at (opened_at),
  CONSTRAINT fk_cashier_shifts_admin
    FOREIGN KEY (admin_id) REFERENCES users (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS shift_id BIGINT UNSIGNED NULL AFTER admin_id;

ALTER TABLE sale_adjustments
  ADD COLUMN IF NOT EXISTS shift_id BIGINT UNSIGNED NULL AFTER processed_by_admin_id;

CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON sales (shift_id);
CREATE INDEX IF NOT EXISTS idx_sale_adjustments_shift_id ON sale_adjustments (shift_id);

-- Add foreign keys only if they do not already exist so re-running is safer.
DROP PROCEDURE IF EXISTS phase7_add_shift_foreign_keys;
DELIMITER $$
CREATE PROCEDURE phase7_add_shift_foreign_keys()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_sales_cashier_shift'
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT fk_sales_cashier_shift
      FOREIGN KEY (shift_id) REFERENCES cashier_shifts (shift_id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_sale_adjustments_cashier_shift'
  ) THEN
    ALTER TABLE sale_adjustments
      ADD CONSTRAINT fk_sale_adjustments_cashier_shift
      FOREIGN KEY (shift_id) REFERENCES cashier_shifts (shift_id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$
DELIMITER ;

CALL phase7_add_shift_foreign_keys();
DROP PROCEDURE phase7_add_shift_foreign_keys;
