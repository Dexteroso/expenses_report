const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const pool = require('./config/db');
const swaggerSpec = require('./config/swagger');
const categoriesRoutes = require('./routes/categoriesRoutes');
const conceptsRoutes = require('./routes/conceptsRoutes');
const expensesRoutes = require('./routes/expensesRoutes');
const accountsRoutes = require('./routes/accountsRoutes');
const budgetsRoutes = require('./routes/budgetsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const activityRoutes = require('./routes/activityRoutes');
const favoriteMovementsRoutes = require('./routes/favoriteMovementsRoutes');

const app = express();
const localFrontendUrl = 'http://localhost:5173';
const localBackendUrl = 'http://localhost:3000';
const localBackendIpUrl = 'http://127.0.0.1:3000';
const configuredFrontendUrl = process.env.FRONTEND_URL;
const configuredApiUrl = process.env.API_URL;
const allowedOrigins = new Set(
  [
    localFrontendUrl,
    localBackendUrl,
    localBackendIpUrl,
    configuredFrontendUrl,
    configuredFrontendUrl?.replace(/\/$/, ''),
    configuredApiUrl,
    configuredApiUrl?.replace(/\/$/, ''),
  ].filter(Boolean)
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    error: 'Too many requests, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many authentication attempts, please try again later.'
  }
});

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', apiLimiter);
app.use('/api/categories', categoriesRoutes);
app.use('/api/concepts', conceptsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/favorite-movements', favoriteMovementsRoutes);


app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB connection failed' });
  }
});


app.get('/', (req, res) => {
  res.json({ message: 'Expenses Report API is running' });
});

module.exports = app;
