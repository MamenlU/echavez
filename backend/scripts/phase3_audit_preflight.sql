-- Phase 3 preflight: run BEFORE the Phase 3 migration.
-- Read-only. It does not change any data.

SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS current_table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

SELECT COUNT(*) AS audit_logs_already_exists
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name = 'audit_logs';

SELECT COUNT(*) AS admin_accounts
FROM users
WHERE role = 'admin';

SELECT column_name, column_type, is_nullable, column_key
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;
