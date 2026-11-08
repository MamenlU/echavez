-- Rayjin Hardware — Phase 1 schema rollback
-- USE ONLY if you have decided to remove Phase 1 code as well.
-- This removes only Phase 1 metadata columns/index. It does NOT reverse stock adjustments that were already made.
-- If live adjustments have been recorded, restore your database backup instead of using this as a financial/inventory reversal.

DROP INDEX IF EXISTS uq_inventory_adjustment_request ON inventory_movements;

ALTER TABLE inventory_movements
  DROP COLUMN IF EXISTS adjustment_request_id;

ALTER TABLE inventory_movements
  DROP COLUMN IF EXISTS movement_reason;
