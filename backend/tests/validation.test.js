const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { sanitizeTextValue } = require('../src/utils/validators');

describe('Backend validation', () => {
  let token;
  let adminToken;
  let testUser;
  let adminUser;
  let testUserId;
  let adminUserId;
  let accountId;
  let categoryId;
  let conceptId;

  const registerTestUser = async (user) => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(user);

    expect(response.statusCode).toBe(201);
    expect(response.body.user.id).toBeDefined();

    return response.body.user.id;
  };

  const loginTestUser = async (user) => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: user.password,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();

    return response.body.token;
  };

  const buildValidExpense = (overrides = {}) => ({
    date: '2026-05-01',
    type: 'expense',
    category_id: categoryId,
    concept_id: conceptId,
    description: 'Validation test expense',
    amount: 100,
    account_id: accountId,
    ...overrides,
  });

  beforeAll(async () => {
    const uniqueSuffix = Date.now();

    testUser = {
      name: 'Validation Test User',
      email: `validation_user_${uniqueSuffix}@example.com`,
      password: 'password123',
    };
    adminUser = {
      name: 'Validation Admin User',
      email: `validation_admin_${uniqueSuffix}@example.com`,
      password: 'password123',
    };

    testUserId = await registerTestUser(testUser);
    adminUserId = await registerTestUser(adminUser);

    await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      ['admin', adminUserId]
    );

    token = await loginTestUser(testUser);
    adminToken = await loginTestUser(adminUser);

    const accountRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Validation Test Bank',
        last_four: '1234',
        account_type: 'debit',
        billing_cycle_end_day: null,
      });

    expect(accountRes.statusCode).toBe(201);
    expect(accountRes.body.account_id).toBeDefined();
    accountId = accountRes.body.account_id;

    const [categoryRows] = await pool.query('SELECT id FROM categories LIMIT 1');

    expect(categoryRows.length).toBeGreaterThan(0);
    categoryId = categoryRows[0].id;

    const [conceptRows] = await pool.query('SELECT id FROM concepts WHERE category_id = ? LIMIT 1', [categoryId]);

    expect(conceptRows.length).toBeGreaterThan(0);
    conceptId = conceptRows[0].id;
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM expenses WHERE user_id = ?', [testUserId]);
      await pool.query('DELETE FROM accounts WHERE user_id = ?', [testUserId]);
    }

    await pool.query(
      'DELETE FROM users WHERE email IN (?, ?)',
      [testUser.email, adminUser.email]
    );
    await pool.end();
  });

  test('POST /api/expenses rejects missing date', async () => {
    const { date, ...payload } = buildValidExpense();

    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/expenses rejects amount less than or equal to zero', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(buildValidExpense({ amount: 0 }));

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/expenses rejects missing category_id', async () => {
    const { category_id, ...payload } = buildValidExpense();

    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/expenses rejects missing account_id', async () => {
    const { account_id, ...payload } = buildValidExpense();

    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/expenses rejects invalid type', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(buildValidExpense({ type: 'invalid' }));

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/accounts rejects missing bank_name', async () => {
    const response = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        last_four: '1234',
        account_type: 'debit',
        billing_cycle_end_day: null,
      });

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/accounts rejects missing last_four', async () => {
    const response = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Validation Test Bank',
        account_type: 'debit',
        billing_cycle_end_day: null,
      });

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/accounts rejects invalid account_type', async () => {
    const response = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Validation Test Bank',
        last_four: '1234',
        account_type: 'invalid',
        billing_cycle_end_day: null,
      });

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/accounts rejects credit account without billing_cycle_end_day', async () => {
    const response = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Validation Test Bank',
        last_four: '1234',
        account_type: 'credit',
      });

    expect(response.statusCode).toBe(400);
  });

  test('PUT /api/users/:id rejects invalid role update', async () => {
    const response = await request(app)
      .put(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'invalid',
      });

    expect(response.statusCode).toBe(400);
  });

  test('text sanitizer removes hidden control characters without removing user text', () => {
    const result = sanitizeTextValue('  Café ñandú 💸\u0000<script>alert(1)</script>\u0007  ');

    expect(result).toBe('Café ñandú 💸<script>alert(1)</script>');
  });
});
