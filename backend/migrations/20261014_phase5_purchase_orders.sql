-- Phase 5: Purchase Orders + Partial Goods Receiving
-- Additive migration only. Existing sales, orders, payments, products, and inventory rows are preserved.

CREATE TABLE IF NOT EXISTS purchase_orders (
  purchase_order_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  po_number VARCHAR(40) NOT NULL,
  supplier_id INT NOT NULL,
  status ENUM('Draft','Ordered','Partially Received','Received','Cancelled') NOT NULL DEFAULT 'Draft',
  expected_delivery_date DATE NULL,
  notes VARCHAR(500) NULL,
  created_by_admin_id INT NOT NULL,
  ordered_by_admin_id INT NULL,
  cancelled_by_admin_id INT NULL,
  ordered_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (purchase_order_id),
  UNIQUE KEY uq_purchase_orders_number (po_number),
  KEY idx_purchase_orders_supplier_status (supplier_id, status),
  KEY idx_purchase_orders_status_created (status, created_at),
  KEY idx_purchase_orders_created_by (created_by_admin_id),
  KEY idx_purchase_orders_ordered_by (ordered_by_admin_id),
  KEY idx_purchase_orders_cancelled_by (cancelled_by_admin_id),
  CONSTRAINT fk_purchase_orders_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id) ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_orders_created_by
    FOREIGN KEY (created_by_admin_id) REFERENCES users (id) ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_orders_ordered_by
    FOREIGN KEY (ordered_by_admin_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_orders_cancelled_by
    FOREIGN KEY (cancelled_by_admin_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  purchase_order_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  product_id INT NOT NULL,
  ordered_quantity INT NOT NULL,
  expected_unit_cost DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (purchase_order_item_id),
  UNIQUE KEY uq_purchase_order_product (purchase_order_id, product_id),
  KEY idx_purchase_order_items_product (product_id),
  CONSTRAINT fk_purchase_order_items_order
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (purchase_order_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS purchase_order_item_id BIGINT UNSIGNED NULL AFTER sale_adjustment_item_id;

CREATE INDEX IF NOT EXISTS idx_inventory_purchase_order_item
  ON inventory_movements (purchase_order_item_id);

-- Add the FK only when it does not already exist so re-running the migration is safe.
DROP PROCEDURE IF EXISTS phase5_add_inventory_po_fk;
DELIMITER $$
CREATE PROCEDURE phase5_add_inventory_po_fk()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_inventory_purchase_order_item'
  ) THEN
    ALTER TABLE inventory_movements
      ADD CONSTRAINT fk_inventory_purchase_order_item
      FOREIGN KEY (purchase_order_item_id)
      REFERENCES purchase_order_items (purchase_order_item_id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$
DELIMITER ;
CALL phase5_add_inventory_po_fk();
DROP PROCEDURE phase5_add_inventory_po_fk;
