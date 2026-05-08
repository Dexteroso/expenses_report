const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
} = require('../controllers/accountsController');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Get user accounts
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accounts
 *         content:
 *           application/json:
 *             example:
 *               - id: 2
 *                 bank_name: Banamex
 *                 last_four: "1677"
 *                 account_alias: Banamex 1677
 *                 account_type: credit
 *                 billing_cycle_end_day: 9
 *       401:
 *         description: Unauthorized
 */
router.get('/', getAccounts);

/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Create account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bank_name, last_four, account_type]
 *             properties:
 *               bank_name:
 *                 type: string
 *               last_four:
 *                 type: string
 *               account_type:
 *                 type: string
 *                 enum: [debit, credit, cash, savings, investment]
 *               billing_cycle_end_day:
 *                 type: integer
 *           example:
 *             bank_name: Banamex
 *             last_four: "1677"
 *             account_type: credit
 *             billing_cycle_end_day: 9
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             example:
 *               message: Account created successfully
 *               id: 2
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', createAccount);

/**
 * @swagger
 * /api/accounts/{id}:
 *   put:
 *     summary: Update account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             bank_name: Santander
 *             last_four: "4603"
 *             account_type: credit
 *             billing_cycle_end_day: 9
 *     responses:
 *       200:
 *         description: Account updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 */
router.put('/:id', updateAccount);

/**
 * @swagger
 * /api/accounts/{id}/deactivate:
 *   patch:
 *     summary: Deactivate account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account deactivated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 */
router.patch('/:id/deactivate', deactivateAccount);

module.exports = router;
