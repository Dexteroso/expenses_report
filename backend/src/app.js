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

const app = express();

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
app.use(cors());
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
