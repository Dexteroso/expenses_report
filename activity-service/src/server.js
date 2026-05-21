require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const ActivityLog = require('./activityLogModel');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json({ limit: '64kb' }));

app.get('/health', (req, res) => {
  res.json({
    service: 'activity-service',
    status: 'ok',
    mongoReady: mongoose.connection.readyState === 1,
  });
});

app.post('/activity/logs', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Activity database unavailable' });
    }

    const {
      user,
      eventType,
      entityType,
      entityId,
      description,
      metadata,
    } = req.body || {};

    if (!eventType || typeof eventType !== 'string') {
      return res.status(400).json({ error: 'eventType is required' });
    }

    await ActivityLog.create({
      userId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
      eventType,
      entityType,
      entityId,
      description,
      metadata: metadata || {},
      createdAt: new Date(),
    });

    return res.status(201).json({ logged: true });
  } catch (error) {
    console.warn('Activity service log failed:', error.message);
    return res.status(500).json({ error: 'Activity log failed' });
  }
});

const start = async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is required for activity-service');
  }

  await mongoose.connect(MONGO_URI);

  app.listen(PORT, () => {
    console.log(`Activity service running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error('Activity service failed to start:', error.message);
  process.exit(1);
});
