const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

const readFilesRecursively = (directory) => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return readFilesRecursively(fullPath);
    }

    return [fullPath];
  });
};

describe('Security regression coverage', () => {
  let token;
  let testUser;
  let testUserId;

  beforeAll(async () => {
    const uniqueSuffix = Date.now();
    testUser = {
      name: 'Security Test User',
      email: `security_test_${uniqueSuffix}@example.com`,
      password: 'password123',
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(registerResponse.statusCode).toBe(201);
    testUserId = registerResponse.body.user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(loginResponse.statusCode).toBe(200);
    token = loginResponse.body.token;

    const accountResponse = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Security Test Bank',
        last_four: '1234',
        account_type: 'debit',
        billing_cycle_end_day: null,
    });

    expect(accountResponse.statusCode).toBe(201);
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM expenses WHERE user_id = ?', [testUserId]);
      await pool.query('DELETE FROM accounts WHERE user_id = ?', [testUserId]);
    }

    if (testUser) {
      await pool.query('DELETE FROM users WHERE email = ?', [testUser.email]);
    }

    await pool.end();
  });

  test('login treats SQL injection payloads as plain credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: `${testUser.email}' OR '1'='1`,
        password: testUser.password,
      });

    expect(response.statusCode).toBe(401);
    expect(response.body).not.toHaveProperty('token');
  });

  test('expense filters reject SQL-like values before database access', async () => {
    const response = await request(app)
      .get('/api/expenses?category_id=1%20OR%201%3D1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('category_id must be an integer');
  });

  test('route parameters reject SQL-like identifiers', async () => {
    const response = await request(app)
      .delete('/api/expenses/1%20OR%201%3D1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
  });

  test('XSS-like account names are returned only as JSON data', async () => {
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';

    const createResponse = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: xssPayload,
        last_four: '9876',
        account_type: 'debit',
        billing_cycle_end_day: null,
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.headers['content-type']).toMatch(/application\/json/);

    const listResponse = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.headers['content-type']).toMatch(/application\/json/);
    expect(listResponse.headers['content-type']).not.toMatch(/text\/html/);

    const storedAccount = listResponse.body.find(
      (account) => account.bank_name === xssPayload
    );

    expect(storedAccount).toBeDefined();
  });

  test('frontend source does not use direct HTML injection APIs', () => {
    const frontendSrc = path.resolve(__dirname, '../../frontend/src');
    const sourceFiles = readFilesRecursively(frontendSrc).filter((filePath) => (
      /\.(jsx?|tsx?)$/.test(filePath)
    ));

    const unsafeMatches = sourceFiles.flatMap((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      return ['dangerouslySetInnerHTML', 'innerHTML'].flatMap((pattern) => (
        source.includes(pattern) ? [`${filePath}: ${pattern}`] : []
      ));
    });

    expect(unsafeMatches).toEqual([]);
  });
});
