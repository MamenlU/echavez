-- MANUAL REVIEW REQUIRED. DO NOT AUTO-RUN ON PRODUCTION.
-- For the FROZEN system's MySQL/MariaDB database ONLY.
-- Before running: back up the database and confirm users.role is ENUM('customer','admin').
-- Adds one allowed role without changing existing rows, foreign keys or tables.
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('customer','admin','cashier') NOT NULL DEFAULT 'customer';
-- Verify afterward:
-- SHOW COLUMNS FROM `users` LIKE 'role';
-- SELECT role, COUNT(*) FROM `users` GROUP BY role;
-- PostgreSQL/Supabase installations with a text users.role DO NOT need this migration.
