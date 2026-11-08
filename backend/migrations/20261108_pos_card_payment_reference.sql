-- Rayjin Hardware: optional reference to an EXTERNALLY confirmed physical card-terminal transaction.
-- Intended for the LOCAL MySQL/MariaDB database, after making a backup.
-- Idempotent on both MySQL 8 and MariaDB (no support for ADD COLUMN IF NOT EXISTS required).
-- This field does not contain a card number, CVV, PIN, or gateway secret.
SET @rayjin_column_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales'
    AND COLUMN_NAME = 'card_payment_reference'
);
SET @rayjin_ddl = IF(@rayjin_column_exists = 0,
  'ALTER TABLE `sales` ADD COLUMN `card_payment_reference` VARCHAR(80) NULL AFTER `change_amount`',
  'SELECT ''POS card reference already exists'' AS migration_status'
);
PREPARE rayjin_pos_ddl FROM @rayjin_ddl;
EXECUTE rayjin_pos_ddl;
DEALLOCATE PREPARE rayjin_pos_ddl;
