const mockCreate = jest.fn();
const mockLean = jest.fn();
const mockSort = jest.fn(() => ({ lean: mockLean }));
const mockFind = jest.fn(() => ({ sort: mockSort }));
const mockExpenseCreate = jest.fn();
const mockExpenseFindOne = jest.fn();
const mockExpenseFindAll = jest.fn();
const mockExpenseUpdate = jest.fn();
const mockExpenseDestroy = jest.fn();

jest.mock('../src/models/activityLogModel', () => ({
  create: (...args) => mockCreate(...args),
  find: (...args) => mockFind(...args),
}));

jest.mock('../src/models/sequelize/Expense', () => ({
  create: (...args) => mockExpenseCreate(...args),
  findOne: (...args) => mockExpenseFindOne(...args),
  findAll: (...args) => mockExpenseFindAll(...args),
  update: (...args) => mockExpenseUpdate(...args),
  destroy: (...args) => mockExpenseDestroy(...args),
}));

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Activity endpoints', () => {
  let token;
  let testUser;
  let testUserId;
  let testAccountId;
  let categoryId;
  let conceptId;

  beforeAll(async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
    });

    testUser = {
      name: 'Activity Test User',
      email: `activity_test_${Date.now()}@example.com`,
      password: 'password123',
    };

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(registerRes.statusCode).toBe(201);
    testUserId = registerRes.body.user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(loginRes.statusCode).toBe(200);
    token = loginRes.body.token;

    const accountRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Activity Test Bank',
        last_four: '1234',
        account_type: 'debit',
        billing_cycle_end_day: null,
      });

    expect(accountRes.statusCode).toBe(201);
    testAccountId = accountRes.body.account_id;

    const [categoryRows] = await pool.query('SELECT id FROM categories LIMIT 1');
    categoryId = categoryRows[0].id;

    const [conceptRows] = await pool.query(
      'SELECT id FROM concepts WHERE category_id = ? LIMIT 1',
      [categoryId]
    );
    conceptId = conceptRows[0].id;
  });

  beforeEach(() => {
    mockCreate.mockClear();
    mockFind.mockClear();
    mockSort.mockClear();
    mockLean.mockReset();
    mockLean.mockResolvedValue([]);
    mockExpenseCreate.mockReset();
    mockExpenseFindOne.mockReset();
    mockExpenseFindAll.mockReset();
    mockExpenseUpdate.mockReset();
    mockExpenseDestroy.mockReset();
    mockExpenseCreate.mockResolvedValue({
      id: 900001,
    });
    mockExpenseFindOne.mockResolvedValue(null);
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM expenses WHERE user_id = ?', [testUserId]);
      await pool.query('DELETE FROM accounts WHERE user_id = ?', [testUserId]);
    }

    await pool.query('DELETE FROM users WHERE email = ?', [testUser.email]);
    await pool.end();
  });

  test('GET /api/activity without token returns 401', async () => {
    const response = await request(app).get('/api/activity');

    expect(response.statusCode).toBe(401);
  });

  test('GET /api/activity with token returns 200', async () => {
    mockLean.mockResolvedValue([
      {
        userId: testUserId,
        eventType: 'auth.login_success',
        entityType: 'auth',
        createdAt: new Date(),
      },
    ]);

    const response = await request(app)
      .get('/api/activity')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('login success activity includes user identity metadata', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(response.statusCode).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.login_success',
        metadata: expect.objectContaining({
          userName: testUser.name,
          userEmail: testUser.email,
        }),
      })
    );
  });

  test('creating an expense creates an activity log', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-05-01',
        amount: 100,
        category_id: categoryId,
        concept_id: conceptId,
        description: 'Activity test expense',
        account_id: testAccountId,
        type: 'expense',
      });

    expect(response.statusCode).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testUserId,
        eventType: 'expense.created',
        entityType: 'expense',
        entityId: response.body.expense_id,
      })
    );

    await pool.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [
      response.body.expense_id,
      testUserId,
    ]);
  });

  test('regular user only sees own logs', async () => {
    await request(app)
      .get('/api/activity?period=last7')
      .set('Authorization', `Bearer ${token}`);

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testUserId,
      })
    );
  });
});
