const pool = require('../config/db');

let hasIsSystemColumn;

const CASH_ACCOUNT = {
  bankName: 'Efectivo',
  lastFour: '0000',
  accountType: 'cash',
};

const checkIsSystemColumn = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh && hasIsSystemColumn !== undefined) {
    return hasIsSystemColumn;
  }

  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'accounts'
      AND COLUMN_NAME = 'is_system'
    `
  );

  hasIsSystemColumn = Number(rows[0]?.count || 0) > 0;

  return hasIsSystemColumn;
};

const ensureSystemCashAccountForUser = async (userId) => {
  const hasSystemColumn = await checkIsSystemColumn({ forceRefresh: true });

  if (!hasSystemColumn) {
    console.warn('accounts.is_system column is missing. Run backend/sql/system_cash_account_migration.sql before using system cash accounts.');
    return null;
  }

  const [existingRows] = await pool.query(
    `
    SELECT id
    FROM accounts
    WHERE user_id = ?
      AND is_system = true
      AND account_type = 'cash'
    LIMIT 1
    `,
    [userId]
  );

  if (existingRows.length > 0) {
    return existingRows[0];
  }

  const [result] = await pool.query(
    `
    INSERT INTO accounts (
      user_id,
      bank_name,
      last_four,
      account_type,
      billing_cycle_end_day,
      is_active,
      is_system
    )
    VALUES (?, ?, ?, ?, NULL, true, true)
    `,
    [
      userId,
      CASH_ACCOUNT.bankName,
      CASH_ACCOUNT.lastFour,
      CASH_ACCOUNT.accountType,
    ]
  );

  return result;
};

const getSystemCashAccountIdForUser = async (userId) => {
  const hasSystemColumn = await checkIsSystemColumn({ forceRefresh: true });

  if (!hasSystemColumn) {
    console.warn('accounts.is_system column is missing. Run backend/sql/system_cash_account_migration.sql before using system cash accounts.');
    return null;
  }

  await ensureSystemCashAccountForUser(userId);

  const [rows] = await pool.query(
    `
    SELECT id
    FROM accounts
    WHERE user_id = ?
      AND is_active = true
      AND is_system = true
      AND account_type = 'cash'
    ORDER BY id ASC
    LIMIT 1
    `,
    [userId]
  );

  return rows[0]?.id || null;
};

module.exports = {
  checkIsSystemColumn,
  ensureSystemCashAccountForUser,
  getSystemCashAccountIdForUser,
};
