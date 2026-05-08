const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === 'production' ? false : false,
    define: {
      freezeTableName: true,
      timestamps: false,
    },
  }
);

const testSequelizeConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Sequelize MySQL connection established');
    return true;
  } catch (error) {
    console.warn('Sequelize MySQL connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  testSequelizeConnection,
};
