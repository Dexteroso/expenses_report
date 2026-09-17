const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('../src/utils/activityLogger', () => ({ logActivity: jest.fn() }));
const { logActivity } = require('../src/utils/activityLogger');
const app = require('../src/app');
const pool = require('../src/config/db');
const User = require('../src/models/sequelize/User');
const Account = require('../src/models/sequelize/Account');
const Concept = require('../src/models/sequelize/Concept');
const Category = require('../src/models/sequelize/Category');
const Budget = require('../src/models/sequelize/Budget');
const Expense = require('../src/models/sequelize/Expense');
const Favorite = require('../src/models/sequelize/FavoriteMovement');
let user, other, account, favorite, token, destination, sibling, cross, zero, overspent, income, sequence = 0;
const auth = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
const payload = (overrides = {}) => ({ date: '2024-08-31', type: 'expense', category_id: destination.category_id,
  concept_id: destination.id, amount: 100, account_id: account.id, description: 'Original purchase',
  source_favorite_id: favorite.id, budget_confirmation: true, ...overrides });
const transfer = (sources = [{ concept_id: sibling.id, amount: '50.00' }], overrides = {}) =>
  auth('post', '/api/expenses').send(payload({ budget_reassignment: { sources }, ...overrides }));
const discover = (overrides = {}) => auth('get', '/api/budgets/reassignment-sources').query({ date: '2024-08-31', concept_id: destination.id, amount: 100, ...overrides });
const budget = (concept, amount, overrides = {}) => Budget.upsert({ user_id: user.id, concept_id: concept.id, year: 2024, month: 8, amount, ...overrides });
const expense = (concept, amount, overrides = {}) => Expense.create({ expense_code: `T${user.id}_${++sequence}`,
  user_id: user.id, date: '2024-08-01', type: 'expense', category_id: concept.category_id, concept_id: concept.id,
  account_id: account.id, amount, ...overrides });
const balances = async () => (await Budget.findAll({ where: { user_id: user.id, year: 2024, month: 8 }, raw: true, order: [['concept_id', 'ASC']] }))
  .map((row) => ({ concept_id: row.concept_id, amount: Number(row.amount) }));
const amountFor = async (concept) => (await balances()).find((row) => row.concept_id === concept.id)?.amount;
const total = async () => (await balances()).reduce((sum, row) => sum + Math.round(row.amount * 100), 0);
const snapshot = async () => ({ budgets: await balances(), expenses: await Expense.findAll({ where: { user_id: user.id }, raw: true, order: [['id', 'ASC']] }), usage: (await favorite.reload()).usage_count });

beforeAll(async () => {
  user = await User.create({ name: 'Reassignment test', email: `reassign_${Date.now()}@example.com`, password: 'unused-test-hash' }, { fields: ['name', 'email', 'password'] });
  other = await User.create({ name: 'Other reassignment test', email: `reassign_other_${Date.now()}@example.com`, password: 'unused-test-hash' }, { fields: ['name', 'email', 'password'] });
  token = jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET);
  account = await Account.create({ user_id: user.id, bank_name: 'Test', account_type: 'debit', last_four: '1234' });
  const catalog = (await Concept.findAll({ include: [{ model: Category, as: 'category' }], order: [['id', 'ASC']] })).map((row) => row.get({ plain: true }));
  const expenses = catalog.filter((row) => row.category.type === 'expense');
  destination = expenses.find((row) => expenses.filter((item) => item.category_id === row.category_id).length >= 2);
  sibling = expenses.find((row) => row.id !== destination.id && row.category_id === destination.category_id);
  cross = expenses.find((row) => row.category_id !== destination.category_id);
  [zero, overspent] = expenses.filter((row) => ![destination.id, sibling.id, cross.id].includes(row.id));
  income = catalog.find((row) => row.category.type === 'income');
  favorite = await Favorite.create({ user_id: user.id, emoji: '🛒', alias: 'Sprint2', color: '#005496', type: 'expense',
    category_id: destination.category_id, concept_id: destination.id, description: 'Original', account_id: account.id });
});
beforeEach(async () => {
  await Expense.destroy({ where: { user_id: [user.id, other.id] } });
  await Budget.destroy({ where: { user_id: [user.id, other.id] } });
  await favorite.update({ usage_count: 0 });
  await budget(destination, 10); await budget(sibling, 200); await budget(cross, 100);
  await budget(zero, 10); await budget(overspent, 5); await budget(income, 1000);
  await expense(sibling, 50); await expense(zero, 10); await expense(overspent, 10);
  logActivity.mockClear();
});
afterEach(() => { jest.restoreAllMocks(); });
afterAll(async () => {
  if (user && other) {
    await Expense.destroy({ where: { user_id: [user.id, other.id] } });
    await Budget.destroy({ where: { user_id: [user.id, other.id] } });
    await Favorite.destroy({ where: { user_id: user.id } });
    await Account.destroy({ where: { user_id: user.id } });
    await User.destroy({ where: { id: [user.id, other.id] } });
  }
  await pool.end();
});

test('discovery is authenticated, same-category first, excludes destination/zero/overspent/income', async () => {
  expect((await request(app).get('/api/budgets/reassignment-sources')).statusCode).toBe(401);
  const response = await discover();
  expect(response.statusCode).toBe(200);
  expect(response.body.destination).toMatchObject({ conceptId: destination.id, available: '10.00', requiredAmount: '90.00' });
  expect(response.body.categories[0]).toMatchObject({ categoryId: destination.category_id, isDestinationCategory: true, available: '150.00' });
  expect(response.body.categories.flatMap((group) => group.concepts).map((row) => row.conceptId).sort()).toEqual([sibling.id, cross.id].sort());
  expect(response.body.totalAvailable).toBe('250.00');
  expect(logActivity).not.toHaveBeenCalled();
});

test('source availability isolates users and movement month/year, and preserves Real semantics', async () => {
  await budget(sibling, 999, { user_id: other.id });
  await expense(sibling, 300, { user_id: other.id });
  await expense(sibling, 70, { date: '2024-09-01' });
  await expense(sibling, 80, { date: '2025-08-01' });
  await expense(sibling, 1, { type: 'income' }); // Real includes this record.
  expect((await discover()).body.sameCategoryAvailable).toBe('149.00');
  expect((await discover({ date: '2024-09-01' })).body.categories).toEqual([]);
  expect((await discover({ date: '2025-08-01' })).body.categories).toEqual([]);
  const report = await auth('get', '/api/reports/real-vs-budget?year=2024');
  expect(report.body.find((row) => row.concept_id === sibling.id && row.month === 8).actual).toBe(51);
});

test.each([['partial', '50.00', '40.00'], ['exact', '90.00', '0.00'], ['cents', '0.01', '89.99']])('%s reassignment conserves budget and creates one original expense', async (_, amount, remaining) => {
  const before = await total();
  const response = await transfer([{ concept_id: sibling.id, amount }]);
  expect(response.statusCode).toBe(201);
  expect(response.body.budgetReassignment).toMatchObject({ totalReassigned: amount, remainingOverageAfter: remaining, year: 2024, month: 8 });
  expect(await total()).toBe(before);
  expect(await amountFor(sibling)).toBe(200 - Number(amount));
  expect(await amountFor(destination)).toBe(10 + Number(amount));
  const created = await Expense.findByPk(response.body.expense_id, { raw: true });
  expect(created).toMatchObject({ category_id: destination.category_id, concept_id: destination.id, date: '2024-08-31', description: 'Original purchase', account_id: account.id, type: 'expense' });
  expect(Number(created.amount)).toBe(100);
  expect(await Expense.count({ where: { user_id: user.id } })).toBe(4);
  expect((await favorite.reload()).usage_count).toBe(1);
  expect(logActivity.mock.calls.map(([event]) => event.eventType)).toEqual(['expense.created', 'favorite.used']);
});

test.each([['post', 300, 201], ['post', 621, 201], ['post', 621.01, 400], ['post', 622, 400], ['post', 2050, 400],
  ['put', 300, 200], ['put', 621, 200], ['put', 622, 400], ['put', 2050, 400]])(
  '%s with deficit 621 and transfer %s enforces the global cap atomically', async (method, selected, status) => {
    await budget(destination, 879);
    await budget(sibling, 5000);
    await budget(cross, 5000);
    const old = method === 'put' ? await expense(destination, 100) : null;
    const before = await snapshot();
    const monthlyTotal = await total();
    const sources = [{ concept_id: sibling.id, amount: '300.00' }];
    if (selected > 300) sources.push({ concept_id: cross.id, amount: (selected - 300).toFixed(2) });
    const response = await auth(method, `/api/expenses${old ? `/${old.id}` : ''}`)
      .send(payload({ amount: 1500, budget_reassignment: { sources } }));
    expect(response.statusCode).toBe(status);
    if (status === 400) {
      expect(response.body).toMatchObject({ code: 'INVALID_BUDGET_REASSIGNMENT', rolledBack: true });
      expect(await snapshot()).toEqual(before);
      expect(logActivity).not.toHaveBeenCalled();
    } else {
      expect(await amountFor(destination)).toBe(879 + selected);
      expect(await total()).toBe(monthlyTotal);
      expect(response.body.budgetReassignment.remainingOverageAfter).toBe((621 - selected).toFixed(2));
    }
  });

test('multiple categories and missing destination row are atomically upserted with authoritative names', async () => {
  await Budget.destroy({ where: { user_id: user.id, concept_id: destination.id } });
  const before = await total();
  const response = await transfer([{ concept_id: sibling.id, amount: '20.25' }, { concept_id: cross.id, amount: '30.75' }]);
  expect(response.statusCode).toBe(201);
  expect(await amountFor(destination)).toBe(51);
  expect(await total()).toBe(before);
  expect(response.body.budgetReassignment.sources).toEqual(expect.arrayContaining([
    expect.objectContaining({ conceptId: sibling.id, categoryName: sibling.category.name, amount: '20.25', budgetBefore: '200.00', budgetAfter: '179.75' }),
    expect.objectContaining({ conceptId: cross.id, amount: '30.75' }),
  ]));
});

test.each(['-1.00', '0', 'oops', '$1.00', '0.001', '1e2', true])('rejects invalid contribution %s without changes', async (amount) => {
  const before = await snapshot();
  const response = await transfer([{ concept_id: sibling.id, amount }]);
  expect(response.statusCode).toBe(400);
  expect(await snapshot()).toEqual(before);
});

test.each(['duplicate', 'destination', 'income', 'missing', 'wrong category', 'no confirmation', 'income movement'])('rejects %s references without financial effects', async (kind) => {
  const sources = [{ concept_id: sibling.id, amount: '1.00' }];
  const overrides = {};
  if (kind === 'duplicate') sources.push({ ...sources[0] });
  if (kind === 'destination') sources[0].concept_id = destination.id;
  if (kind === 'income') sources[0].concept_id = income.id;
  if (kind === 'missing') sources[0].concept_id = 2147483647;
  if (kind === 'wrong category') overrides.category_id = cross.category_id;
  if (kind === 'no confirmation') overrides.budget_confirmation = false;
  if (kind === 'income movement') overrides.type = 'income';
  const before = await snapshot();
  expect((await transfer(sources, overrides)).statusCode).toBe(400);
  expect(await snapshot()).toEqual(before);
});

test('fresh source conflict returns balances and preserves everything', async () => {
  await discover();
  await expense(sibling, 145);
  const before = await snapshot();
  const response = await transfer();
  expect(response.statusCode).toBe(409);
  expect(response.body).toMatchObject({ code: 'REASSIGNMENT_SOURCE_CHANGED', rolledBack: true,
    conflicts: [{ conceptId: sibling.id, available: '5.00', requested: '50.00' }] });
  expect(response.body.discovery.sameCategoryAvailable).toBe('5.00');
  expect(await snapshot()).toEqual(before);
  expect(logActivity).not.toHaveBeenCalled();
});

test.each(['second source', 'destination', 'expense'])('failure during %s rolls back all financial writes and side effects', async (stage) => {
  const before = await snapshot();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  if (stage === 'second source') {
    const original = Budget.update.bind(Budget); let calls = 0;
    jest.spyOn(Budget, 'update').mockImplementation((...args) => ++calls === 2 ? Promise.reject(new Error('Injected')) : original(...args));
  } else if (stage === 'destination') jest.spyOn(Budget, 'upsert').mockRejectedValueOnce(new Error('Injected'));
  else jest.spyOn(Expense, 'create').mockRejectedValueOnce(new Error('Injected'));
  const response = await transfer([{ concept_id: sibling.id, amount: '10.00' }, { concept_id: cross.id, amount: '10.00' }]);
  expect(response.statusCode).toBe(500);
  expect(response.body.rolledBack).toBe(true);
  expect(await snapshot()).toEqual(before);
  expect(logActivity).not.toHaveBeenCalled();
});

test('favorite metric failure retains financial commit and existing success flag', async () => {
  jest.spyOn(Favorite, 'increment').mockRejectedValueOnce(new Error('Metric unavailable'));
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const response = await transfer();
  expect(response.statusCode).toBe(201);
  expect(response.body.usage_tracking_failed).toBe(true);
  expect(await amountFor(destination)).toBe(60);
  expect(await Expense.findByPk(response.body.expense_id)).not.toBeNull();
});

test.each([
  ['increase', { amount: 120 }, 409, '120.00'],
  ['decrease', { amount: 30 }, 200, null],
  ['unchanged', { amount: 100 }, 200, null],
  ['exact boundary', { amount: 10 }, 200, null],
  ['new concept', 'sibling', 201, null],
  ['new category', 'cross', 201, null],
  ['new month', { date: '2024-09-01' }, 409, '100.00'],
])('edit %s reevaluates destination without double counting', async (_, change, expected, projected) => {
  const old = await expense(destination, 100);
  const overrides = typeof change === 'string' ? { concept_id: (change === 'sibling' ? sibling : cross).id,
    category_id: (change === 'sibling' ? sibling : cross).category_id } : change;
  const response = await auth('put', `/api/expenses/${old.id}`).send(payload({ budget_confirmation: false, ...overrides }));
  expect(response.statusCode).toBe(expected === 201 ? 200 : expected);
  if (expected === 409) {
    expect(response.body.budgetImpact.projectedSpent).toBe(projected);
    expect(response.body.budgetImpact.status).toBe(change.date ? 'WOULD_EXCEED' : 'ALREADY_EXCEEDED');
    expect(Number((await old.reload()).amount)).toBe(100);
  }
  expect((await favorite.reload()).usage_count).toBe(0);
});

test('edit concept move to already exceeded destination warns; old movement is not counted there', async () => {
  const old = await expense(destination, 100);
  const response = await auth('put', `/api/expenses/${old.id}`).send(payload({ budget_confirmation: false,
    concept_id: overspent.id, category_id: overspent.category_id, amount: 1 }));
  expect(response.statusCode).toBe(409);
  expect(response.body.budgetImpact).toMatchObject({ currentSpent: '10.00', projectedSpent: '11.00', removedAmount: '0.00', status: 'ALREADY_EXCEEDED' });
});

test('edit combined reassignment updates one movement, no favorite use, and later edits/deletion never reverse budgets', async () => {
  const initial = await transfer();
  const id = initial.body.expense_id;
  const response = await auth('put', `/api/expenses/${id}`).send(payload({ amount: 110,
    budget_reassignment: { sources: [{ concept_id: cross.id, amount: '10.00' }] } }));
  expect(response.statusCode).toBe(200);
  expect(response.body.budgetReassignment.remainingOverageAfter).toBe('40.00');
  expect(await Expense.count({ where: { user_id: user.id } })).toBe(4);
  expect((await favorite.reload()).usage_count).toBe(1);
  const allocated = await balances();
  const edited = await auth('put', `/api/expenses/${id}`).send(payload({ amount: 1, concept_id: cross.id, category_id: cross.category_id, date: '2024-09-01' }));
  expect(edited.statusCode).toBe(200);
  expect(await balances()).toEqual(allocated);
  expect((await auth('delete', `/api/expenses/${id}`)).statusCode).toBe(200);
  expect(await balances()).toEqual(allocated);
});

test('edit discovery includes release of old source spending and enforces ownership', async () => {
  const old = await expense(sibling, 100);
  const response = await discover({ expense_id: old.id });
  expect(response.body.sameCategoryAvailable).toBe('150.00');
  const foreign = await expense(sibling, 1, { user_id: other.id });
  expect((await discover({ expense_id: foreign.id })).statusCode).toBe(404);
  const edited = await auth('put', `/api/expenses/${old.id}`).send(payload({ budget_reassignment: { sources: [{ concept_id: sibling.id, amount: '125.00' }] }, amount: 135 }));
  expect(edited.statusCode).toBe(200);
  expect(await amountFor(sibling)).toBe(75);
});

// Hold the first writer after it owns the user lock. Observe the second writer
// attempting that same lock before releasing the first; no timing-based sleeps.
async function compete(model, method, firstRequest, secondRequest) {
  let entered, release, attempted;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  const releasePromise = new Promise((resolve) => { release = resolve; });
  const attemptedPromise = new Promise((resolve) => { attempted = resolve; });
  const original = model[method].bind(model); let held = false;
  jest.spyOn(model, method).mockImplementation(async (...args) => {
    if (!held) { held = true; entered(); await releasePromise; }
    return original(...args);
  });
  const first = firstRequest().then((response) => response);
  await enteredPromise;
  const findUser = User.findByPk.bind(User);
  jest.spyOn(User, 'findByPk').mockImplementation((...args) => { if (args[1]?.lock) attempted(); return findUser(...args); });
  const second = secondRequest().then((response) => response);
  await attemptedPromise;
  release();
  return Promise.all([first, second]);
}

test('two concurrent reassignments cannot both consume the same available balance', async () => {
  const run = () => transfer([{ concept_id: sibling.id, amount: '100.00' }], { amount: 110 });
  const [first, second] = await compete(Budget, 'update', run, run);
  expect(first.statusCode).toBe(201);
  expect(second.statusCode).toBe(409);
  expect(await amountFor(sibling)).toBe(100);
  expect((await favorite.reload()).usage_count).toBe(1);
});

test.each(['create', 'update', 'budget', 'delete'])('reassignment coordinates with %s and revalidates after the lock', async (kind) => {
  let first, model, method;
  if (kind === 'create') {
    model = Expense; method = 'create';
    first = () => auth('post', '/api/expenses').send(payload({ concept_id: sibling.id, category_id: sibling.category_id, amount: 100 }));
  } else if (kind === 'update' || kind === 'delete') {
    const old = await expense(sibling, 100);
    model = Expense; method = kind === 'update' ? 'update' : 'destroy';
    first = kind === 'update'
      ? () => auth('put', `/api/expenses/${old.id}`).send(payload({ concept_id: sibling.id, category_id: sibling.category_id, amount: 140 }))
      : () => auth('delete', `/api/expenses/${old.id}`);
  } else {
    model = Budget; method = 'upsert';
    first = () => auth('put', '/api/budgets').send({ year: 2024, items: [{ concept_id: sibling.id, month: 8, amount: 50 }] });
  }
  const [firstResponse, second] = await compete(model, method, first, () => transfer([{ concept_id: sibling.id, amount: '100.00' }], { amount: 110 }));
  expect(firstResponse.statusCode).toBe(kind === 'create' ? 201 : 200);
  expect(second.statusCode).toBe(kind === 'delete' ? 201 : 409);
});

test('edit amount increase at exact boundary succeeds and a cent above warns on delta', async () => {
  await budget(destination, 120);
  const old = await expense(destination, 100);
  const exact = await auth('put', `/api/expenses/${old.id}`).send(payload({ budget_confirmation: false, amount: 120 }));
  expect(exact.statusCode).toBe(200);
  const above = await auth('put', `/api/expenses/${old.id}`).send(payload({ budget_confirmation: false, amount: 120.01 }));
  expect(above.statusCode).toBe(409);
  expect(above.body.budgetImpact).toMatchObject({ currentSpent: '120.00', removedAmount: '120.00',
    deltaAmount: '0.01', projectedSpent: '120.01', projectedOverage: '0.01' });
});

test('expense update failure also rolls back allocations and preserves prior movement', async () => {
  const old = await expense(destination, 100);
  const before = await snapshot();
  jest.spyOn(Expense, 'update').mockRejectedValueOnce(new Error('Injected update failure'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const response = await auth('put', `/api/expenses/${old.id}`).send(payload({ amount: 120,
    budget_reassignment: { sources: [{ concept_id: sibling.id, amount: '10.00' }] } }));
  expect(response.statusCode).toBe(500);
  expect(response.body.rolledBack).toBe(true);
  expect(await snapshot()).toEqual(before);
  expect(logActivity).not.toHaveBeenCalled();
});

test('transfer rejects destination overflow and empty choices without writes', async () => {
  await budget(destination, '99999999.99');
  const before = await snapshot();
  expect((await transfer([{ concept_id: sibling.id, amount: '0.01' }])).statusCode).toBe(400);
  expect((await transfer([])).statusCode).toBe(400);
  expect(await snapshot()).toEqual(before);
});

test('ordinary income still skips warnings; an expense-to-income edit does not reverse allocations', async () => {
  const initial = await transfer();
  const allocated = await balances();
  const edited = await auth('put', `/api/expenses/${initial.body.expense_id}`).send(payload({ type: 'income',
    concept_id: income.id, category_id: income.category_id, budget_confirmation: false }));
  expect(edited.statusCode).toBe(200);
  expect(await balances()).toEqual(allocated);
  const created = await auth('post', '/api/expenses').send(payload({ type: 'income', concept_id: income.id,
    category_id: income.category_id, budget_confirmation: false }));
  expect(created.statusCode).toBe(201);
});
