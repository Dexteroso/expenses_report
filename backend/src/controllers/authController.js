const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { logActivity } = require('../utils/activityLogger');

const SALT_ROUNDS = 10;

const getResetTokenExpiresAt = () => {
  const expiresInMinutes = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES) || 60;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

  return {
    expiresAt,
    expiresInMinutes,
  };
};

const buildSafeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const [existingUsers] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      `
      INSERT INTO users (name, email, password, role, is_active)
      VALUES (?, ?, ?, 'user', true)
      `,
      [name, email, hashedPassword]
    );

    logActivity({
      user: {
        id: result.insertId,
        name,
        email,
      },
      eventType: 'user.created',
      entityType: 'user',
      entityId: result.insertId,
      description: 'User registered',
      metadata: {
        role: 'user',
      },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        name,
        email,
        role: 'user',
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registering user' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT secret is not configured' });
    }

    const [rows] = await pool.query(
      `
      SELECT id, name, email, password, role, is_active
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      logActivity({
        user: { email },
        eventType: 'auth.login_failed',
        entityType: 'auth',
        description: 'Login failed',
        metadata: {
          attemptedEmail: email,
          reason: 'user_not_found',
        },
      });

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.is_active) {
      logActivity({
        user,
        eventType: 'auth.login_failed',
        entityType: 'auth',
        entityId: user.id,
        description: 'Login failed for inactive user',
        metadata: {
          attemptedEmail: email,
          userName: user.name,
          userEmail: user.email,
          reason: 'inactive_user',
        },
      });

      return res.status(403).json({ error: 'User is inactive' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logActivity({
        user,
        eventType: 'auth.login_failed',
        entityType: 'auth',
        entityId: user.id,
        description: 'Login failed',
        metadata: {
          attemptedEmail: email,
          userName: user.name,
          userEmail: user.email,
          reason: 'invalid_password',
        },
      });

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    logActivity({
      user,
      eventType: 'auth.login_success',
      entityType: 'auth',
      entityId: user.id,
      description: 'Login successful',
      metadata: {
        userName: user.name,
        userEmail: user.email,
      },
    });

    res.json({
      message: 'Login successful',
      token,
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const [rows] = await pool.query(
      `
      SELECT id, name, email
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      return res.json({
        message: 'If the email exists, reset instructions will be sent',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const { expiresAt, expiresInMinutes } = getResetTokenExpiresAt();

    await pool.query(
      `
      UPDATE users
      SET reset_token = ?, reset_token_expires = ?
      WHERE id = ?
      `,
      [resetToken, expiresAt, rows[0].id]
    );

    logActivity({
      user: rows[0],
      eventType: 'auth.password_reset_requested',
      entityType: 'auth',
      entityId: rows[0].id,
      description: 'Password reset requested',
    });

    const response = {
      message: 'Password reset token generated',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = resetToken;
      response.expiresInMinutes = expiresInMinutes;
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error generating reset token' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const [rows] = await pool.query(
      `
      SELECT id, name, email
      FROM users
      WHERE reset_token = ?
        AND reset_token_expires > NOW()
      LIMIT 1
      `,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      `
      UPDATE users
      SET
        password = ?,
        reset_token = NULL,
        reset_token_expires = NULL
      WHERE id = ?
      `,
      [hashedPassword, rows[0].id]
    );

    logActivity({
      user: rows[0],
      eventType: 'auth.password_reset_completed',
      entityType: 'auth',
      entityId: rows[0].id,
      description: 'Password reset completed',
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error resetting password' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};
