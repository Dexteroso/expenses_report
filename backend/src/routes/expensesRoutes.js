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
 *           example:
 *             date: 2026-05-01
 *             type: expense
 *             category_id: 2
 *             concept_id: 4
 *             description: Fresko
 *             amount: 3500
 *             account_id: 2
 *     responses:
 *       201:
 *         description: Expense created
 *         content:
 *           application/json:
 *             example:
 *               message: Expense created successfully
 *               id: 12
 *               expense_code: EX260428001
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               error: Missing required fields
 *       401:
 *         description: Unauthorized
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
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
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
 */
router.delete('/:id', deleteExpense);

module.exports = router;
