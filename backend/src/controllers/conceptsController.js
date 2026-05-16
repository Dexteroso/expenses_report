const pool = require('../config/db');
const { isIntegerValue } = require('../utils/validators');

const getConcepts = async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = `
      SELECT id, name, category_id
      FROM concepts
    `;

    let params = [];

    if (category_id) {
      if (!isIntegerValue(category_id)) {
        return res.status(400).json({ error: 'category_id must be an integer' });
      }

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
