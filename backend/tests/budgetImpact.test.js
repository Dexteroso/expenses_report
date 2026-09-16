const { Op } = require('sequelize');
const Expense = require('../src/models/sequelize/Expense');
const Budget = require('../src/models/sequelize/Budget');
const Concept = require('../src/models/sequelize/Concept');
const Favorite = require('../src/models/sequelize/FavoriteMovement');
jest.mock('../src/utils/activityLogger', () => ({ logActivity: jest.fn() }));
jest.mock('../src/utils/onboardingStatus', () => ({ markUserOnboardingCompleted: jest.fn() }));
const { logActivity } = require('../src/utils/activityLogger');
const { markUserOnboardingCompleted } = require('../src/utils/onboardingStatus');
const { createExpense, updateExpense } = require('../src/controllers/expensesController');
const { getRealVsBudgetReport } = require('../src/controllers/reportsController');
const { toCents, money } = require('../src/utils/budgetImpact');
const catalog = { id: 4, name: 'Supermercado', category: { id: 2, name: 'Alimentos', type: 'expense' } };
const instance = (plain) => ({ get: () => plain });
const body = { date: '2025-08-31', type: 'expense', category_id: 2, concept_id: 4, account_id: 3, amount: 50, source_favorite_id: 8 };
let res;
beforeEach(() => {
  res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  jest.spyOn(Budget, 'findOne').mockResolvedValue({ amount: '100.00' });
  jest.spyOn(Budget, 'findAll').mockResolvedValue([{ concept_id: 4, month: 8, amount: '100.00' }]);
  jest.spyOn(Concept, 'findByPk').mockResolvedValue(instance(catalog));
  jest.spyOn(Concept, 'findAll').mockResolvedValue([instance(catalog)]);
  jest.spyOn(Expense, 'findAll').mockResolvedValue([{ concept_id: 4, month: 8, actual: '60.00' }]);
  jest.spyOn(Expense, 'findOne').mockResolvedValue(null);
  jest.spyOn(Expense, 'create').mockResolvedValue({ id: 99 });
  jest.spyOn(Expense, 'update').mockResolvedValue([1]);
  jest.spyOn(Favorite, 'increment').mockResolvedValue([1]);
  jest.spyOn(Favorite, 'findOne').mockResolvedValue(instance({ id: 8, alias: 'Compras' }));
});
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });
const create = (overrides = {}) => createExpense({ user: { id: 7 }, body: { ...body, ...overrides } }, res);

test.each([
  ['100.00', '60.00', 39.99, 201, 'ENOUGH'],
  ['100.00', '60.00', 40, 201, 'ENOUGH'],
  ['0.00', '0.00', 1, 409, 'WOULD_EXCEED'],
  [null, '0.00', 1, 409, 'WOULD_EXCEED'],
  ['100.00', '60.00', 50, 409, 'WOULD_EXCEED'],
  ['100.00', '120.00', 50, 409, 'ALREADY_EXCEEDED'],
])('budget %s spent %s new %s returns %s %s', async (budget, actual, amount, http, status) => {
  Budget.findOne.mockResolvedValue(budget === null ? null : { amount: budget });
  Expense.findAll.mockResolvedValue([{ concept_id: 4, month: 8, actual }]);
  await create({ amount });
  expect(res.status).toHaveBeenCalledWith(http);
  if (http === 409) {
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'BUDGET_CONFIRMATION_REQUIRED', requiresConfirmation: true,
      budgetImpact: expect.objectContaining({ status, categoryName: 'Alimentos', conceptName: 'Supermercado', newAmount: money(toCents(amount)) }) }));
    expect(Expense.findOne).not.toHaveBeenCalled(); // Includes expense-code generation.
    expect(Expense.create).not.toHaveBeenCalled();
    expect(Favorite.increment).not.toHaveBeenCalled();
    expect(Favorite.findOne).not.toHaveBeenCalled();
    expect(markUserOnboardingCompleted).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  } else expect(Expense.create).toHaveBeenCalledTimes(1);
});

test('backdated check uses authenticated user and movement concept/month/year and exact impact', async () => {
  await create();
  expect(Budget.findOne).toHaveBeenCalledWith({ where: { user_id: 7, concept_id: 4, year: 2025, month: 8 }, raw: true });
  const query = Expense.findAll.mock.calls[0][0];
  expect(query.where.user_id).toBe(7);
  expect(query.where.concept_id).toBe(4);
  expect(query.where[Op.and].map((condition) => condition.logic)).toEqual([2025, 8]);
  expect(query.where).not.toHaveProperty('type');
  expect(query.where).not.toHaveProperty('category_id');
  expect(res.json.mock.calls[0][0].budgetImpact).toEqual({ status: 'WOULD_EXCEED', date: '2025-08-31', year: 2025, month: 8,
    categoryId: 2, categoryName: 'Alimentos', conceptId: 4, conceptName: 'Supermercado', currency: 'MXN',
    budget: '100.00', currentSpent: '60.00', available: '40.00', newAmount: '50.00', projectedSpent: '110.00',
    projectedAvailable: '-10.00', currentOverage: '0.00', projectedOverage: '10.00' });
});

test('warning then confirmation inserts once, increments owned favorite once and emits each event once', async () => {
  await create();
  await create({ budget_confirmation: true });
  expect(Expense.findAll).toHaveBeenCalledTimes(1);
  expect(Expense.create).toHaveBeenCalledTimes(1);
  expect(Favorite.increment).toHaveBeenCalledTimes(1);
  expect(Favorite.increment).toHaveBeenCalledWith('usage_count', { by: 1, where: { id: 8, user_id: 7 } });
  expect(markUserOnboardingCompleted).toHaveBeenCalledTimes(1);
  expect(logActivity.mock.calls.map(([event]) => event.eventType)).toEqual(['expense.created', 'favorite.used']);
  expect(res.status).toHaveBeenLastCalledWith(201);
});

test('confirmation requires literal true and never bypasses validation', async () => {
  await create({ budget_confirmation: 'true' });
  expect(res.status).toHaveBeenLastCalledWith(409);
  await create({ budget_confirmation: true, amount: 0 });
  expect(res.status).toHaveBeenLastCalledWith(400);
  expect(Expense.create).not.toHaveBeenCalled();
});

test('income and PUT skip all budget queries', async () => {
  await create({ type: 'income' });
  expect(res.status).toHaveBeenCalledWith(201);
  await updateExpense({ user: { id: 7 }, params: { id: '99' }, body }, res);
  expect(Expense.update).toHaveBeenCalledTimes(1);
  expect(Budget.findOne).not.toHaveBeenCalled();
  expect(Expense.findAll).not.toHaveBeenCalled();
});

test('currency boundaries use the same normalized amount for preflight and persistence', async () => {
  expect(toCents('1.005')).toBe(101);
  expect(toCents('1e-2')).toBe(1);
  expect(toCents('99999999.99')).toBe(9999999999);
  Budget.findOne.mockResolvedValue({ amount: '1.00' });
  Expense.findAll.mockResolvedValue([]);
  await create({ amount: '1.005' });
  expect(res.json.mock.calls[0][0].budgetImpact.newAmount).toBe('1.01');
  await create({ amount: '1.005', budget_confirmation: true });
  expect(Expense.create).toHaveBeenCalledWith(expect.objectContaining({ amount: '1.01' }));
  Budget.findOne.mockResolvedValue({ amount: '0.30' });
  Expense.findAll.mockResolvedValue([{ actual: '0.10' }]);
  await create({ amount: 0.2 });
  expect(res.status).toHaveBeenLastCalledWith(201);
});

test('Variaciones and preflight share aggregation and agree on actual spending', async () => {
  await create();
  const impact = res.json.mock.calls[0][0].budgetImpact;
  const preflightQuery = Expense.findAll.mock.calls[0][0];
  await getRealVsBudgetReport({ user: { id: 7 }, query: { year: '2025' } }, res);
  const reportQuery = Expense.findAll.mock.calls[1][0];
  expect(reportQuery.attributes).toEqual(preflightQuery.attributes);
  expect(reportQuery.group).toEqual(preflightQuery.group);
  expect(reportQuery.where.user_id).toBe(preflightQuery.where.user_id);
  expect(reportQuery.where[Op.and][0]).toEqual(preflightQuery.where[Op.and][0]);
  const august = res.json.mock.calls[1][0].find((row) => row.month === 8);
  expect(august.actual).toBe(Number(impact.currentSpent));
});

test('unavailable advisory read writes nothing and explicit confirmation still works', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  Budget.findOne.mockRejectedValue(new Error('Budget unavailable'));
  await create();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'BUDGET_CHECK_UNAVAILABLE' }));
  expect(Expense.create).not.toHaveBeenCalled();
  await create({ budget_confirmation: true });
  expect(res.status).toHaveBeenLastCalledWith(201);
  expect(Budget.findOne).toHaveBeenCalledTimes(1);
});
