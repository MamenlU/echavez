SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS current_table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('cashier_shifts');

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND ((table_name = 'sales' AND column_name = 'shift_id')
    OR (table_name = 'sale_adjustments' AND column_name = 'shift_id'));
