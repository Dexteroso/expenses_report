const pool = require('../config/db');

const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, type
      FROM categories
      ORDER BY name
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching categories' });
  }
};

module.exports = {
  getCategories,
};