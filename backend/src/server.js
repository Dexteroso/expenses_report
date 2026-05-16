const { validateStartupEnv } = require('./config/validateEnv');

validateStartupEnv();

const app = require('./app');
const connectMongo = require('./config/mongo');

const PORT = process.env.PORT || 3000;

connectMongo().finally(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
