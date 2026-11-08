-- Phase 7 rollback guidance.
-- ONLY use before Phase 7 is used for real POS sales/refunds.
-- First back up the database.

ALTER TABLE sale_adjustments DROP FOREIGN KEY IF EXISTS fk_sale_adjustments_cashier_shift;
ALTER TABLE sales DROP FOREIGN KEY IF EXISTS fk_sales_cashier_shift;
DROP INDEX IF EXISTS idx_sale_adjustments_shift_id ON sale_adjustments;
DROP INDEX IF EXISTS idx_sales_shift_id ON sales;
ALTER TABLE sale_adjustments DROP COLUMN IF EXISTS shift_id;
ALTER TABLE sales DROP COLUMN IF EXISTS shift_id;
DROP TABLE IF EXISTS cashier_shifts;
