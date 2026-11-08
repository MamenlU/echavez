-- Adviser-requested Philippine mobile-number standardization.
-- Canonical stored customer format: +639XXXXXXXXX (13 characters).
-- This migration is intentionally non-destructive: it normalizes only
-- recognizable valid legacy values and does not delete/truncate invalid data.

START TRANSACTION;

-- Convert legacy 09XXXXXXXXX values to +639XXXXXXXXX.
UPDATE users
SET phone_number = CONCAT('+63', SUBSTRING(phone_number, 2))
WHERE phone_number REGEXP '^09[0-9]{9}$';

-- Convert legacy 639XXXXXXXXX values to +639XXXXXXXXX.
UPDATE users
SET phone_number = CONCAT('+', phone_number)
WHERE phone_number REGEXP '^639[0-9]{9}$';

-- +639XXXXXXXXX is exactly 13 characters. Existing invalid legacy values are
-- preserved for manual correction and still fit within VARCHAR(13).
ALTER TABLE users
  MODIFY phone_number VARCHAR(13) DEFAULT NULL;

COMMIT;
