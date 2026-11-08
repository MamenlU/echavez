-- RAYJIN HARDWARE — MANUAL REVIEW ONLY
-- Target: LOCAL XAMPP database echavez_cashier_test, NOT Supabase PostgreSQL.
-- Run ONLY after a verified backup and confirming this exact database name.
-- This changes the users.role allowed values; it adds NO TABLES or columns.
-- Do not run from backend/migrate.js or from an application request.

SELECT COLUMN_TYPE, COLUMN_DEFAULT FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'echavez_cashier_test' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role';

ALTER TABLE `echavez_cashier_test`.`users`
  MODIFY COLUMN `role`
  ENUM('customer','admin','cashier','super_admin') NOT NULL DEFAULT 'customer';

SELECT COLUMN_TYPE, COLUMN_DEFAULT FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'echavez_cashier_test' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role';

-- IMPORTANT: This SQL intentionally does NOT promote an account.
-- Review INSTALLATION_GUIDE.md for a separately confirmed manual promotion.
-- At least one approved, active Admin must be promoted before Super Admin
-- provisioning, Admin-restricted transactions or approvals can work.
