const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const {
  getUsers,
  updateUser,
  deactivateUser,
  activateUser,
} = require('../controllers/usersController');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 name: Angel Solano
 *                 email: ad.solano@icloud.com
 *                 role: admin
 *                 is_active: true
 *                 created_at: 2026-04-01T10:00:00.000Z
 *                 updated_at: 2026-04-28T08:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error fetching users
 */
router.get('/', getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *               is_active:
 *                 type: boolean
 *           example:
 *             name: Angel Solano
 *             email: ad.solano@icloud.com
 *             role: admin
 *             is_active: true
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             example:
 *               message: User updated successfully
 *               user:
 *                 id: 1
 *                 name: Angel Solano
 *                 email: ad.solano@icloud.com
 *                 role: admin
 *                 is_active: true
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             example:
 *               error: Email already exists
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error updating user
 */
router.put('/:id', updateUser);

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: User deactivated
 *         content:
 *           application/json:
 *             example:
 *               message: User deactivated successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Cannot deactivate own account
 *         content:
 *           application/json:
 *             example:
 *               error: Cannot deactivate your own account
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error deactivating user
 */
router.patch('/:id/deactivate', deactivateUser);

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: User activated
 *         content:
 *           application/json:
 *             example:
 *               message: User activated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             example:
 *               error: Error activating user
 */
router.patch('/:id/activate', activateUser);

module.exports = router;
