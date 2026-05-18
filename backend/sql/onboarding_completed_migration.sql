ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

UPDATE users
SET onboarding_completed = true
WHERE EXISTS (
  SELECT 1
  FROM expenses
  WHERE expenses.user_id = users.id
);
