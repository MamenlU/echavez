-- Rayjin Hardware — Phase 1 Inventory Integrity migration
-- Target: existing MariaDB/MySQL database used by the verified Rayjin Hardware project.
-- ADDITIVE ONLY: no table is dropped, no existing row is deleted, and no stock quantity is changed.
-- Run only after backing up the database and running the preflight script.

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS movement_reason VARCHAR(50) NULL AFTER movement_type;

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS adjustment_request_id VARCHAR(64) NULL AFTER receiving_request_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_adjustment_request
  ON inventory_movements (adjustment_request_id);
