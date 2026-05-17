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

const requiredProductionEmailEnv = [
  'RESEND_API_KEY',
  'EMAIL_FROM',
];

const validateStartupEnv = () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const requiredVariables = [...requiredProductionEnv];

  if (process.env.PASSWORD_RESET_EMAIL_ENABLED !== 'false') {
    requiredVariables.push(...requiredProductionEmailEnv);
  }

  const missingVariables = requiredVariables.filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingVariables.join(', ')}`
    );
  }
};

module.exports = {
  validateStartupEnv,
};
