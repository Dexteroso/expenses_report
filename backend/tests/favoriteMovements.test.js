const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const Expense = require('../src/models/sequelize/Expense');
const FavoriteMovement = require('../src/models/sequelize/FavoriteMovement');

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
        amount DECIMAL(10,2) NULL DEFAULT NULL,
        usage_count INT UNSIGNED NOT NULL DEFAULT 0,
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
      await pool.query('DELETE FROM expenses WHERE user_id = ?', [testUserId]);
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
    expect(res.body.favorite.amount).toBeNull();
    expect(res.body.favorite.usage_count).toBe(0);
  });

  test('GET /api/favorite-movements returns only the current user favorites', async () => {
    const created = await request(app)
      .post('/api/favorite-movements')
      .set('Authorization', `Bearer ${otherToken}`)
      .send(buildFavoritePayload({
        alias: 'Otro',
        account_id: otherAccountId,
        amount: '85.50',
        usage_count: 999,
      }));

    expect(created.statusCode).toBe(201);
    expect(created.body.favorite).toMatchObject({ amount: 85.5, usage_count: 0 });

    const res = await request(app)
      .get('/api/favorite-movements')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].alias).toBe('Súper');
  });

  test('independent edits preserve lifetime usage and do not create historical movements', async () => {
    const [rows] = await pool.query('SELECT id FROM favorite_movements WHERE user_id = ?', [testUserId]);
    const id = rows[0].id;
    await pool.query('UPDATE favorite_movements SET usage_count = 17 WHERE id = ?', [id]);
    const response = await request(app).put(`/api/favorite-movements/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildFavoritePayload({ alias: 'Edited', amount: 123.45, usage_count: 0, user_id: otherUserId }));
    expect(response.statusCode).toBe(200);
    expect(response.body.favorite).toMatchObject({ id, alias: 'Edited', amount: 123.45, usage_count: 17 });
    const list = await request(app).get('/api/favorite-movements').set('Authorization', `Bearer ${token}`);
    expect(list.body[0]).toMatchObject({ amount: 123.45, usage_count: 17 });
    const [expenses] = await pool.query('SELECT id FROM expenses WHERE user_id = ?', [testUserId]);
    expect(expenses).toHaveLength(0);
    const legacyEdit = await request(app).put(`/api/favorite-movements/${id}`)
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload());
    expect(legacyEdit.body.favorite.amount).toBe(123.45);
    const clear = await request(app).put(`/api/favorite-movements/${id}`)
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload({ amount: null }));
    expect(clear.body.favorite.amount).toBeNull();
    expect(clear.body.favorite.usage_count).toBe(17);
  });

  test('editing and deletion enforce ownership', async () => {
    const [rows] = await pool.query('SELECT id FROM favorite_movements WHERE user_id = ?', [testUserId]);
    for (const method of ['put', 'delete']) {
      const response = await request(app)[method](`/api/favorite-movements/${rows[0].id}`)
        .set('Authorization', `Bearer ${otherToken}`).send(buildFavoritePayload());
      expect(response.statusCode).toBe(404);
    }
  });

  test.each([0, -1, true, '', 'abc', 1.234, 100000000, [], {}])('rejects invalid amount %p on create and edit', async (amount) => {
    const [rows] = await pool.query('SELECT id FROM favorite_movements WHERE user_id = ?', [testUserId]);
    for (const method of ['post', 'put']) {
      const url = method === 'post' ? '/api/favorite-movements' : `/api/favorite-movements/${rows[0].id}`;
      const response = await request(app)[method](url).set('Authorization', `Bearer ${token}`)
        .send(buildFavoritePayload({ amount }));
      expect(response.statusCode).toBe(400);
    }
  });

  test('rejects foreign accounts and mismatched categories on edit', async () => {
    const [rows] = await pool.query('SELECT id FROM favorite_movements WHERE user_id = ?', [testUserId]);
    for (const overrides of [{ account_id: otherAccountId }, { type: category.type === 'expense' ? 'income' : 'expense' }]) {
      const response = await request(app).put(`/api/favorite-movements/${rows[0].id}`)
        .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload(overrides));
      expect(response.statusCode).toBe(400);
    }
  });

  test('POST /api/favorite-movements enforces six favorites per user', async () => {
    for (let index = 2; index <= 6; index += 1) {
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
        alias: 'Fav 7',
      }));

    expect(limitRes.statusCode).toBe(400);
    expect(limitRes.body.error).toBe('Maximum favorite movements reached');
  });

  test('DELETE /api/favorite-movements/:id removes the current user favorite', async () => {
    const [favoriteRows] = await pool.query(
      'SELECT id FROM favorite_movements WHERE user_id = ? LIMIT 1',
      [testUserId]
    );
    const favoriteId = favoriteRows[0].id;

    const movement = await request(app).post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-09-14', type: category.type, category_id: category.id,
        concept_id: conceptId, description: 'Historical snapshot', amount: 42,
        account_id: accountId, source_favorite_id: favoriteId });
    expect(movement.statusCode).toBe(201);
    const [historyBefore] = await pool.query('SELECT * FROM expenses WHERE user_id = ?', [testUserId]);
    expect(historyBefore).toHaveLength(1);
    const edit = await request(app).put(`/api/favorite-movements/${favoriteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildFavoritePayload({ alias: 'Changed', description: 'New description', amount: 500 }));
    expect(edit.statusCode).toBe(200);
    const [historyAfterEdit] = await pool.query('SELECT * FROM expenses WHERE user_id = ?', [testUserId]);
    expect(historyAfterEdit).toEqual(historyBefore);

    const res = await request(app)
      .delete(`/api/favorite-movements/${favoriteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Favorite movement deleted successfully');

    const [remainingRows] = await pool.query(
      'SELECT id FROM favorite_movements WHERE id = ? AND user_id = ?',
      [favoriteId, testUserId]
    );

    expect(remainingRows.length).toBe(0);
    const [historyAfterDelete] = await pool.query('SELECT * FROM expenses WHERE user_id = ?', [testUserId]);
    expect(historyAfterDelete).toEqual(historyBefore);
  });

  const usage = async (id) => {
    const [rows] = await pool.query('SELECT usage_count FROM favorite_movements WHERE id = ?', [id]);
    return rows[0].usage_count;
  };
  const ownedFavoriteId = async () => {
    const [rows] = await pool.query('SELECT id FROM favorite_movements WHERE user_id = ? ORDER BY id', [testUserId]);
    return rows[0].id;
  };
  const movementPayload = (overrides = {}) => ({
    date: '2026-09-14', type: category.type, category_id: category.id,
    concept_id: conceptId, account_id: accountId, amount: 425,
    description: 'Adjusted before saving', ...overrides,
  });
  const postMovement = (payload) => request(app).post('/api/expenses')
    .set('Authorization', `Bearer ${token}`).send(payload);

  test('successful use increments the explicit origin once despite changed values and old dates', async () => {
    const id = await ownedFavoriteId();
    const before = await usage(id);
    const first = await postMovement(movementPayload({ source_favorite_id: id, date: '2025-01-01' }));
    expect(first.statusCode).toBe(201);
    expect(await usage(id)).toBe(before + 1);
    const second = await postMovement(movementPayload({ source_favorite_id: id, date: '2026-12-31', amount: 17, description: 'Different' }));
    expect(second.statusCode).toBe(201);
    expect(await usage(id)).toBe(before + 2);
    await request(app).get('/api/favorite-movements').set('Authorization', `Bearer ${token}`);
    expect(await usage(id)).toBe(before + 2);
    // Independent SQL reads prove this is persistent, not process/month state.
    const [history] = await pool.query('SELECT description, amount FROM expenses WHERE id = ?', [first.body.expense_id]);
    expect(history[0].description).toBe('Adjusted before saving');
    expect(Number(history[0].amount)).toBe(425);
  });

  test('manual creation, historical editing and validation failure do not count as template use', async () => {
    const id = await ownedFavoriteId();
    const before = await usage(id);
    const manual = await postMovement(movementPayload());
    expect(manual.statusCode).toBe(201);
    const edited = await request(app).put(`/api/expenses/${manual.body.expense_id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(movementPayload({ source_favorite_id: id, amount: 123 }));
    expect(edited.statusCode).toBe(200);
    const invalid = await postMovement(movementPayload({ source_favorite_id: id, amount: 0 }));
    expect(invalid.statusCode).toBe(400);
    expect(await usage(id)).toBe(before);
  });

  test('failed insertion cannot increment usage', async () => {
    const id = await ownedFavoriteId();
    const before = await usage(id);
    const insertion = jest.spyOn(Expense, 'create').mockRejectedValueOnce(new Error('Simulated insert failure'));
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const failed = await postMovement(movementPayload({ source_favorite_id: id }));
      expect(failed.statusCode).toBe(500);
      expect(await usage(id)).toBe(before);
    } finally { insertion.mockRestore(); errorLog.mockRestore(); }
  });

  test('metric failure preserves the committed movement and returns success without retrying the increment', async () => {
    const id = await ownedFavoriteId();
    const before = await usage(id);
    const increment = jest.spyOn(FavoriteMovement, 'increment').mockRejectedValueOnce(new Error('Simulated metric outage'));
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const saved = await postMovement(movementPayload({ source_favorite_id: id }));
      expect(saved.statusCode).toBe(201);
      expect(saved.body.usage_tracking_failed).toBe(true);
      expect(increment).toHaveBeenCalledTimes(1);
      expect(warning).toHaveBeenCalledWith('Favorite usage tracking failed after expense creation:', expect.objectContaining({ expenseId: saved.body.expense_id }));
      const [rows] = await pool.query('SELECT id FROM expenses WHERE id = ?', [saved.body.expense_id]);
      expect(rows).toHaveLength(1);
      expect(await usage(id)).toBe(before);
    } finally { increment.mockRestore(); warning.mockRestore(); }
  });

  test('foreign or deleted template origins cannot increment another user template', async () => {
    const [rows] = await pool.query('SELECT id FROM favorite_movements WHERE user_id = ?', [otherUserId]);
    const id = rows[0].id;
    const before = await usage(id);
    expect((await postMovement(movementPayload({ source_favorite_id: id }))).statusCode).toBe(201);
    expect((await postMovement(movementPayload({ source_favorite_id: 2147483647 }))).statusCode).toBe(201);
    expect(await usage(id)).toBe(before);
  });

  test('ranking uses lifetime count then creation time then stable ID, and template editing preserves it', async () => {
    const [rows] = await pool.query('SELECT id FROM favorite_movements WHERE user_id = ? ORDER BY id', [testUserId]);
    const ids = rows.map((row) => row.id);
    for (let index = 0; index < ids.length; index++) {
      await pool.query('UPDATE favorite_movements SET usage_count = ?, created_at = ? WHERE id = ?',
        [index < 3 ? 12 : 0, index === 0 ? '2026-02-01' : '2026-01-01', ids[index]]);
    }
    const expected = [ids[1], ids[2], ids[0], ...ids.slice(3)];
    const list = await request(app).get('/api/favorite-movements').set('Authorization', `Bearer ${token}`);
    expect(list.body.map((row) => row.id)).toEqual(expected);
    const edit = await request(app).put(`/api/favorite-movements/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload({ usage_count: 0 }));
    expect(edit.statusCode).toBe(200);
    expect(await usage(ids[0])).toBe(12);
    const use = await postMovement(movementPayload({ source_favorite_id: ids[0] }));
    expect(use.statusCode).toBe(201);
    const refreshed = await request(app).get('/api/favorite-movements').set('Authorization', `Bearer ${token}`);
    expect(refreshed.body[0].id).toBe(ids[0]);
    expect(refreshed.body[0].usage_count).toBe(13);
  });


  test('alias limit applies to create/edit while an unchanged legacy alias survives other edits', async () => {
    const id = await ownedFavoriteId();
    const beforeUsage = await usage(id);
    const tooLong = 'Cinepolis4DXPX';
    const rejectedCreate = await request(app).post('/api/favorite-movements')
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload({ alias: tooLong }));
    expect(rejectedCreate.statusCode).toBe(400);
    const rejectedEdit = await request(app).put(`/api/favorite-movements/${id}`)
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload({ alias: tooLong }));
    expect(rejectedEdit.statusCode).toBe(400);
    expect(rejectedEdit.body.error).toBe('Alias must be at most 13 characters');
    const accepted = await request(app).post('/api/favorite-movements')
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload({ alias: 'Cinepolis4DXP' }));
    expect(accepted.statusCode).toBe(201);
    expect(accepted.body.favorite.alias).toBe('Cinepolis4DXP');
    const legacyAlias = 'Legacy alias longer than twelve';
    await pool.query('UPDATE favorite_movements SET alias = ? WHERE id = ?', [legacyAlias, id]);
    const legacyEdit = await request(app).put(`/api/favorite-movements/${id}`)
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload({ alias: legacyAlias, description: 'Other field changed' }));
    expect(legacyEdit.statusCode).toBe(200);
    expect(legacyEdit.body.favorite.alias).toBe(legacyAlias);
    const changedLong = await request(app).put(`/api/favorite-movements/${id}`)
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload({ alias: legacyAlias + 'X' }));
    expect(changedLong.statusCode).toBe(400);
    const shortEdit = await request(app).put(`/api/favorite-movements/${id}`)
      .set('Authorization', `Bearer ${token}`).send(buildFavoritePayload({ alias: 'Cinepolis4DXP' }));
    expect(shortEdit.statusCode).toBe(200);
    expect(await usage(id)).toBe(beforeUsage);
  });

});
