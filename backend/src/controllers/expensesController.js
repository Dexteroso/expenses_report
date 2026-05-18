const { Op, fn, col, where: sequelizeWhere } = require('sequelize');
const Account = require('../models/sequelize/Account');
const Category = require('../models/sequelize/Category');
const Concept = require('../models/sequelize/Concept');
const Expense = require('../models/sequelize/Expense');
const FavoriteMovement = require('../models/sequelize/FavoriteMovement');
const { logActivity } = require('../utils/activityLogger');
const { markUserOnboardingCompleted } = require('../utils/onboardingStatus');
const {
    isIntegerValue,
    isPositiveNumberValue,
    sanitizeOptionalTextValue,
    isValidDateValue,
    isValidMonthValue,
} = require('../utils/validators');

const MAX_EXPENSE_QUERY_LIMIT = 100;

const validateExpensePayload = ({
    date,
    type,
    category_id,
    concept_id,
    description,
    amount,
    account_id,
}) => {
    if (!date || !type || !category_id || !concept_id || amount === undefined || !account_id) {
        return 'Missing required fields';
    }

    if (!isValidDateValue(date)) {
        return 'date must be a valid date';
    }

    if (!['income', 'expense'].includes(type)) {
        return 'type must be income or expense';
    }

    if (!isIntegerValue(category_id)) {
        return 'category_id must be an integer';
    }

    if (!isIntegerValue(concept_id)) {
        return 'concept_id must be an integer';
    }

    if (!isIntegerValue(account_id)) {
        return 'account_id must be an integer';
    }

    if (description !== undefined && typeof description !== 'string') {
        return 'description must be a string';
    }

    if (!isPositiveNumberValue(amount)) {
        return 'amount must be greater than 0';
    }

    return null;
};

const validateExpenseQuery = ({
    year,
    month,
    start_date,
    end_date,
    category_id,
    concept_id,
    account_id,
    type,
    limit,
}) => {
    if (year && !isIntegerValue(year)) {
        return 'year must be an integer';
    }

    if (month && !isValidMonthValue(month)) {
        return 'month must be between 1 and 12';
    }

    if (start_date && !isValidDateValue(start_date)) {
        return 'start_date must be a valid date';
    }

    if (end_date && !isValidDateValue(end_date)) {
        return 'end_date must be a valid date';
    }

    if (category_id && !isIntegerValue(category_id)) {
        return 'category_id must be an integer';
    }

    if (concept_id && !isIntegerValue(concept_id)) {
        return 'concept_id must be an integer';
    }

    if (account_id && !isIntegerValue(account_id)) {
        return 'account_id must be an integer';
    }

    if (type && !['income', 'expense'].includes(type)) {
        return 'type must be income or expense';
    }

    if (limit && (!isIntegerValue(limit) || Number(limit) <= 0)) {
        return 'limit must be a positive integer';
    }

    return null;
};

const getNextExpenseCode = async () => {
    const captureDate = new Date();
    const captureYear = String(captureDate.getFullYear()).slice(-2);
    const expenseCodePrefix = `EX${captureYear}`;

    const lastExpenseRow = await Expense.findOne({
        attributes: ['expense_code'],
        where: {
            expense_code: {
                [Op.regexp]: `^${expenseCodePrefix}[0-9]{4}$`,
            },
        },
        order: [['expense_code', 'DESC']],
        raw: true,
    });

    let nextSequence = 1;

    if (lastExpenseRow) {
        const lastExpenseCode = lastExpenseRow.expense_code;
        const lastSequence = Number(lastExpenseCode.slice(expenseCodePrefix.length));
        nextSequence = lastSequence + 1;
    }

    const sequenceCode = String(nextSequence).padStart(4, '0');

    return `${expenseCodePrefix}${sequenceCode}`;
};

const expenseIncludes = [
    {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'type'],
        required: true,
    },
    {
        model: Concept,
        as: 'concept',
        attributes: ['id', 'name'],
        required: true,
    },
    {
        model: Account,
        as: 'account',
        attributes: [
            'id',
            'account_alias',
            'created_at',
            'billing_cycle_end_day',
            'account_type',
        ],
        required: false,
    },
];

const getFavoriteActivityDetails = async (favoriteId, userId) => {
    if (!isIntegerValue(favoriteId)) {
        return null;
    }

    const favorite = await FavoriteMovement.findOne({
        attributes: ['id', 'alias', 'type', 'description'],
        include: [
            {
                model: Category,
                as: 'category',
                attributes: ['name'],
                required: false,
            },
            {
                model: Concept,
                as: 'concept',
                attributes: ['name'],
                required: false,
            },
            {
                model: Account,
                as: 'account',
                attributes: ['account_alias'],
                required: false,
            },
        ],
        where: {
            id: Number(favoriteId),
            user_id: userId,
        },
    });

    return favorite?.get({ plain: true }) || null;
};

const buildFavoriteActivityMetadata = (favorite, expense = {}) => ({
    favoriteAlias: favorite.alias,
    categoryName: favorite.category?.name,
    conceptName: favorite.concept?.name,
    type: favorite.type,
    accountAlias: favorite.account?.account_alias,
    description: favorite.description,
    expenseId: expense.id,
    expenseCode: expense.expense_code,
});

const formatDateOnly = (value) => {
    if (!value) {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
};

const getLocalizedAccountType = (accountType) => {
    if (accountType === 'credit') return 'Crédito';
    if (accountType === 'debit') return 'Débito';
    if (accountType === 'cash') return 'Efectivo';
    if (accountType === 'transfer') return 'Transferencia';
    if (accountType === 'investment') return 'Inversión';

    return 'Otro';
};

const formatExpenseRow = (expense) => {
    const row = typeof expense.get === 'function' ? expense.get({ plain: true }) : expense;

    return {
        id: row.id,
        expense_code: row.expense_code,
        date: formatDateOnly(row.date),
        type: row.type,
        tipo: row.type === 'income' ? 'Ingreso' : 'Egreso',
        category_id: row.category_id,
        category: row.category?.name,
        concept_id: row.concept_id,
        concept: row.concept?.name,
        description: row.description,
        amount: row.amount,
        account_id: row.account_id,
        account_alias: row.account?.account_alias,
        created_at: row.account?.created_at,
        billing_cycle_end_day: row.account?.billing_cycle_end_day,
        account_type: getLocalizedAccountType(row.account?.account_type),
    };
};

const getExpenseActivityDetails = async (expenseId, userId) => {
    try {
        const expense = await Expense.findOne({
            include: expenseIncludes,
            where: {
                id: expenseId,
                user_id: userId,
            },
        });

        if (!expense) {
            return {};
        }

        const row = formatExpenseRow(expense);

        return {
            ...row,
            category: row.category,
            concept: row.concept,
        };
    } catch (error) {
        console.warn('Could not load expense activity metadata:', error.message);
        return {};
    }
};

const normalizeDateValue = (value) => {
    if (!value) {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
};

const buildExpenseChangedFields = (beforeExpense, afterExpense) => {
    const comparisons = [
        {
            field: 'date',
            from: normalizeDateValue(beforeExpense.date),
            to: normalizeDateValue(afterExpense.date),
        },
        { field: 'type', from: beforeExpense.type, to: afterExpense.type },
        {
            field: 'category',
            from: beforeExpense.category,
            to: afterExpense.category,
        },
        {
            field: 'concept',
            from: beforeExpense.concept,
            to: afterExpense.concept,
        },
        {
            field: 'description',
            from: beforeExpense.description || '',
            to: afterExpense.description || '',
        },
        {
            field: 'amount',
            from: Number(beforeExpense.amount || 0),
            to: Number(afterExpense.amount || 0),
        },
        {
            field: 'account',
            from: beforeExpense.account_alias,
            to: afterExpense.account_alias,
        },
    ];

    return comparisons.filter(({ from, to }) => from !== to);
};

const createExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            date,
            type,
            category_id,
            concept_id,
            description,
            amount,
            account_id,
            source_favorite_id,
        } = req.body;

        const validationError = validateExpensePayload({
            date,
            type,
            category_id,
            concept_id,
            description,
            amount,
            account_id,
        });

        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const normalizedAmount = Number(amount);
        const sanitizedDescription = sanitizeOptionalTextValue(description);

        const expenseCode = await getNextExpenseCode();

        const expense = await Expense.create({
            expense_code: expenseCode,
            user_id: userId,
            date,
            type,
            category_id,
            concept_id,
            description: sanitizedDescription,
            amount: normalizedAmount,
            account_id,
        });

        const activityDetails = await getExpenseActivityDetails(expense.id, userId);
        const favoriteDetails = await getFavoriteActivityDetails(source_favorite_id, userId);

        await markUserOnboardingCompleted(userId);

        logActivity({
            user: req.user,
            eventType: 'expense.created',
            entityType: 'expense',
            entityId: expense.id,
            description: 'Expense created',
            metadata: {
                expenseCode,
                categoryName: activityDetails.category,
                conceptName: activityDetails.concept,
                amount: normalizedAmount,
                accountAlias: activityDetails.account_alias,
                description: sanitizedDescription,
                date,
                type,
            },
        });

        if (favoriteDetails) {
            logActivity({
                user: req.user,
                eventType: 'favorite.used',
                entityType: 'favorite',
                entityId: Number(favoriteDetails.id),
                description: 'Favorite movement used',
                metadata: buildFavoriteActivityMetadata(favoriteDetails, {
                    id: expense.id,
                    expense_code: expenseCode,
                }),
            });
        }

        res.status(201).json({
            message: 'Expense created successfully',
            expense_id: expense.id,
            expense_code: expenseCode,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating expense' });
    }
};

const getExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      year,
      month,
      start_date,
      end_date,
      category_id,
      concept_id,
      account_id,
      type,
      limit,
    } = req.query;

    const where = {
      user_id: userId,
    };
    const andConditions = [];
    const validationError = validateExpenseQuery(req.query);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (year) {
      andConditions.push(sequelizeWhere(fn('YEAR', col('Expense.date')), Number(year)));
    }

    if (month) {
      andConditions.push(sequelizeWhere(fn('MONTH', col('Expense.date')), Number(month)));
    }

    if (start_date) {
      where.date = {
        ...(where.date || {}),
        [Op.gte]: start_date,
      };
    }

    if (end_date) {
      where.date = {
        ...(where.date || {}),
        [Op.lte]: end_date,
      };
    }

    if (category_id) {
      where.category_id = Number(category_id);
    }

    if (concept_id) {
      where.concept_id = Number(concept_id);
    }

    if (account_id) {
      where.account_id = Number(account_id);
    }

    if (type) {
      where.type = type;
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const queryOptions = {
      include: expenseIncludes,
      where,
      order: [
        ['date', 'DESC'],
        ['id', 'DESC'],
      ],
    };

    if (limit) {
      queryOptions.limit = Math.min(Number(limit), MAX_EXPENSE_QUERY_LIMIT);
    }

    const rows = await Expense.findAll(queryOptions);

    res.json(rows.map(formatExpenseRow));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching expenses' });
  }
};

const updateExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      date,
      type,
      category_id,
      concept_id,
      description,
      amount,
      account_id,
    } = req.body;

    if (!isIntegerValue(id)) {
      return res.status(400).json({ error: 'Invalid expense id' });
    }

    const validationError = validateExpensePayload({
      date,
      type,
      category_id,
      concept_id,
      description,
      amount,
      account_id,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const normalizedAmount = Number(amount);
    const sanitizedDescription = sanitizeOptionalTextValue(description);
    const beforeDetails = await getExpenseActivityDetails(id, userId);

    const [affectedRows] = await Expense.update(
      {
        date,
        type,
        category_id,
        concept_id,
        description: sanitizedDescription,
        amount: normalizedAmount,
        account_id,
      },
      {
        where: {
          id,
          user_id: userId,
        },
      }
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const activityDetails = await getExpenseActivityDetails(id, userId);

    logActivity({
      user: req.user,
      eventType: 'expense.updated',
      entityType: 'expense',
      entityId: Number(id),
      description: 'Expense updated',
      metadata: {
        expenseCode: activityDetails.expense_code,
        categoryName: activityDetails.category,
        conceptName: activityDetails.concept,
        amount: Number(activityDetails.amount ?? amount),
        accountAlias: activityDetails.account_alias,
        description: sanitizedDescription,
        date,
        type,
        changedFields: buildExpenseChangedFields(beforeDetails, activityDetails),
      },
    });

    res.json({ message: 'Expense updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating expense' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!isIntegerValue(id)) {
      return res.status(400).json({ error: 'Invalid expense id' });
    }

    const activityDetails = await getExpenseActivityDetails(id, userId);

    const deletedRows = await Expense.destroy({
      where: {
        id,
        user_id: userId,
      },
    });

    if (deletedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    logActivity({
      user: req.user,
      eventType: 'expense.deleted',
      entityType: 'expense',
      entityId: Number(id),
      description: 'Expense deleted',
      metadata: {
        expenseCode: activityDetails.expense_code,
        categoryName: activityDetails.category,
        conceptName: activityDetails.concept,
        amount: Number(activityDetails.amount || 0),
        accountAlias: activityDetails.account_alias,
        description: activityDetails.description,
        date: activityDetails.date,
        type: activityDetails.type,
      },
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting expense' });
  }
};

module.exports = {
    createExpense,
    getExpenses,
    updateExpense,
    deleteExpense,
};
