const Budget = require('../models/sequelize/Budget');
const Concept = require('../models/sequelize/Concept');
const Category = require('../models/sequelize/Category');
const Account = require('../models/sequelize/Account');
const Expense = require('../models/sequelize/Expense');
const { getMonthlyActuals, getBudgetImpact, toCents, money } = require('./budgetImpact');
const { isValidDateValue, isPositiveNumberValue, isIntegerValue } = require('./validators');
const { FinancialError } = require('./financialTransaction');
const MAX_CENTS = 9999999999;
const invalid = (error) => new FinancialError(400, { code: 'INVALID_BUDGET_REASSIGNMENT', error });
const validId = (value) => isIntegerValue(value) && Number(value) > 0;

const readContext = async ({ userId, date, conceptId, amount, expenseId, previousExpense, transaction }) => {
  if (!isValidDateValue(date) || !validId(conceptId) || !isPositiveNumberValue(amount)) {
    throw invalid('Fecha, concepto o cantidad inválidos.');
  }
  if (expenseId !== undefined && !previousExpense) {
    if (!validId(expenseId)) throw invalid('Movimiento inválido.');
    previousExpense = await Expense.findOne({ where: { id: Number(expenseId), user_id: userId }, transaction, raw: true });
    if (!previousExpense) throw new FinancialError(404, { error: 'Expense not found' });
  }
  const [year, month] = date.trim().split('-').map(Number);
  const concepts = await Concept.findAll({
    include: [{ model: Category, as: 'category', required: true, where: { type: 'expense' }, attributes: ['id', 'name', 'type'] }],
    order: [['id', 'ASC']], transaction,
  });
  const catalog = concepts.map((row) => row.get({ plain: true }));
  const destination = catalog.find((row) => row.id === Number(conceptId));
  if (!destination) throw invalid('El destino debe ser un concepto de egreso válido.');
  const budgets = await Budget.findAll({ where: { user_id: userId, year, month }, transaction, raw: true });
  // For edits, donor capacity includes allocation released by removing the old
  // movement in this period. The edit and transfer commit together.
  const actuals = await getMonthlyActuals({ userId, year, month, transaction, excludeExpenseId: previousExpense?.id });
  const budgetMap = new Map(budgets.map((row) => [Number(row.concept_id), toCents(row.amount)]));
  const actualMap = new Map(actuals.map((row) => [Number(row.concept_id), toCents(row.actual)]));
  const impact = await getBudgetImpact({ userId, date, conceptId, amountCents: toCents(amount), transaction, previousExpense });
  const rows = catalog.map((concept) => {
    const budget = budgetMap.get(concept.id) ?? 0;
    const spent = actualMap.get(concept.id) ?? 0;
    return { conceptId: concept.id, conceptName: concept.name, categoryId: concept.category.id,
      categoryName: concept.category.name, budget: money(budget), currentSpent: money(spent), available: money(budget - spent) };
  });
  return { year, month, impact, rows };
};

const presentSources = ({ year, month, impact, rows }) => {
  const groups = new Map();
  for (const row of rows) {
    if (row.conceptId === impact.conceptId || toCents(row.available) <= 0) continue;
    if (!groups.has(row.categoryId)) groups.set(row.categoryId, {
      categoryId: row.categoryId, categoryName: row.categoryName,
      isDestinationCategory: row.categoryId === impact.categoryId, concepts: [],
    });
    groups.get(row.categoryId).concepts.push(row);
  }
  const categories = [...groups.values()].sort((a, b) => Number(b.isDestinationCategory) - Number(a.isDestinationCategory) || a.categoryId - b.categoryId)
    .map((group) => ({ ...group, available: money(group.concepts.reduce((sum, row) => sum + toCents(row.available), 0)) }));
  return { date: impact.date, year, month, currency: 'MXN', destination: { ...impact, requiredAmount: impact.projectedOverage },
    sameCategoryAvailable: categories.find((group) => group.isDestinationCategory)?.available ?? '0.00',
    totalAvailable: money(categories.reduce((sum, group) => sum + toCents(group.available), 0)), categories };
};
const getReassignmentSources = async (options) => presentSources(await readContext(options));

const applyBudgetReassignment = async ({ userId, payload, transaction, previousExpense }) => {
  if (payload.type !== 'expense' || payload.budget_confirmation !== true) throw invalid('Confirma la reasignación de un egreso.');
  const sources = payload.budget_reassignment?.sources;
  if (!Array.isArray(sources) || sources.length === 0) throw invalid('Selecciona al menos una fuente.');
  const seen = new Set();
  const contributions = sources.map((source) => {
    if (!validId(source?.concept_id) || Number(source.concept_id) === Number(payload.concept_id) || seen.has(Number(source.concept_id))) {
      throw invalid('Cada fuente debe ser única y distinta del destino.');
    }
    seen.add(Number(source.concept_id));
    // Transfers accept only exact decimal currency, never rounding or coercing booleans.
    if (!['string', 'number'].includes(typeof source.amount) || !/^\d+(?:\.\d{1,2})?$/.test(String(source.amount))) {
      throw invalid('Las aportaciones deben ser cantidades exactas con hasta dos decimales.');
    }
    const cents = toCents(source.amount);
    if (cents <= 0 || cents > MAX_CENTS) throw invalid('Cada aportación debe ser mayor a cero y estar dentro del límite permitido.');
    return { conceptId: Number(source.concept_id), cents };
  });
  const context = await readContext({ userId, date: payload.date, conceptId: payload.concept_id,
    amount: payload.amount, transaction, previousExpense });
  if (Number(payload.category_id) !== context.impact.categoryId) throw invalid('La categoría no corresponde al concepto destino.');
  const account = await Account.findOne({ where: { id: payload.account_id, user_id: userId }, transaction });
  if (!account) throw invalid('Cuenta inválida.');
  const conflicts = [];
  const changes = contributions.map(({ conceptId, cents }) => {
    const row = context.rows.find((item) => item.conceptId === conceptId);
    if (!row) throw invalid('Una fuente no es un concepto de egreso válido.');
    if (cents > toCents(row.available)) conflicts.push({ conceptId, requested: money(cents), available: row.available });
    return { ...row, amount: money(cents), budgetBefore: row.budget, budgetAfter: money(toCents(row.budget) - cents),
      spentAtValidation: row.currentSpent, availableBefore: row.available };
  });
  if (conflicts.length) throw new FinancialError(409, { code: 'REASSIGNMENT_SOURCE_CHANGED',
    error: 'Cambió el presupuesto disponible. Revisa las fuentes indicadas.', conflicts, discovery: presentSources(context) });
  const total = contributions.reduce((sum, row) => sum + row.cents, 0);
  const destinationBefore = toCents(context.impact.budget);
  if (!Number.isSafeInteger(total) || destinationBefore + total > MAX_CENTS) throw invalid('El presupuesto destino supera el límite permitido.');
  if (total > toCents(context.impact.projectedOverage)) throw invalid('El total a reasignar supera el excedente del movimiento.');
  for (const change of changes.sort((a, b) => a.conceptId - b.conceptId)) {
    await Budget.update({ amount: change.budgetAfter }, {
      where: { user_id: userId, concept_id: change.conceptId, year: context.year, month: context.month }, transaction,
    });
  }
  await Budget.upsert({ user_id: userId, concept_id: Number(payload.concept_id), year: context.year,
    month: context.month, amount: money(destinationBefore + total) }, { transaction });
  return { year: context.year, month: context.month, currency: 'MXN', sources: changes,
    destination: { categoryId: context.impact.categoryId, categoryName: context.impact.categoryName,
      conceptId: context.impact.conceptId, conceptName: context.impact.conceptName,
      budgetBefore: money(destinationBefore), budgetAfter: money(destinationBefore + total) },
    totalReassigned: money(total), requiredAmountBefore: context.impact.projectedOverage,
    remainingOverageAfter: money(Math.max(0, toCents(context.impact.projectedOverage) - total)) };
};
module.exports = { getReassignmentSources, applyBudgetReassignment };
