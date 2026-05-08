const pool = require('../config/db');

const getRealVsBudgetReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ error: 'year is required' });
    }

    const [conceptRows] = await pool.query(
      `
      SELECT
        c.id AS category_id,
        c.name AS category,
        c.type AS category_type,
        co.id AS concept_id,
        co.name AS concept
      FROM categories c
      JOIN concepts co ON co.category_id = c.id
      ORDER BY c.id, co.id
      `
    );

    const [budgetRows] = await pool.query(
      `
      SELECT
        concept_id,
        month,
        amount
      FROM budgets
      WHERE user_id = ? AND year = ?
      `,
      [userId, year]
    );

    const [actualRows] = await pool.query(
      `
      SELECT
        concept_id,
        MONTH(date) AS month,
        SUM(amount) AS actual
      FROM expenses
      WHERE user_id = ? AND YEAR(date) = ?
      GROUP BY concept_id, MONTH(date)
      `,
      [userId, year]
    );

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

    conceptRows.forEach((conceptRow) => {
      months.forEach((month) => {
        const budget = budgetMap.get(`${conceptRow.concept_id}-${month}`) ?? 0;
        const actual = actualMap.get(`${conceptRow.concept_id}-${month}`) ?? 0;

        result.push({
          category_id: conceptRow.category_id,
          category: conceptRow.category,
          category_type: conceptRow.category_type,
          concept_id: conceptRow.concept_id,
          concept: conceptRow.concept,
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
