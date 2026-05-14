const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getFavoriteMovements,
  createFavoriteMovement,
  deleteFavoriteMovement,
} = require('../controllers/favoriteMovementsController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getFavoriteMovements);
router.post('/', createFavoriteMovement);
router.delete('/:id', deleteFavoriteMovement);

module.exports = router;
