ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE accounts
  MODIFY COLUMN account_alias VARCHAR(120)
  GENERATED ALWAYS AS (
    CASE
      WHEN is_system THEN bank_name
      ELSE CONCAT(bank_name, _utf8mb4'_', last_four)
    END
  ) STORED;

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
