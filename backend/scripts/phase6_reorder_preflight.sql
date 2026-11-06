SELECT DATABASE() AS current_database;

SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SELECT column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'suppliers'
  AND column_name = 'lead_time_days';

SELECT supplier_id, supplier_name, status
FROM suppliers
ORDER BY supplier_name;
