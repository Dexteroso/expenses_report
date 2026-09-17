const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
} = require('../controllers/expensesController');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get user expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-05-01
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-05-31
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         example: 2
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         example: 2026
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         example: 5
 *       - in: query
 *         name: concept_id
 *         schema:
 *           type: integer
 *         example: 4
 *       - in: query
 *         name: account_id
 *         schema:
 *           type: integer
 *         example: 2
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         example: expense
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 5
 *     responses:
 *       200:
 *         description: List of expenses
 *         content:
 *           application/json:
 *             example:
 *               - id: 12
 *                 expense_code: EX260428001
 *                 date: 2026-05-01
 *                 type: expense
 *                 tipo: Egreso
 *                 category_id: 2
 *                 category: Alimentos
 *                 concept_id: 4
 *                 concept: Supermercado
 *                 description: Fresko
 *                 amount: 3500
 *                 account_id: 2
 *                 account_alias: Banamex 1677
 *                 account_type: Crédito
 *                 billing_cycle_end_day: 9
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               error: Authentication token missing
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error fetching expenses
 */
router.get('/', getExpenses);

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, type, category_id, concept_id, amount, account_id]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               category_id:
 *                 type: integer
 *               concept_id:
 *                 type: integer
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               account_id:
 *                 type: integer
 *               budget_confirmation:
 *                 type: boolean
 *                 description: Explicit permission to save despite budget impact. Only literal true bypasses the advisory warning; reassignment source validation always applies.
 *               budget_reassignment:
 *                 type: object
 *                 description: Optional allocation change committed atomically with this expense. Requires budget_confirmation true. Partial coverage is allowed.
 *                 required: [sources]
 *                 properties:
 *                   sources:
 *                     type: array
 *                     minItems: 1
 *                     items:
 *                       type: object
 *                       required: [concept_id, amount]
 *                       properties:
 *                         concept_id: { type: integer }
 *                         amount: { type: string, example: '500.00', description: Positive exact decimal with at most two fractional digits }
 *               source_favorite_id:
 *                 type: integer
 *                 description: Optional originating template ID. Successful creation atomically increments the owning user's template lifetime count; edited draft fields do not change the origin.
 *           example:
 *             date: 2026-05-01
 *             type: expense
 *             category_id: 2
 *             concept_id: 4
 *             description: Fresko
 *             amount: 3500
 *             account_id: 2
 *     responses:
 *       409:
 *         description: No writes occurred. REASSIGNMENT_SOURCE_CHANGED includes conflicts and refreshed discovery; selections must be corrected manually. BUDGET_CONFIRMATION_REQUIRED includes requiresConfirmation and budgetImpact (status, date/year/month, catalog IDs/names, currency, budget, currentSpent, available, newAmount, projectedSpent, projectedAvailable, currentOverage, projectedOverage). Monetary fields are two-decimal strings. BUDGET_CHECK_UNAVAILABLE also permits explicit confirmation without a budget read.
 *       201:
 *         description: Expense created. Reassignment returns budgetReassignment with period, source/destination IDs and names, before/after budgets, amounts, remaining overage and expense linkage. If optional usage tracking fails, this still returns 201 with usage_tracking_failed true; do not retry movement creation.
 *         content:
 *           application/json:
 *             example:
 *               message: Expense created successfully
 *               expense_id: 12
 *               expense_code: EX260428001
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               error: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error creating expense
 */
router.post('/', createExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 12
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, type, category_id, concept_id, amount, account_id]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               category_id:
 *                 type: integer
 *               concept_id:
 *                 type: integer
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               account_id:
 *                 type: integer
 *               budget_confirmation:
 *                 type: boolean
 *                 description: Accept the edited result even if it exceeds budget.
 *               budget_reassignment:
 *                 type: object
 *                 description: Same sources contract as POST; allocation changes and this edit commit together. Previous transfers are never automatically reversed.
 *                 properties:
 *                   sources:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required: [concept_id, amount]
 *                       properties:
 *                         concept_id: { type: integer }
 *                         amount: { type: string, example: '100.00' }
 *           example:
 *             date: 2026-05-01
 *             type: expense
 *             category_id: 2
 *             concept_id: 4
 *             description: Fresko editado
 *             amount: 3600
 *             account_id: 2
 *     responses:
 *       200:
 *         description: Expense updated
 *         content:
 *           application/json:
 *             example:
 *               message: Expense updated successfully
 *       409:
 *         description: Budget warning evaluates the edited destination after removing the old movement impact. Reassignment source conflicts return refreshed balances. No financial writes committed.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error updating expense
 */
router.put('/:id', updateExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 12
 *     responses:
 *       200:
 *         description: Expense deleted
 *         content:
 *           application/json:
 *             example:
 *               message: Expense deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error deleting expense
 */
router.delete('/:id', deleteExpense);

module.exports = router;
