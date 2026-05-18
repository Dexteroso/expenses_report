const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

const PASSWORD_RESET_RESPONSE_MESSAGE = 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.';

describe('Auth endpoints', () => {
  let testUser;
  let testUserId;
  let registerResponse;
  const originalNodeEnv = process.env.NODE_ENV;

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
    process.env.NODE_ENV = originalNodeEnv;
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
    expect(registerResponse.body.user).toHaveProperty('onboarding_completed', false);
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
    expect(response.body.user).toHaveProperty('onboarding_completed', false);
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

  test('forgot password returns generic message and development reset token', async () => {
    process.env.NODE_ENV = 'test';

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', PASSWORD_RESET_RESPONSE_MESSAGE);
    expect(response.body).toHaveProperty('resetToken');
    expect(response.body).toHaveProperty('resetUrl');
    expect(response.body).toHaveProperty('expiresInMinutes');

    const [rows] = await pool.query(
      'SELECT reset_token, reset_token_expires FROM users WHERE id = ?',
      [testUserId]
    );

    expect(rows[0].reset_token).toBe(response.body.resetToken);
    expect(rows[0].reset_token_expires).toBeTruthy();
  });

  test('forgot password does not reveal whether email is unknown', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `missing_${Date.now()}@example.com` });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: PASSWORD_RESET_RESPONSE_MESSAGE,
    });
  });

  test('forgot password never returns reset token in production mode', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: PASSWORD_RESET_RESPONSE_MESSAGE,
    });
  });
});
