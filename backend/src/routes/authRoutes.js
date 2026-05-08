const express = require('express');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Angel Solano
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ad.solano@icloud.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *           example:
 *             name: Angel Solano
 *             email: ad.solano@icloud.com
 *             password: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             example:
 *               message: User registered successfully
 *               user:
 *                 id: 1
 *                 name: Angel Solano
 *                 email: ad.solano@icloud.com
 *                 role: user
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             examples:
 *               passwordTooShort:
 *                 value:
 *                   error: Password must be at least 8 characters
 *               duplicateEmail:
 *                 value:
 *                   error: Email already exists
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ad.solano@icloud.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *           example:
 *             email: ad.solano@icloud.com
 *             password: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             example:
 *               message: Login successful
 *               token: jwt_token_here
 *               user:
 *                 id: 1
 *                 name: Angel Solano
 *                 email: ad.solano@icloud.com
 *                 role: admin
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               error: Email and password are required
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             examples:
 *               invalidCredentials:
 *                 value:
 *                   error: Invalid email or password
 *               inactiveUser:
 *                 value:
 *                   error: User is inactive
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Generate password reset token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ad.solano@icloud.com
 *           example:
 *             email: ad.solano@icloud.com
 *     responses:
 *       200:
 *         description: Password reset flow started
 *         content:
 *           application/json:
 *             examples:
 *               tokenGenerated:
 *                 value:
 *                   message: Password reset token generated
 *                   resetToken: reset_token_here
 *                   expiresInMinutes: 60
 *               generic:
 *                 value:
 *                   message: If the email exists, reset instructions will be sent
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               error: Email is required
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 example: reset_token_here
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: newpassword123
 *           example:
 *             token: reset_token_here
 *             newPassword: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Password reset successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             examples:
 *               shortPassword:
 *                 value:
 *                   error: Password must be at least 8 characters
 *               invalidToken:
 *                 value:
 *                   error: Invalid or expired reset token
 */
router.post('/reset-password', resetPassword);

module.exports = router;
