SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SHOW COLUMNS FROM cashier_shifts;
SHOW COLUMNS FROM sales LIKE 'shift_id';
SHOW COLUMNS FROM sale_adjustments LIKE 'shift_id';

SELECT index_name, table_name, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND index_name IN (
    'idx_cashier_shifts_admin_status',
    'idx_sales_shift_id',
    'idx_sale_adjustments_shift_id'
  )
ORDER BY table_name, index_name, seq_in_index;

SELECT constraint_name, table_name, referenced_table_name
FROM information_schema.referential_constraints
WHERE constraint_schema = DATABASE()
  AND constraint_name IN (
    'fk_cashier_shifts_admin',
    'fk_sales_cashier_shift',
    'fk_sale_adjustments_cashier_shift'
  )
ORDER BY constraint_name;

-- Historical compatibility: pre-Phase-7 sales/adjustments are allowed to remain NULL.
SELECT
  SUM(CASE WHEN sales_source = 'Onsite POS' AND shift_id IS NULL THEN 1 ELSE 0 END) AS historical_pos_without_shift,
  SUM(CASE WHEN sales_source = 'Onsite POS' AND shift_id IS NOT NULL THEN 1 ELSE 0 END) AS phase7_pos_with_shift
FROM sales;
