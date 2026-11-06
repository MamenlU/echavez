-- Phase 3 read-only validation queries.
SELECT DATABASE() AS selected_database;

SELECT COUNT(*) AS audit_table_exists
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name = 'audit_logs';

SELECT column_name, column_type, is_nullable, column_key
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;

SELECT index_name, non_unique, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns_in_index
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'audit_logs'
GROUP BY index_name, non_unique
ORDER BY index_name;

SELECT constraint_name, referenced_table_name
FROM information_schema.referential_constraints
WHERE constraint_schema = DATABASE()
  AND table_name = 'audit_logs';

SELECT COUNT(*) AS audit_log_rows FROM audit_logs;

SELECT audit_id, admin_id, action, entity_type, entity_id, summary, reason, created_at
FROM audit_logs
ORDER BY audit_id DESC
LIMIT 20;
