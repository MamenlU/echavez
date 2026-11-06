SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name = 'expenses';

SELECT column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'cashier_shifts'
  AND column_name = 'cash_expenses_amount';
