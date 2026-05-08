const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Accounts endpoints', () => {
  let token;
  let testUser;
  let testUserId;
  let accountId;

  beforeAll(async () => {
    testUser = {
      name: 'Accounts Test User',
      email: `accounts_test_${Date.now()}@example.com`,
      password: 'password123',
    };

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.user.id).toBeDefined();
    testUserId = registerRes.body.user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    token = loginRes.body.token;
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM accounts WHERE user_id = ?', [testUserId]);
    }

    await pool.query('DELETE FROM users WHERE email = ?', [testUser.email]);
    await pool.end();
  });

  test('POST /api/accounts creates an account', async () => {
    const response = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Accounts Test Bank',
        last_four: '1234',
        account_type: 'debit',
        billing_cycle_end_day: null,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.account_id).toBeDefined();
    accountId = response.body.account_id;
  });

  test('GET /api/accounts returns created account', async () => {
    const response = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: accountId,
          bank_name: 'Accounts Test Bank',
          last_four: '1234',
          account_type: 'debit',
        }),
      ])
    );
  });

  test('PUT /api/accounts/:id updates account', async () => {
    const response = await request(app)
      .put(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Updated Test Bank',
        last_four: '5678',
        account_type: 'credit',
        billing_cycle_end_day: 15,
      });

    expect(response.statusCode).toBe(200);
  });

  test('PATCH /api/accounts/:id/deactivate deactivates account', async () => {
    const response = await request(app)
      .patch(`/api/accounts/${accountId}/deactivate`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
  });

  test('GET /api/accounts does not return deactivated account', async () => {
    const response = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: accountId,
        }),
      ])
    );
  });
});
