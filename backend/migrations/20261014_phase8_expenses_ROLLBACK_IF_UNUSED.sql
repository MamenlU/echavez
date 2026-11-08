-- Phase 8 rollback — use only if no real expense records need to be preserved.
-- Back up the database before running.

ALTER TABLE cashier_shifts
  DROP COLUMN IF EXISTS cash_expenses_amount;

DROP TABLE IF EXISTS expenses;
