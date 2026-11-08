-- REFERENCE ONLY for a future PostgreSQL/Supabase migration.
-- DO NOT execute until an actual PostgreSQL sales schema and backend adapter have been verified.
-- This single field does NOT make MySQL-specific Express routes work with Supabase PostgreSQL.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS card_payment_reference VARCHAR(80);
