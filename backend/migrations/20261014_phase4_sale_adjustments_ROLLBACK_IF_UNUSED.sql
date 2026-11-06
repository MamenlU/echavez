-- Rayjin Hardware Phase 4 rollback — ONLY before any live return/refund/void has been recorded.
-- IMPORTANT:
--   1. Back up the database first.
--   2. If sale_adjustments contains ANY row, this script intentionally aborts.
--   3. After live Phase 4 records exist, restore the Phase 3 database backup instead of dropping
--      the adjustment ledger, because returns/voids may already have changed product stock.

DROP PROCEDURE IF EXISTS phase4_rollback_if_unused;
DELIMITER $$
CREATE PROCEDURE phase4_rollback_if_unused()
BEGIN
  DECLARE adjustment_rows BIGINT DEFAULT 0;
  DECLARE movement_rows BIGINT DEFAULT 0;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'sale_adjustments'
  ) THEN
    SELECT COUNT(*) INTO adjustment_rows FROM sale_adjustments;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'inventory_movements'
      AND column_name = 'sale_adjustment_item_id'
  ) THEN
    SELECT COUNT(*) INTO movement_rows
    FROM inventory_movements
    WHERE sale_adjustment_item_id IS NOT NULL;
  END IF;

  IF adjustment_rows > 0 OR movement_rows > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Phase 4 contains live adjustment data. Do not drop it; restore the Phase 3 database backup if a full rollback is required.';
  ELSE
    IF EXISTS (
      SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME = 'fk_inventory_sale_adjustment_item'
    ) THEN
      ALTER TABLE inventory_movements
        DROP FOREIGN KEY fk_inventory_sale_adjustment_item;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'inventory_movements'
        AND index_name = 'uq_inventory_sale_adjustment_item'
    ) THEN
      ALTER TABLE inventory_movements
        DROP INDEX uq_inventory_sale_adjustment_item;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'inventory_movements'
        AND column_name = 'sale_adjustment_item_id'
    ) THEN
      ALTER TABLE inventory_movements
        DROP COLUMN sale_adjustment_item_id;
    END IF;

    DROP TABLE IF EXISTS sale_adjustment_items;
    DROP TABLE IF EXISTS sale_adjustments;
  END IF;
END$$
DELIMITER ;

CALL phase4_rollback_if_unused();
DROP PROCEDURE phase4_rollback_if_unused;
