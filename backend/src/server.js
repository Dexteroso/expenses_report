const app = require('./app');
const connectMongo = require('./config/mongo');

const PORT = 3000;

connectMongo().finally(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
