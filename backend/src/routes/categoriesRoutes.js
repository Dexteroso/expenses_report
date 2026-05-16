const express = require('express');
const { getCategories } = require('../controllers/categoriesController');

const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get category catalog
 *     description: Returns the shared income and expense category catalog used by movements, budgets, and reports.
 *     tags: [Categories]
 *     security: []
 *     responses:
 *       200:
 *         description: List of categories ordered by name
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 2
 *                   name:
 *                     type: string
 *                     example: Alimentos
 *                   type:
 *                     type: string
 *                     enum: [income, expense]
 *                     example: expense
 *             example:
 *               - id: 2
 *                 name: Alimentos
 *                 type: expense
 *               - id: 1
 *                 name: Ingresos
 *                 type: income
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error fetching categories
 */
router.get('/', getCategories);

module.exports = router;
