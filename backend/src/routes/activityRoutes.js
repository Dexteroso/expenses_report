const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getActivityLogs } = require('../controllers/activityController');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/activity:
 *   get:
 *     summary: Get activity audit logs
 *     description: Returns MongoDB-backed activity logs. Regular users receive only their own logs. Admin users can request all users by passing allUsers=true.
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, yesterday, last3, last7, last30, all]
 *           default: today
 *         example: last7
 *       - in: query
 *         name: allUsers
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         example: true
 *         description: Admin-only option. When true, returns activity for all users.
 *     responses:
 *       200:
 *         description: Activity logs sorted newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 6653b62f8ddab62d6dfcf701
 *                   userId:
 *                     type: integer
 *                     example: 1
 *                   actorName:
 *                     type: string
 *                     example: Angel Solano
 *                   actorEmail:
 *                     type: string
 *                     format: email
 *                     example: ad.solano@icloud.com
 *                   eventType:
 *                     type: string
 *                     example: expense.created
 *                   entityType:
 *                     type: string
 *                     example: expense
 *                   entityId:
 *                     oneOf:
 *                       - type: integer
 *                       - type: string
 *                     example: 12
 *                   description:
 *                     type: string
 *                     example: Expense created
 *                   metadata:
 *                     type: object
 *                     additionalProperties: true
 *                     example:
 *                       expenseCode: EX260012
 *                       categoryName: Transporte
 *                       amount: 450
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2026-05-14T18:35:00.000Z
 *             example:
 *               - _id: 6653b62f8ddab62d6dfcf701
 *                 userId: 1
 *                 actorName: Angel Solano
 *                 actorEmail: ad.solano@icloud.com
 *                 eventType: auth.login_success
 *                 entityType: auth
 *                 entityId: 1
 *                 description: Login successful
 *                 metadata:
 *                   userName: Angel Solano
 *                   userEmail: ad.solano@icloud.com
 *                 createdAt: 2026-05-14T18:35:00.000Z
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
 *               error: Error fetching activity logs
 */
router.get('/', getActivityLogs);

module.exports = router;
