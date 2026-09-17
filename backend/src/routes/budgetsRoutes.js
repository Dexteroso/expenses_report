const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getBudgets,
  saveBudgets,
  discoverReassignmentSources,
} = require('../controllers/budgetsController');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/budgets/reassignment-sources:
 *   get:
 *     summary: Advisory expense-budget sources for a movement (no reservations)
 *     tags: [Budgets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: date, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: concept_id, required: true, schema: { type: integer } }
 *       - { in: query, name: amount, required: true, schema: { type: number } }
 *       - { in: query, name: expense_id, schema: { type: integer }, description: Owned movement being edited; excludes its old impact from donor availability. }
 *     responses:
 *       200:
 *         description: Destination impact, sameCategoryAvailable, totalAvailable and eligible expense categories/concepts. Currency values are decimal strings.
 *       400:
 *         description: Invalid movement inputs
 *       401:
 *         description: Unauthorized
 */
router.get('/reassignment-sources', discoverReassignmentSources);

/**
 * @swagger
 * /api/budgets:
 *   get:
 *     summary: Get budgets
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2026
 *     responses:
 *       200:
 *         description: List of budget rows
 *         content:
 *           application/json:
 *             example:
 *               - category_id: 1
 *                 category: Ingresos
 *                 category_type: income
 *                 concept_id: 4
 *                 concept: Salario
 *                 month: 1
 *                 amount: 6000
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error fetching budgets
 */
router.get('/', getBudgets);

/**
 * @swagger
 * /api/budgets:
 *   put:
 *     summary: Update budgets
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [year, items]
 *             properties:
 *               year:
 *                 type: integer
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [concept_id, month, amount]
 *                   properties:
 *                     concept_id:
 *                       type: integer
 *                     month:
 *                       type: integer
 *                     amount:
 *                       type: number
 *           example:
 *             year: 2026
 *             items:
 *               - concept_id: 4
 *                 month: 1
 *                 amount: 6000
 *     responses:
 *       200:
 *         description: Budgets updated
 *         content:
 *           application/json:
 *             example:
 *               message: Budgets saved successfully
 *               saved: 1
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error saving budgets
 */
router.put('/', saveBudgets);

module.exports = router;
