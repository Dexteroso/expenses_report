const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Favorite movements endpoints', () => {
  let token;
  let otherToken;
  let testUser;
  let otherUser;
  let testUserId;
  let otherUserId;
  let accountId;
  let otherAccountId;
  let category;
  let conceptId;

  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorite_movements (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        emoji VARCHAR(16) NOT NULL,
        alias VARCHAR(40) NOT NULL,
        color VARCHAR(20) NOT NULL,
        type ENUM('income', 'expense') NOT NULL,
        category_id INT NOT NULL,
        concept_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        account_id INT NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY category_id (category_id),
        KEY concept_id (concept_id),
        KEY account_id (account_id),
        CONSTRAINT favorite_movements_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT favorite_movements_ibfk_2 FOREIGN KEY (category_id) REFERENCES categories (id),
        CONSTRAINT favorite_movements_ibfk_3 FOREIGN KEY (concept_id) REFERENCES concepts (id),
        CONSTRAINT favorite_movements_ibfk_4 FOREIGN KEY (account_id) REFERENCES accounts (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    testUser = {
      name: 'Favorites Test User',
      email: `favorites_test_${Date.now()}@example.com`,
      password: 'password123',
    };
    otherUser = {
      name: 'Favorites Other User',
      email: `favorites_other_${Date.now()}@example.com`,
      password: 'password123',
    };

    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    const otherRegisterRes = await request(app).post('/api/auth/register').send(otherUser);

    expect(registerRes.statusCode).toBe(201);
    expect(otherRegisterRes.statusCode).toBe(201);

    testUserId = registerRes.body.user.id;
    otherUserId = otherRegisterRes.body.user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    const otherLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: otherUser.email, password: otherUser.password });

    token = loginRes.body.token;
    otherToken = otherLoginRes.body.token;

    const accountRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bank_name: 'Favorites Bank',
        last_four: '1111',
        account_type: 'debit',
        billing_cycle_end_day: null,
      });
    const otherAccountRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        bank_name: 'Other Favorites Bank',
        last_four: '2222',
        account_type: 'debit',
        billing_cycle_end_day: null,
      });

    accountId = accountRes.body.account_id;
    otherAccountId = otherAccountRes.body.account_id;

    const [categoryRows] = await pool.query('SELECT id, type FROM categories LIMIT 1');
    category = categoryRows[0];
    const [conceptRows] = await pool.query('SELECT id FROM concepts WHERE category_id = ? LIMIT 1', [category.id]);
    conceptId = conceptRows[0].id;
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM favorite_movements WHERE user_id = ?', [testUserId]);
      await pool.query('DELETE FROM accounts WHERE user_id = ?', [testUserId]);
    }
    if (otherUserId) {
      await pool.query('DELETE FROM favorite_movements WHERE user_id = ?', [otherUserId]);
      await pool.query('DELETE FROM accounts WHERE user_id = ?', [otherUserId]);
    }
    await pool.query('DELETE FROM users WHERE email IN (?, ?)', [testUser.email, otherUser.email]);
    await pool.end();
  });

  const buildFavoritePayload = (overrides = {}) => ({
    emoji: '🛒',
    alias: 'Súper',
    color: '#384f7f',
    type: category.type,
    category_id: category.id,
    concept_id: conceptId,
    description: 'Supermercado semanal',
    account_id: accountId,
    ...overrides,
  });

  test('GET /api/favorite-movements without token returns 401', async () => {
    const res = await request(app).get('/api/favorite-movements');

    expect(res.statusCode).toBe(401);
  });

  test('POST /api/favorite-movements creates a favorite preset', async () => {
    const res = await request(app)
      .post('/api/favorite-movements')
      .set('Authorization', `Bearer ${token}`)
      .send(buildFavoritePayload());

    expect(res.statusCode).toBe(201);
    expect(res.body.favorite.id).toBeDefined();
    expect(res.body.favorite.alias).toBe('Súper');
    expect(res.body.favorite.amount).toBeUndefined();
  });

  test('GET /api/favorite-movements returns only the current user favorites', async () => {
    await request(app)
      .post('/api/favorite-movements')
      .set('Authorization', `Bearer ${otherToken}`)
      .send(buildFavoritePayload({
        alias: 'Otro',
        account_id: otherAccountId,
      }));

    const res = await request(app)
      .get('/api/favorite-movements')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].alias).toBe('Súper');
  });

  test('POST /api/favorite-movements enforces five favorites per user', async () => {
    for (let index = 2; index <= 5; index += 1) {
      const res = await request(app)
        .post('/api/favorite-movements')
        .set('Authorization', `Bearer ${token}`)
        .send(buildFavoritePayload({
          emoji: '⭐',
          alias: `Fav ${index}`,
        }));

      expect(res.statusCode).toBe(201);
    }

    const limitRes = await request(app)
      .post('/api/favorite-movements')
      .set('Authorization', `Bearer ${token}`)
      .send(buildFavoritePayload({
        alias: 'Fav 6',
      }));

    expect(limitRes.statusCode).toBe(400);
    expect(limitRes.body.error).toBe('Maximum favorite movements reached');
  });
});
