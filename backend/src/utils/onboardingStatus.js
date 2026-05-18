const pool = require('../config/db');

let hasOnboardingCompletedColumn;

const checkOnboardingCompletedColumn = async () => {
  if (hasOnboardingCompletedColumn !== undefined) {
    return hasOnboardingCompletedColumn;
  }

  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'onboarding_completed'
    `
  );

  hasOnboardingCompletedColumn = Number(rows[0]?.count || 0) > 0;

  return hasOnboardingCompletedColumn;
};

const getUserOnboardingCompleted = async (userId) => {
  if (!(await checkOnboardingCompletedColumn())) {
    return false;
  }

  const [rows] = await pool.query(
    `
    SELECT onboarding_completed
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  return Boolean(rows[0]?.onboarding_completed);
};

const markUserOnboardingCompleted = async (userId) => {
  if (!(await checkOnboardingCompletedColumn())) {
    return;
  }

  await pool.query(
    `
    UPDATE users
    SET onboarding_completed = true
    WHERE id = ?
    `,
    [userId]
  );
};

module.exports = {
  getUserOnboardingCompleted,
  markUserOnboardingCompleted,
};
