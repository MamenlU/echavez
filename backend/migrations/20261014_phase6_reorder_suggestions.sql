-- Phase 6: Formula-Based Inventory Reorder Suggestions
-- Adds supplier lead-time metadata only. No reorder-suggestion table is created.

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS lead_time_days SMALLINT UNSIGNED NULL AFTER address;
