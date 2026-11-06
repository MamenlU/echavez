-- Phase 3 rollback (destructive to Phase 3 audit history only).
-- IMPORTANT: Export/backup audit_logs first if you need to preserve its records.
-- This does not touch the original 15 Rayjin Hardware tables.
DROP TABLE IF EXISTS audit_logs;
