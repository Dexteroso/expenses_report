const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Middleware protection', () => {
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;

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

  beforeAll(async () => {
    const uniqueSuffix = Date.now();

    testUser = {
      name: 'Middleware Test User',
      email: `middleware_user_${uniqueSuffix}@example.com`,
      password: 'password123',
    };
    adminUser = {
      name: 'Middleware Admin User',
      email: `middleware_admin_${uniqueSuffix}@example.com`,
      password: 'password123',
    };

    await registerTestUser(testUser);
    const adminUserId = await registerTestUser(adminUser);

    await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      ['admin', adminUserId]
    );

    userToken = await loginTestUser(testUser);
    adminToken = await loginTestUser(adminUser);
  });

  afterAll(async () => {
    await pool.query(
      'DELETE FROM users WHERE email IN (?, ?)',
      [testUser.email, adminUser.email]
    );
    await pool.end();
  });

  test.each([
    ['GET /api/expenses', '/api/expenses'],
    ['GET /api/accounts', '/api/accounts'],
    ['GET /api/budgets', '/api/budgets'],
    ['GET /api/reports/real-vs-budget', '/api/reports/real-vs-budget'],
  ])('%s returns 401 without token', async (_label, route) => {
    const response = await request(app).get(route);

    expect(response.statusCode).toBe(401);
  });

  test('GET /api/users returns 403 for regular user token', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.statusCode).toBe(403);
  });

  test('GET /api/users returns 200 for admin token', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
  });
});
