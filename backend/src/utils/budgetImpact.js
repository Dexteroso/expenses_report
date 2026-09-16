const { Op, fn, col, where: sequelizeWhere } = require('sequelize');
const Expense = require('../models/sequelize/Expense');
const Budget = require('../models/sequelize/Budget');
const Concept = require('../models/sequelize/Concept');
const Category = require('../models/sequelize/Category');

// Real is grouped by concept and movement month, regardless of the record's
// type/category/account. Keep this definition shared with Variaciones.
const getMonthlyActuals = ({ userId, year, month, conceptId }) => Expense.findAll({
  attributes: [
    'concept_id',
    [fn('MONTH', col('date')), 'month'],
    [fn('SUM', col('amount')), 'actual'],
  ],
  where: {
    user_id: userId,
    ...(conceptId === undefined ? {} : { concept_id: conceptId }),
    [Op.and]: [
      sequelizeWhere(fn('YEAR', col('date')), year),
      ...(month === undefined ? [] : [sequelizeWhere(fn('MONTH', col('date')), month)]),
    ],
  },
  group: ['concept_id', fn('MONTH', col('date'))],
  raw: true,
});

// Round decimal input half-up without binary floating-point multiplication.
// Number conversion also expands the numeric strings accepted by validation.
const toCents = (value) => {
  const decimal = String(Number(value));
  const [coefficient, exponent = '0'] = decimal.toLowerCase().split('e');
  const negative = coefficient.startsWith('-');
  const [whole, fraction = ''] = coefficient.replace('-', '').split('.');
  const digits = BigInt(whole + fraction);
  const shift = Number(exponent) - fraction.length + 2;
  const magnitude = shift >= 0
    ? digits * (10n ** BigInt(shift))
    : (digits + (10n ** BigInt(-shift)) / 2n) / (10n ** BigInt(-shift));
  const cents = Number(negative ? -magnitude : magnitude);
  if (!Number.isSafeInteger(cents)) throw new RangeError('Amount exceeds safe currency precision');
  return cents;
};

const money = (cents) => {
  if (!Number.isSafeInteger(cents)) throw new RangeError('Amount exceeds safe currency precision');
  return `${cents < 0 ? '-' : ''}${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, '0')}`;
};

const getBudgetImpact = async ({ userId, date, conceptId, amountCents }) => {
  const [year, month] = date.trim().split('-').map(Number);
  const [budgetRow, actualRows, concept] = await Promise.all([
    Budget.findOne({ where: { user_id: userId, concept_id: conceptId, year, month }, raw: true }),
    getMonthlyActuals({ userId, year, month, conceptId }),
    Concept.findByPk(conceptId, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'], required: true }],
    }),
  ]);
  const catalog = concept.get({ plain: true });
  const budget = toCents(budgetRow?.amount ?? 0);
  const currentSpent = toCents(actualRows[0]?.actual ?? 0);
  const projectedSpent = currentSpent + amountCents;
  return {
    status: currentSpent > budget ? 'ALREADY_EXCEEDED' : projectedSpent > budget ? 'WOULD_EXCEED' : 'ENOUGH',
    date, year, month,
    categoryId: catalog.category.id,
    categoryName: catalog.category.name,
    conceptId: Number(conceptId),
    conceptName: catalog.name,
    currency: 'MXN',
    budget: money(budget),
    currentSpent: money(currentSpent),
    available: money(budget - currentSpent),
    newAmount: money(amountCents),
    projectedSpent: money(projectedSpent),
    projectedAvailable: money(budget - projectedSpent),
    currentOverage: money(Math.max(0, currentSpent - budget)),
    projectedOverage: money(Math.max(0, projectedSpent - budget)),
  };
};

module.exports = { getMonthlyActuals, getBudgetImpact, toCents, money };
