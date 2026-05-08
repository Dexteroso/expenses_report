const express = require('express');
const { getConcepts } = require('../controllers/conceptsController');

const router = express.Router();

router.get('/', getConcepts);

module.exports = router;