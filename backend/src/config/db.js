const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const originalEnd = pool.end.bind(pool);

pool.end = async (...args) => {
  try {
    const { sequelize } = require('./sequelize');
    await sequelize.close();
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Sequelize close skipped:', error.message);
    }
  }

  return originalEnd(...args);
};

module.exports = pool;
