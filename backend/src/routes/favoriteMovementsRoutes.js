const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getFavoriteMovements,
  createFavoriteMovement,
  deleteFavoriteMovement,
} = require('../controllers/favoriteMovementsController');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/favorite-movements:
 *   get:
 *     summary: Get favorite movement presets
 *     description: Returns up to five favorite movement presets for the authenticated user.
 *     tags: [Favorite Movements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite movement presets ordered by creation time
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   emoji:
 *                     type: string
 *                     example: 😎
 *                   alias:
 *                     type: string
 *                     example: Uber
 *                   color:
 *                     type: string
 *                     example: "#005496"
 *                   type:
 *                     type: string
 *                     enum: [income, expense]
 *                     example: expense
 *                   category_id:
 *                     type: integer
 *                     example: 3
 *                   concept_id:
 *                     type: integer
 *                     example: 11
 *                   description:
 *                     type: string
 *                     example: Uber
 *                   account_id:
 *                     type: integer
 *                     example: 2
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2026-05-14T18:30:00.000Z
 *             example:
 *               - id: 1
 *                 emoji: 🚕
 *                 alias: Uber
 *                 color: "#005496"
 *                 type: expense
 *                 category_id: 3
 *                 concept_id: 11
 *                 description: Uber
 *                 account_id: 2
 *                 created_at: 2026-05-14T18:30:00.000Z
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error fetching favorite movements
 */
router.get('/', getFavoriteMovements);

/**
 * @swagger
 * /api/favorite-movements:
 *   post:
 *     summary: Create favorite movement preset
 *     description: Creates a reusable movement preset for the authenticated user. Amount is intentionally not stored.
 *     tags: [Favorite Movements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emoji, alias, color, type, category_id, concept_id, description, account_id]
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: 🚕
 *               alias:
 *                 type: string
 *                 maxLength: 40
 *                 example: Uber
 *               color:
 *                 type: string
 *                 maxLength: 20
 *                 example: "#005496"
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: expense
 *               category_id:
 *                 type: integer
 *                 example: 3
 *               concept_id:
 *                 type: integer
 *                 example: 11
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 example: Uber
 *               account_id:
 *                 type: integer
 *                 example: 2
 *           example:
 *             emoji: 🚕
 *             alias: Uber
 *             color: "#005496"
 *             type: expense
 *             category_id: 3
 *             concept_id: 11
 *             description: Uber
 *             account_id: 2
 *     responses:
 *       201:
 *         description: Favorite movement created
 *         content:
 *           application/json:
 *             example:
 *               message: Favorite movement created successfully
 *               favorite:
 *                 id: 1
 *                 emoji: 🚕
 *                 alias: Uber
 *                 color: "#005496"
 *                 type: expense
 *                 category_id: 3
 *                 concept_id: 11
 *                 description: Uber
 *                 account_id: 2
 *                 created_at: 2026-05-14T18:30:00.000Z
 *       400:
 *         description: Validation error, invalid references, or five-favorite limit reached
 *         content:
 *           application/json:
 *             examples:
 *               missingFields:
 *                 value:
 *                   error: Missing required fields
 *               maxReached:
 *                 value:
 *                   error: Maximum favorite movements reached
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error creating favorite movement
 */
router.post('/', createFavoriteMovement);

/**
 * @swagger
 * /api/favorite-movements/{id}:
 *   delete:
 *     summary: Delete favorite movement preset
 *     tags: [Favorite Movements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Favorite movement deleted
 *         content:
 *           application/json:
 *             example:
 *               message: Favorite movement deleted successfully
 *       400:
 *         description: Invalid favorite movement id
 *         content:
 *           application/json:
 *             example:
 *               error: Invalid favorite movement id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Favorite movement not found
 *         content:
 *           application/json:
 *             example:
 *               error: Favorite movement not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error deleting favorite movement
 */
router.delete('/:id', deleteFavoriteMovement);

module.exports = router;
