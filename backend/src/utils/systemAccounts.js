const pool = require('../config/db');

let hasIsSystemColumn;

const CASH_ACCOUNT = {
  bankName: 'Efectivo',
  lastFour: '0000',
  accountType: 'cash',
};

const checkIsSystemColumn = async () => {
  if (hasIsSystemColumn !== undefined) {
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
  if (!(await checkIsSystemColumn())) {
    return;
  }

  await pool.query(
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
    SELECT ?, ?, ?, ?, NULL, true, true
    WHERE NOT EXISTS (
      SELECT 1
      FROM accounts
      WHERE user_id = ?
        AND is_system = true
        AND account_type = 'cash'
      LIMIT 1
    )
    `,
    [
      userId,
      CASH_ACCOUNT.bankName,
      CASH_ACCOUNT.lastFour,
      CASH_ACCOUNT.accountType,
      userId,
    ]
  );
};

module.exports = {
  checkIsSystemColumn,
  ensureSystemCashAccountForUser,
};
