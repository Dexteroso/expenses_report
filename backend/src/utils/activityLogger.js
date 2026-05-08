const mongoose = require('mongoose');
const ActivityLog = require('../models/activityLogModel');

const isMongoReady = () => mongoose.connection.readyState === 1;

const logActivity = async ({
  user,
  eventType,
  entityType,
  entityId,
  description,
  metadata,
}) => {
  try {
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
  } catch (error) {
    console.warn('Activity log failed:', error.message);
  }
};

module.exports = {
  logActivity,
};
