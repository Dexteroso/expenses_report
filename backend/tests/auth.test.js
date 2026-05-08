const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Auth endpoints', () => {
  let testUser;
  let testUserId;
  let registerResponse;

  beforeAll(async () => {
    testUser = {
      name: 'Auth Test User',
      email: `auth_test_${Date.now()}@example.com`,
      password: 'password123',
    };

    registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    testUserId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    // Limpieza: borrar usuario creado
    await pool.query('DELETE FROM users WHERE email = ?', [testUser.email]);
    await pool.end();
  });

  test('register creates a user and does not return password', async () => {
    expect(registerResponse.statusCode).toBe(201);
    expect(registerResponse.body).toHaveProperty('message', 'User registered successfully');
    expect(registerResponse.body).toHaveProperty('user');
    expect(registerResponse.body.user).toHaveProperty('id', testUserId);
    expect(registerResponse.body.user).toHaveProperty('email', testUser.email);
    expect(registerResponse.body.user).not.toHaveProperty('password');
  });

  test('login with valid credentials returns token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', testUser.email);
  });

  test('login with invalid password returns error', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });

    expect(response.statusCode).toBe(401);
  });

  test('protected route without token returns 401', async () => {
    const response = await request(app).get('/api/expenses');

    expect(response.statusCode).toBe(401);
  });
});
