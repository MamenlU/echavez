SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SHOW COLUMNS FROM expenses;
SHOW INDEX FROM expenses;

SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'cashier_shifts'
  AND column_name = 'cash_expenses_amount';

SELECT constraint_name, table_name, referenced_table_name
FROM information_schema.referential_constraints
WHERE constraint_schema = DATABASE()
  AND constraint_name IN (
    'fk_expenses_recorded_by',
    'fk_expenses_voided_by',
    'fk_expenses_cashier_shift'
  )
ORDER BY constraint_name;

SELECT COUNT(*) AS recorded_expenses,
       COALESCE(SUM(amount), 0) AS recorded_expense_total
FROM expenses
WHERE status = 'Recorded';
