const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getActivityLogs } = require('../controllers/activityController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getActivityLogs);

module.exports = router;
