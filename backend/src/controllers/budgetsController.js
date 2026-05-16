const { sequelize } = require('../config/sequelize');
const Budget = require('../models/sequelize/Budget');
const Category = require('../models/sequelize/Category');
const Concept = require('../models/sequelize/Concept');
const { logActivity } = require('../utils/activityLogger');
const {
  isIntegerValue,
  isNonNegativeNumberValue,
  isValidMonthValue,
} = require('../utils/validators');

const months = Array.from({ length: 12 }, (_, index) => index + 1);

const validateBudgetPayload = (year, items) => {
  if (!isIntegerValue(year)) {
    return 'year must be an integer';
  }

  if (!Array.isArray(items)) {
    return 'items must be an array';
  }

  for (const item of items) {
    if (!isIntegerValue(item?.concept_id)) {
      return 'Each budget item must include an integer concept_id';
    }

    if (!isValidMonthValue(item?.month)) {
      return 'Each budget item month must be between 1 and 12';
    }

    if (!isNonNegativeNumberValue(item?.amount)) {
      return 'Each budget item amount must be greater than or equal to 0';
    }
  }

  return null;
};

const getBudgetChangeDetails = async (transaction, userId, year, items) => {
  const changes = [];

  for (const item of items) {
    const concept = await Concept.findOne({
      attributes: ['id', 'name', 'category_id'],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['name'],
          required: true,
        },
        {
          model: Budget,
          as: 'budgets',
          attributes: ['amount'],
          required: false,
          where: {
            user_id: userId,
            year,
            month: item.month,
          },
        },
      ],
      where: {
        id: item.concept_id,
      },
      transaction,
    });

    const plainConcept = concept?.get({ plain: true }) || {};
    const oldAmount = Number(plainConcept.budgets?.[0]?.amount || 0);
    const newAmount = Number(item.amount) || 0;

    changes.push({
      year,
      month: Number(item.month),
      conceptId: Number(item.concept_id),
      categoryName: plainConcept.category?.name,
      conceptName: plainConcept.name,
      oldAmount,
      newAmount,
      changed: oldAmount !== newAmount,
    });
  }

  return changes;
};

const getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ error: 'year is required' });
    }

    if (!isIntegerValue(year)) {
      return res.status(400).json({ error: 'year must be an integer' });
    }

    const normalizedYear = Number(year);

    const categories = await Category.findAll({
      attributes: ['id', 'name', 'type'],
      include: [
        {
          model: Concept,
          as: 'concepts',
          attributes: ['id', 'name'],
          required: true,
          include: [
            {
              model: Budget,
              as: 'budgets',
              attributes: ['month', 'amount'],
              required: false,
              where: {
                user_id: userId,
                year: normalizedYear,
              },
            },
          ],
        },
      ],
      order: [
        ['id', 'ASC'],
        [{ model: Concept, as: 'concepts' }, 'id', 'ASC'],
        [
          { model: Concept, as: 'concepts' },
          { model: Budget, as: 'budgets' },
          'month',
          'ASC',
        ],
      ],
    });

    const result = [];

    categories.forEach((category) => {
      const plainCategory = category.get({ plain: true });

      plainCategory.concepts.forEach((concept) => {
        const budgetByMonth = new Map();

        concept.budgets.forEach((budget) => {
          budgetByMonth.set(Number(budget.month), Number(budget.amount));
        });

        months.forEach((month) => {
          result.push({
            category_id: plainCategory.id,
            category: plainCategory.name,
            category_type: plainCategory.type,
            concept_id: concept.id,
            concept: concept.name,
            month,
            amount: budgetByMonth.get(month) ?? 0,
          });
        });
      });
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching budgets' });
  }
};

const saveBudgets = async (req, res) => {
  let transaction;

  try {
    const userId = req.user.id;
    const { year, items } = req.body;
    const validationError = validateBudgetPayload(year, items);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (items.length === 0) {
      return res.json({ message: 'No budget changes to save', saved: 0 });
    }

    const normalizedYear = Number(year);
    const normalizedItems = items.map((item) => ({
      concept_id: Number(item.concept_id),
      month: Number(item.month),
      amount: Number(item.amount),
    }));
    transaction = await sequelize.transaction();

    const budgetChanges = await getBudgetChangeDetails(
      transaction,
      userId,
      normalizedYear,
      normalizedItems
    );

    for (const item of normalizedItems) {
      await Budget.upsert(
        {
          user_id: userId,
          concept_id: item.concept_id,
          year: normalizedYear,
          month: item.month,
          amount: item.amount,
        },
        {
          transaction,
        }
      );
    }

    await transaction.commit();

    const firstChange = budgetChanges[0];

    logActivity({
      user: req.user,
      eventType: 'budget.updated',
      entityType: 'budget',
      entityId: normalizedYear,
      description: 'Budget updated',
      metadata: {
        year: normalizedYear,
        savedCount: items.length,
        changes: budgetChanges,
        month: firstChange?.month,
        categoryName: firstChange?.categoryName,
        conceptName: firstChange?.conceptName,
        oldAmount: firstChange?.oldAmount,
        newAmount: firstChange?.newAmount,
      },
    });

    res.json({
      message: 'Budgets saved successfully',
      saved: items.length,
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback().catch(() => {});
    }

    console.error(error);
    res.status(500).json({ error: 'Error saving budgets' });
  }
};

module.exports = {
  getBudgets,
  saveBudgets,
};
