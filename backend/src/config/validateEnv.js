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
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
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

  if (process.env.SMTP_PORT && Number.isNaN(Number(process.env.SMTP_PORT))) {
    throw new Error('Invalid production environment variable: SMTP_PORT must be a number');
  }
};

module.exports = {
  validateStartupEnv,
};
