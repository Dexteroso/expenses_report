const mongoose = require('mongoose');
const ActivityLog = require('../models/activityLogModel');

const supportedPeriods = new Set(['today', 'yesterday', 'last3', 'last7', 'last30', 'all']);

const getStartOfDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getPeriodRange = (period) => {
  const today = getStartOfDay(new Date());

  if (period === 'all') {
    return null;
  }

  if (period === 'yesterday') {
    const start = new Date(today);
    start.setDate(start.getDate() - 1);
    const end = new Date(today);
    return { start, end };
  }

  const daysByPeriod = {
    today: 1,
    last3: 3,
    last7: 7,
    last30: 30,
  };

  const days = daysByPeriod[period] || 1;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  return {
    start,
    end: null,
  };
};

const getActivityLogs = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }

    const requestedPeriod = String(req.query.period || 'today');
    const period = supportedPeriods.has(requestedPeriod) ? requestedPeriod : 'today';
    const query = {};
    const range = getPeriodRange(period);

    if (range) {
      query.createdAt = {
        $gte: range.start,
      };

      if (range.end) {
        query.createdAt.$lt = range.end;
      }
    }

    const canSeeAllUsers = req.user.role === 'admin' && req.query.allUsers === 'true';

    if (!canSeeAllUsers) {
      query.userId = req.user.id;
    }

    const logs = await ActivityLog.find(query).sort({ createdAt: -1 }).lean();

    return res.json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error fetching activity logs' });
  }
};

module.exports = {
  getActivityLogs,
};
