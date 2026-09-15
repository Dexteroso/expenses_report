const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getFavoriteMovements,
  createFavoriteMovement,
  updateFavoriteMovement,
  deleteFavoriteMovement,
} = require('../controllers/favoriteMovementsController');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/favorite-movements:
 *   get:
 *     summary: Get favorite movement presets
 *     description: Returns up to six favorite movement presets for the authenticated user.
 *     tags: [Favorite Movements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite movement presets ordered by lifetime usage descending, then creation time and ID ascending
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
 *                   amount:
 *                     type: number
 *                     nullable: true
 *                   usage_count:
 *                     type: integer
 *                     readOnly: true
 *                     description: Lifetime count of successfully created movements from this template.
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
 *     description: Creates a reusable movement preset for the authenticated user. Amount is optional for legacy clients; null means it is entered when used. No historical movement is required.
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
 *                 maxLength: 13
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
 *               amount:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0.01
 *                 maximum: 99999999.99
 *                 multipleOf: 0.01
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
 *         description: Validation error, invalid references, or six-favorite limit reached
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

/**
 * @swagger
 * /api/favorite-movements/{id}:
 *   put:
 *     summary: Update an independent frequent template
 *     description: Accepts the same fields as POST. All existing required fields must be supplied. Omitted amount preserves its value; null clears it. Ownership and references are validated. Usage count and creation time cannot be edited. Historical movements are unaffected.
 *     tags: [Favorite Movements]
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
 *           schema:
 *             type: object
 *             required: [emoji, alias, color, type, category_id, concept_id, description, account_id]
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: 🚕
 *               alias:
 *                 type: string
 *                 description: New or changed aliases allow at most 13 characters. An unchanged legacy alias may be preserved.
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
 *               amount:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0.01
 *                 maximum: 99999999.99
 *                 multipleOf: 0.01
 *               account_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Updated template in the favorite property
 *       400:
 *         description: Invalid fields or references
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found for the current user
 *       500:
 *         description: Server error
 */
router.put('/:id', updateFavoriteMovement);

module.exports = router;
