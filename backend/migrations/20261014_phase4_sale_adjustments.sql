-- Rayjin Hardware Capstone Expansion — Phase 4
-- Returns, Refunds, and Sales Voids
-- Additive migration. Existing sales/orders/payments are not rewritten.

CREATE TABLE IF NOT EXISTS sale_adjustments (
  adjustment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id INT NOT NULL,
  adjustment_type ENUM('Return','Void') NOT NULL,
  reason VARCHAR(500) NOT NULL,
  merchandise_refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  service_fee_refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  delivery_fee_refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  refund_method ENUM('Cash','Card','GCash','PayMongo','Other') NOT NULL,
  refund_reference VARCHAR(150) DEFAULT NULL,
  external_refund_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  processed_by_admin_id INT NOT NULL,
  adjustment_request_id VARCHAR(64) NOT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (adjustment_id),
  UNIQUE KEY uq_sale_adjustment_request (adjustment_request_id),
  KEY idx_sale_adjustments_sale_processed (sale_id, processed_at),
  KEY idx_sale_adjustments_admin_processed (processed_by_admin_id, processed_at),
  KEY idx_sale_adjustments_type_processed (adjustment_type, processed_at),
  CONSTRAINT fk_sale_adjustments_sale
    FOREIGN KEY (sale_id) REFERENCES sales (sale_id) ON UPDATE CASCADE,
  CONSTRAINT fk_sale_adjustments_admin
    FOREIGN KEY (processed_by_admin_id) REFERENCES users (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS sale_adjustment_items (
  adjustment_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  adjustment_id BIGINT UNSIGNED NOT NULL,
  sale_item_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_refund_amount DECIMAL(12,2) NOT NULL,
  refund_subtotal DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  restockable TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (adjustment_item_id),
  UNIQUE KEY uq_sale_adjustment_line (adjustment_id, sale_item_id),
  KEY idx_sale_adjustment_items_sale_item (sale_item_id),
  KEY idx_sale_adjustment_items_product (product_id),
  CONSTRAINT fk_sale_adjustment_items_adjustment
    FOREIGN KEY (adjustment_id) REFERENCES sale_adjustments (adjustment_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sale_adjustment_items_sale_item
    FOREIGN KEY (sale_item_id) REFERENCES sale_items (sale_item_id) ON UPDATE CASCADE,
  CONSTRAINT fk_sale_adjustment_items_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS sale_adjustment_item_id BIGINT UNSIGNED NULL AFTER adjustment_request_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_sale_adjustment_item
  ON inventory_movements (sale_adjustment_item_id);

-- Add the FK only when it does not already exist. This makes re-running the migration safer.
DROP PROCEDURE IF EXISTS phase4_add_inventory_adjustment_fk;
DELIMITER $$
CREATE PROCEDURE phase4_add_inventory_adjustment_fk()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_inventory_sale_adjustment_item'
  ) THEN
    ALTER TABLE inventory_movements
      ADD CONSTRAINT fk_inventory_sale_adjustment_item
      FOREIGN KEY (sale_adjustment_item_id)
      REFERENCES sale_adjustment_items (adjustment_item_id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$
DELIMITER ;
CALL phase4_add_inventory_adjustment_fk();
DROP PROCEDURE phase4_add_inventory_adjustment_fk;
