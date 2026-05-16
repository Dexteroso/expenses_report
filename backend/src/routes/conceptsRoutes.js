const express = require('express');
const { getConcepts } = require('../controllers/conceptsController');

const router = express.Router();

/**
 * @swagger
 * /api/concepts:
 *   get:
 *     summary: Get concept catalog
 *     description: Returns concepts ordered by name. Optionally filters concepts by category.
 *     tags: [Concepts]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         required: false
 *         schema:
 *           type: integer
 *         example: 2
 *         description: Category id used to filter concepts.
 *     responses:
 *       200:
 *         description: List of concepts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 4
 *                   name:
 *                     type: string
 *                     example: Supermercado
 *                   category_id:
 *                     type: integer
 *                     example: 2
 *             example:
 *               - id: 4
 *                 name: Supermercado
 *                 category_id: 2
 *               - id: 5
 *                 name: Restaurantes
 *                 category_id: 2
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error fetching concepts
 */
router.get('/', getConcepts);

module.exports = router;
