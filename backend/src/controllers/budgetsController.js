const { sequelize } = require('../config/sequelize');
const Budget = require('../models/sequelize/Budget');
const Category = require('../models/sequelize/Category');
const Concept = require('../models/sequelize/Concept');
const { logActivity } = require('../utils/activityLogger');

const months = Array.from({ length: 12 }, (_, index) => index + 1);

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
                year,
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
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { year, items } = req.body;

    if (!year || !Array.isArray(items)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'year and items are required' });
    }

    if (items.length === 0) {
      await transaction.rollback();
      return res.json({ message: 'No budget changes to save', saved: 0 });
    }

    const budgetChanges = await getBudgetChangeDetails(transaction, userId, year, items);

    for (const item of items) {
      await Budget.upsert(
        {
          user_id: userId,
          concept_id: item.concept_id,
          year,
          month: item.month,
          amount: Number(item.amount) || 0,
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
      entityId: year,
      description: 'Budget updated',
      metadata: {
        year,
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
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error saving budgets' });
  }
};

module.exports = {
  getBudgets,
  saveBudgets,
};
