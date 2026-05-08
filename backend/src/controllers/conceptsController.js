const pool = require('../config/db');

const getConcepts = async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = `
      SELECT id, name, category_id
      FROM concepts
    `;

    let params = [];

    if (category_id) {
      query += ' WHERE category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY name';

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching concepts' });
  }
};

module.exports = {
  getConcepts,
};