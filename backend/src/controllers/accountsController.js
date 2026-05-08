const Account = require('../models/sequelize/Account');
const { logActivity } = require('../utils/activityLogger');

const validateAccountPayload = ({
  bank_name,
  last_four,
  account_type,
  billing_cycle_end_day,
}) => {
  if (!bank_name || !last_four || !account_type) {
    return {
      error: 'bank_name, last_four, and account_type are required',
      normalizedBillingCycleEndDay: null,
    };
  }

  if (!['credit', 'debit'].includes(account_type)) {
    return {
      error: 'account_type must be credit or debit',
      normalizedBillingCycleEndDay: null,
    };
  }

  if (!/^\d{4}$/.test(String(last_four))) {
    return {
      error: 'last_four must be exactly 4 digits',
      normalizedBillingCycleEndDay: null,
    };
  }

  if (account_type === 'credit') {
    const cutoffDay = Number(billing_cycle_end_day);

    if (!Number.isInteger(cutoffDay) || cutoffDay < 1 || cutoffDay > 31) {
      return {
        error: 'billing_cycle_end_day is required for credit accounts and must be between 1 and 31',
        normalizedBillingCycleEndDay: null,
      };
    }

    return {
      error: '',
      normalizedBillingCycleEndDay: cutoffDay,
    };
  }

  return {
    error: '',
    normalizedBillingCycleEndDay: null,
  };
};

const formatDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const formatAccountResponse = (account) => ({
  id: account.id,
  bank_name: account.bank_name,
  last_four: account.last_four,
  account_alias: account.account_alias,
  created_at: formatDateOnly(account.created_at),
  account_type: account.account_type,
  billing_cycle_end_day: account.billing_cycle_end_day,
});

const getAccountActivityDetails = async (accountId, userId) => {
  try {
    const account = await Account.findOne({
      attributes: [
        'id',
        'bank_name',
        'last_four',
        'account_alias',
        'account_type',
        'billing_cycle_end_day',
      ],
      where: {
        id: accountId,
        user_id: userId,
      },
      raw: true,
    });

    return account || {};
  } catch (error) {
    console.warn('Could not load account activity metadata:', error.message);
    return {};
  }
};

const getAccounts = async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await Account.findAll({
      attributes: [
        'id',
        'bank_name',
        'last_four',
        'account_alias',
        'created_at',
        'account_type',
        'billing_cycle_end_day',
      ],
      where: {
        user_id: userId,
        is_active: true,
      },
      order: [['bank_name', 'ASC']],
      raw: true,
    });

    res.json(rows.map(formatAccountResponse));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching accounts' });
  }
};

const createAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bank_name,
      last_four,
      account_type,
      billing_cycle_end_day,
    } = req.body;
    const validationResult = validateAccountPayload({
      bank_name,
      last_four,
      account_type,
      billing_cycle_end_day,
    });

    if (validationResult.error) {
      return res.status(400).json({ error: validationResult.error });
    }

    const account = await Account.create({
      user_id: userId,
      bank_name: String(bank_name).trim(),
      last_four: String(last_four),
      account_type,
      billing_cycle_end_day: validationResult.normalizedBillingCycleEndDay,
    });

    const activityDetails = await getAccountActivityDetails(account.id, userId);

    logActivity({
      user: req.user,
      eventType: 'account.created',
      entityType: 'account',
      entityId: account.id,
      description: 'Account created',
      metadata: {
        accountAlias: activityDetails.account_alias,
        bankName: String(bank_name).trim(),
        lastFour: String(last_four),
        accountType: account_type,
      },
    });

    res.status(201).json({
      message: 'Account created successfully',
      account_id: account.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating account' });
  }
};

const updateAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = Number(req.params.id);
    const {
      bank_name,
      last_four,
      account_type,
      billing_cycle_end_day,
    } = req.body;

    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ error: 'Invalid account id' });
    }

    const validationResult = validateAccountPayload({
      bank_name,
      last_four,
      account_type,
      billing_cycle_end_day,
    });

    if (validationResult.error) {
      return res.status(400).json({ error: validationResult.error });
    }

    const existingAccount = await Account.findOne({
      attributes: ['id'],
      where: {
        id: accountId,
        user_id: userId,
      },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await Account.update(
      {
        bank_name: String(bank_name).trim(),
        last_four: String(last_four),
        account_type,
        billing_cycle_end_day: validationResult.normalizedBillingCycleEndDay,
      },
      {
        where: {
          id: accountId,
          user_id: userId,
        },
      }
    );

    const updatedAccount = await Account.findOne({
      attributes: [
        'id',
        'bank_name',
        'last_four',
        'account_alias',
        'account_type',
        'created_at',
        'billing_cycle_end_day',
      ],
      where: {
        id: accountId,
        user_id: userId,
      },
      raw: true,
    });
    const updatedAccountResponse = formatAccountResponse(updatedAccount);

    logActivity({
      user: req.user,
      eventType: 'account.updated',
      entityType: 'account',
      entityId: accountId,
      description: 'Account updated',
      metadata: {
        accountAlias: updatedAccountResponse.account_alias,
        bankName: updatedAccountResponse.bank_name,
        lastFour: updatedAccountResponse.last_four,
        accountType: updatedAccountResponse.account_type,
      },
    });

    return res.json({
      message: 'Account updated successfully',
      account: updatedAccountResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating account' });
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = Number(req.params.id);

    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ error: 'Invalid account id' });
    }

    const activityDetails = await getAccountActivityDetails(accountId, userId);

    const [affectedRows] = await Account.update(
      {
        is_active: false,
      },
      {
        where: {
          id: accountId,
          user_id: userId,
          is_active: true,
        },
      }
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    logActivity({
      user: req.user,
      eventType: 'account.deactivated',
      entityType: 'account',
      entityId: accountId,
      description: 'Account deactivated',
      metadata: {
        accountAlias: activityDetails.account_alias,
        bankName: activityDetails.bank_name,
        lastFour: activityDetails.last_four,
        accountType: activityDetails.account_type,
      },
    });

    return res.json({
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deactivating account' });
  }
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
};
