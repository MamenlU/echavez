-- Rayjin Hardware Capstone Expansion — Phase 8
-- Basic Expense Management + Estimated Net Profit
-- Additive migration. Existing sales, shifts, inventory, payments, and reports remain intact.

CREATE TABLE IF NOT EXISTS expenses (
  expense_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  expense_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('Cash Drawer','Card','GCash','Bank Transfer','Other') NOT NULL,
  reference_number VARCHAR(150) DEFAULT NULL,
  recorded_by_admin_id INT NOT NULL,
  shift_id BIGINT UNSIGNED DEFAULT NULL,
  status ENUM('Recorded','Voided') NOT NULL DEFAULT 'Recorded',
  voided_by_admin_id INT DEFAULT NULL,
  void_reason VARCHAR(500) DEFAULT NULL,
  voided_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (expense_id),
  KEY idx_expenses_date_status (expense_date, status),
  KEY idx_expenses_category_date (category, expense_date),
  KEY idx_expenses_recorded_by (recorded_by_admin_id, created_at),
  KEY idx_expenses_shift_id (shift_id),
  KEY idx_expenses_voided_by (voided_by_admin_id),
  CONSTRAINT fk_expenses_recorded_by
    FOREIGN KEY (recorded_by_admin_id) REFERENCES users (id) ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_voided_by
    FOREIGN KEY (voided_by_admin_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_cashier_shift
    FOREIGN KEY (shift_id) REFERENCES cashier_shifts (shift_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE cashier_shifts
  ADD COLUMN IF NOT EXISTS cash_expenses_amount DECIMAL(12,2) DEFAULT NULL AFTER cash_refunds_amount;
