const pool = require('../config/db');
const { logActivity } = require('../utils/activityLogger');

const buildChangedFields = (beforeUser, afterUser) => {
  const fieldComparisons = [
    { field: 'name', from: beforeUser.name, to: afterUser.name },
    { field: 'email', from: beforeUser.email, to: afterUser.email },
    { field: 'role', from: beforeUser.role, to: afterUser.role },
    {
      field: 'is_active',
      from: Boolean(beforeUser.is_active),
      to: Boolean(afterUser.is_active),
    },
  ];

  return fieldComparisons.filter(({ from, to }) => from !== to);
};

const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

const updateUser = async (req, res) => {
  try {
    const adminUserId = req.user.id;
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;

    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const [existingRows] = await pool.query(
      `
        SELECT id, name, email, role, is_active
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = existingRows[0];

    if (Number(id) === adminUserId) {
      if (role && role !== 'admin') {
        return res.status(400).json({ error: 'Cannot change your own admin role' });
      }

      if (is_active === false || is_active === 0) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }
    }

    if (email) {
      const [emailRows] = await pool.query(
        `
        SELECT id
        FROM users
        WHERE email = ? AND id <> ?
        LIMIT 1
        `,
        [email, id]
      );

      if (emailRows.length > 0) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }

    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email);
    }

    if (role !== undefined) {
      fields.push('role = ?');
      values.push(role);
    }

    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(Boolean(is_active));
    }

    if (fields.length === 0) {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          name,
          email,
          role,
          is_active,
          created_at,
          updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      return res.json({
        message: 'User updated successfully',
        user: rows[0],
      });
    }

    values.push(id);

    await pool.query(
      `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = ?
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    logActivity({
      user: req.user,
      eventType: 'user.updated',
      entityType: 'user',
      entityId: Number(id),
      description: 'User updated',
      metadata: {
        targetUserId: rows[0].id,
        targetName: rows[0].name,
        targetEmail: rows[0].email,
        role: rows[0].role,
        isActive: Boolean(rows[0].is_active),
        changedFields: buildChangedFields(existingUser, rows[0]),
      },
    });

    res.json({
      message: 'User updated successfully',
      user: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating user' });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const adminUserId = req.user.id;
    const { id } = req.params;

    if (Number(id) === adminUserId) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const [targetRows] = await pool.query(
      `
      SELECT id, name, email, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    const [result] = await pool.query(
      `
      UPDATE users
      SET is_active = false
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logActivity({
      user: req.user,
      eventType: 'user.deactivated',
      entityType: 'user',
      entityId: Number(id),
      description: 'User deactivated',
      metadata: {
        targetUserId: targetRows[0]?.id,
        targetName: targetRows[0]?.name,
        targetEmail: targetRows[0]?.email,
        role: targetRows[0]?.role,
      },
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deactivating user' });
  }
};

const activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [targetRows] = await pool.query(
      `
      SELECT id, name, email, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    const [result] = await pool.query(
      `
      UPDATE users
      SET is_active = true
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logActivity({
      user: req.user,
      eventType: 'user.activated',
      entityType: 'user',
      entityId: Number(id),
      description: 'User activated',
      metadata: {
        targetUserId: targetRows[0]?.id,
        targetName: targetRows[0]?.name,
        targetEmail: targetRows[0]?.email,
        role: targetRows[0]?.role,
      },
    });

    res.json({ message: 'User activated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error activating user' });
  }
};

module.exports = {
  getUsers,
  updateUser,
  deactivateUser,
  activateUser,
};
