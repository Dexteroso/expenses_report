const { Op, fn, col, where: sequelizeWhere } = require('sequelize');
const Budget = require('../models/sequelize/Budget');
const Category = require('../models/sequelize/Category');
const Concept = require('../models/sequelize/Concept');
const Expense = require('../models/sequelize/Expense');

const getRealVsBudgetReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ error: 'year is required' });
    }

    const conceptRows = await Concept.findAll({
      attributes: ['id', 'name'],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'type'],
          required: true,
        },
      ],
      order: [
        [{ model: Category, as: 'category' }, 'id', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    const budgetRows = await Budget.findAll({
      attributes: ['concept_id', 'month', 'amount'],
      where: {
        user_id: userId,
        year,
      },
      raw: true,
    });

    const actualRows = await Expense.findAll({
      attributes: [
        'concept_id',
        [fn('MONTH', col('date')), 'month'],
        [fn('SUM', col('amount')), 'actual'],
      ],
      where: {
        user_id: userId,
        [Op.and]: [
          sequelizeWhere(fn('YEAR', col('date')), Number(year)),
        ],
      },
      group: ['concept_id', fn('MONTH', col('date'))],
      raw: true,
    });

    const budgetMap = new Map();
    const actualMap = new Map();

    budgetRows.forEach((row) => {
      budgetMap.set(`${row.concept_id}-${row.month}`, Number(row.amount) || 0);
    });

    actualRows.forEach((row) => {
      actualMap.set(`${row.concept_id}-${row.month}`, Number(row.actual) || 0);
    });

    const months = Array.from({ length: 12 }, (_, index) => index + 1);
    const result = [];

    conceptRows.forEach((conceptInstance) => {
      const conceptRow = conceptInstance.get({ plain: true });

      months.forEach((month) => {
        const budget = budgetMap.get(`${conceptRow.id}-${month}`) ?? 0;
        const actual = actualMap.get(`${conceptRow.id}-${month}`) ?? 0;

        result.push({
          category_id: conceptRow.category.id,
          category: conceptRow.category.name,
          category_type: conceptRow.category.type,
          concept_id: conceptRow.id,
          concept: conceptRow.name,
          month,
          budget,
          actual,
          deviation: budget - actual,
        });
      });
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching real vs budget report' });
  }
};

module.exports = {
  getRealVsBudgetReport,
};
