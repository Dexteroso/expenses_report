const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getRealVsBudgetReport } = require('../controllers/reportsController');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/reports/real-vs-budget:
 *   get:
 *     summary: Get real vs budget report
 *     tags: [Reports]
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
 *         description: Report rows for all concepts and months
 *         content:
 *           application/json:
 *             example:
 *               - category_id: 1
 *                 category: Ingresos
 *                 category_type: income
 *                 concept_id: 4
 *                 concept: Salario
 *                 month: 1
 *                 budget: 6000
 *                 actual: 5800
 *                 deviation: 200
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/real-vs-budget', getRealVsBudgetReport);

module.exports = router;
