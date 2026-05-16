require('dotenv').config();

const requiredProductionEnv = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'FRONTEND_URL',
  'API_URL',
  'MONGO_URI',
];

const validateStartupEnv = () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const missingVariables = requiredProductionEnv.filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingVariables.join(', ')}`
    );
  }
};

module.exports = {
  validateStartupEnv,
};
