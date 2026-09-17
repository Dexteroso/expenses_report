const { Transaction } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const User = require('../models/sequelize/User');

class FinancialError extends Error {
  constructor(status, body) {
    super(body.error || body.code);
    this.status = status;
    this.body = body;
  }
}

// All budget/expense writers lock the same existing user row FIRST. No external
// calls or optional post-save effects may run while this lock is held.
const withFinancialTransaction = async (userId, work) => {
  const transaction = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
  let result;
  try {
    const user = await User.findByPk(userId, { attributes: ['id'], transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw new FinancialError(401, { error: 'Usuario no disponible.' });
    result = await work(transaction);
  } catch (error) {
    try {
      await transaction.rollback();
      error.financialRolledBack = true;
    } catch {
      error.financialRolledBack = false;
    }
    throw error;
  }
  // A lost commit response is ambiguous; never label it as a known rollback.
  await transaction.commit();
  return result;
};

const financialFailure = (res, error, fallback) => {
  if (error instanceof FinancialError && error.financialRolledBack !== false) return res.status(error.status).json({ ...error.body, rolledBack: true });
  console.error(error);
  return res.status(500).json({
    error: fallback,
    code: error.financialRolledBack ? 'FINANCIAL_OPERATION_FAILED' : 'FINANCIAL_OUTCOME_UNKNOWN',
    rolledBack: Boolean(error.financialRolledBack),
  });
};

module.exports = { withFinancialTransaction, FinancialError, financialFailure };
