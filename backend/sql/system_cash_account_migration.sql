SET @has_is_system := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'accounts'
    AND COLUMN_NAME = 'is_system'
);

SET @add_is_system_sql := IF(
  @has_is_system = 0,
  'ALTER TABLE accounts ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false',
  'SELECT "accounts.is_system already exists" AS message'
);

PREPARE add_is_system_stmt FROM @add_is_system_sql;
EXECUTE add_is_system_stmt;
DEALLOCATE PREPARE add_is_system_stmt;

ALTER TABLE accounts
  MODIFY COLUMN account_alias VARCHAR(120)
  GENERATED ALWAYS AS (
    CASE
      WHEN is_system THEN bank_name
      ELSE CONCAT(bank_name, _utf8mb4'_', last_four)
    END
  ) STORED;

UPDATE accounts
SET is_system = true
WHERE account_type = 'cash'
   OR bank_name = 'Efectivo'
   OR account_alias IN ('Efectivo', 'Efectivo_0000');

INSERT INTO accounts (
  user_id,
  bank_name,
  last_four,
  account_type,
  billing_cycle_end_day,
  is_active,
  is_system
)
SELECT
  users.id,
  'Efectivo',
  '0000',
  'cash',
  NULL,
  true,
  true
FROM users
WHERE NOT EXISTS (
  SELECT 1
  FROM accounts
  WHERE accounts.user_id = users.id
    AND accounts.is_system = true
    AND accounts.account_type = 'cash'
);
