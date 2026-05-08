const mongoose = require('mongoose');
require('dotenv').config();

const connectMongo = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('MongoDB URI not configured. Activity logging is disabled.');
    return null;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for activity logs');
    return mongoose.connection;
  } catch (error) {
    console.warn('MongoDB connection failed. Activity logging is disabled.', error.message);
    return null;
  }
};

module.exports = connectMongo;
