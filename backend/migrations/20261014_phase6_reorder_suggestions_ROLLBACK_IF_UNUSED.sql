-- Use only if Phase 6 has not been relied upon and you intentionally want to remove the lead-time metadata.
ALTER TABLE suppliers
  DROP COLUMN IF EXISTS lead_time_days;
