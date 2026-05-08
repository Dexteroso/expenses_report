const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Expenses endpoints', () => {
    let token;
    let testUser;
    let testUserId;
    let testAccountId;
    let categoryId;
    let conceptId;
    let expenseId;
    let expenseCode;
    let secondExpenseId;
    let secondExpenseCode;

    beforeAll(async () => {
        testUser = {
            name: 'Expenses Test User',
            email: `expenses_test_${Date.now()}@example.com`,
            password: 'password123',
        };

        const registerRes = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(registerRes.statusCode).toBe(201);
        expect(registerRes.body.user.id).toBeDefined();
        testUserId = registerRes.body.user.id;

        // Login user
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password,
            });

        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body.token).toBeDefined();
        token = loginRes.body.token;

        const accountRes = await request(app)
            .post('/api/accounts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                bank_name: 'Expenses Test Bank',
                last_four: '1234',
                account_type: 'debit',
                billing_cycle_end_day: null,
            });

        expect(accountRes.statusCode).toBe(201);
        expect(accountRes.body.account_id).toBeDefined();
        testAccountId = accountRes.body.account_id;

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
        await pool.query('DELETE FROM users WHERE email = ?', [testUser.email]);
        await pool.end();
    });

    test('GET /api/expenses with token returns 200', async () => {
        const res = await request(app)
            .get('/api/expenses')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
    });

    const buildExpensePayload = (overrides = {}) => ({
        date: '2026-05-01',
        amount: 100,
        category_id: categoryId,
        concept_id: conceptId,
        description: 'Test expense',
        account_id: testAccountId,
        type: 'expense',
        ...overrides,
    });

    test('POST /api/expenses creates yearly sequential expense codes', async () => {
        const expense = {
            ...buildExpensePayload(),
        };
        const secondExpense = {
            ...buildExpensePayload({
                date: '2026-05-02',
                amount: 200,
                description: 'Second test expense',
            }),
        };

        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .send(expense);
        const secondRes = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .send(secondExpense);

        expect(res.statusCode).toBe(201);
        expect(secondRes.statusCode).toBe(201);

        const currentYearPrefix = `EX${String(new Date().getFullYear()).slice(-2)}`;
        expect(res.body.expense_code).toMatch(new RegExp(`^${currentYearPrefix}\\d{4}$`));
        expect(secondRes.body.expense_code).toMatch(new RegExp(`^${currentYearPrefix}\\d{4}$`));

        const firstSequence = Number(res.body.expense_code.slice(currentYearPrefix.length));
        const secondSequence = Number(secondRes.body.expense_code.slice(currentYearPrefix.length));
        expect(secondSequence).toBe(firstSequence + 1);

        expenseId = res.body.id || res.body.expense_id || res.body.expense?.id;
        expenseCode = res.body.expense_code;
        secondExpenseId = secondRes.body.id || secondRes.body.expense_id || secondRes.body.expense?.id;
        secondExpenseCode = secondRes.body.expense_code;
        expect(expenseId).toBeDefined();
        expect(expenseCode).toBeDefined();
        expect(secondExpenseId).toBeDefined();
        expect(secondExpenseCode).toBeDefined();
    });

    test('PUT /api/expenses/:id does not change expense_code', async () => {
        const updatedExpense = {
            date: '2026-05-02',
            amount: 150,
            category_id: categoryId,
            concept_id: conceptId,
            description: 'Updated test expense',
            account_id: testAccountId,
            type: 'expense',
        };

        const res = await request(app)
            .put(`/api/expenses/${expenseId}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updatedExpense);

        expect(res.statusCode).toBe(200);

        const getRes = await request(app)
            .get('/api/expenses')
            .set('Authorization', `Bearer ${token}`);
        const updatedRow = getRes.body.find((expense) => expense.id === expenseId);

        expect(getRes.statusCode).toBe(200);
        expect(updatedRow).toBeDefined();
        expect(updatedRow.expense_code).toBe(expenseCode);
    });

    test('DELETE /api/expenses/:id returns a success status', async () => {
        const res = await request(app)
            .delete(`/api/expenses/${expenseId}`)
            .set('Authorization', `Bearer ${token}`);

        expect([200, 204]).toContain(res.statusCode);
    });

    test('POST /api/expenses with invalid data returns an error status', async () => {
        const invalidExpense = {
            amount: -100,
        };

        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .send(invalidExpense);

        expect(res.statusCode).toBe(400);
    });
});
