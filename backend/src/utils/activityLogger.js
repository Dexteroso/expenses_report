const mongoose = require('mongoose');
const ActivityLog = require('../models/activityLogModel');

const isMongoReady = () => mongoose.connection.readyState === 1;
const ACTIVITY_SERVICE_URL = process.env.ACTIVITY_SERVICE_URL?.replace(/\/$/, '');

const writeLocalActivityLog = async ({
  user,
  eventType,
  entityType,
  entityId,
  description,
  metadata,
}) => {
  if (!isMongoReady()) {
    return;
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
};

const writeActivityServiceLog = async (payload) => {
  if (!ACTIVITY_SERVICE_URL || typeof fetch !== 'function') {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${ACTIVITY_SERVICE_URL}/activity/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return response.ok;
  } catch (error) {
    console.warn('Activity service unavailable, falling back to local logger:', error.message);
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const logActivity = async ({
  user,
  eventType,
  entityType,
  entityId,
  description,
  metadata,
}) => {
  const payload = {
    user,
    eventType,
    entityType,
    entityId,
    description,
    metadata,
  };

  try {
    const loggedByService = await writeActivityServiceLog(payload);

    if (loggedByService) {
      return;
    }

    await writeLocalActivityLog(payload);
  } catch (error) {
    console.warn('Activity log failed:', error.message);
  }
};

module.exports = {
  logActivity,
  writeLocalActivityLog,
};
