const Account = require('../models/sequelize/Account');
const Category = require('../models/sequelize/Category');
const Concept = require('../models/sequelize/Concept');
const FavoriteMovement = require('../models/sequelize/FavoriteMovement');
const { logActivity } = require('../utils/activityLogger');
const { sanitizeTextValue } = require('../utils/validators');

const MAX_FAVORITES_PER_USER = 5;

const normalizeText = (value, options) => sanitizeTextValue(value, options);

const validateFavoritePayload = ({
  emoji,
  alias,
  color,
  type,
  category_id,
  concept_id,
  description,
  account_id,
}) => {
  if (
    !normalizeText(emoji) ||
    !normalizeText(alias) ||
    !normalizeText(color) ||
    !type ||
    !category_id ||
    !concept_id ||
    !normalizeText(description) ||
    !account_id
  ) {
    return 'Missing required fields';
  }

  if (!['income', 'expense'].includes(type)) {
    return 'type must be income or expense';
  }

  if (
    !Number.isInteger(Number(category_id)) ||
    !Number.isInteger(Number(concept_id)) ||
    !Number.isInteger(Number(account_id))
  ) {
    return 'Invalid favorite movement ids';
  }

  return '';
};

const formatFavoriteMovement = (favorite) => {
  const row = typeof favorite.get === 'function' ? favorite.get({ plain: true }) : favorite;

  return {
    id: row.id,
    emoji: row.emoji,
    alias: row.alias,
    color: row.color,
    type: row.type,
    category_id: row.category_id,
    concept_id: row.concept_id,
    description: row.description,
    account_id: row.account_id,
    created_at: row.created_at,
  };
};

const buildFavoriteActivityMetadata = (favorite) => ({
  favoriteAlias: favorite.alias,
  categoryName: favorite.category?.name,
  conceptName: favorite.concept?.name,
  type: favorite.type,
  accountAlias: favorite.account?.account_alias,
  description: favorite.description,
});

const favoriteActivityIncludes = [
  {
    model: Category,
    as: 'category',
    attributes: ['name'],
    required: false,
  },
  {
    model: Concept,
    as: 'concept',
    attributes: ['name'],
    required: false,
  },
  {
    model: Account,
    as: 'account',
    attributes: ['account_alias'],
    required: false,
  },
];

const getFavoriteMovements = async (req, res) => {
  try {
    const favorites = await FavoriteMovement.findAll({
      where: {
        user_id: req.user.id,
      },
      order: [
        ['created_at', 'ASC'],
        ['id', 'ASC'],
      ],
      raw: true,
    });

    res.json(favorites.map(formatFavoriteMovement));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching favorite movements' });
  }
};

const createFavoriteMovement = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      emoji,
      alias,
      color,
      type,
      category_id,
      concept_id,
      description,
      account_id,
    } = req.body;
    const validationError = validateFavoritePayload({
      emoji,
      alias,
      color,
      type,
      category_id,
      concept_id,
      description,
      account_id,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const favoriteCount = await FavoriteMovement.count({
      where: {
        user_id: userId,
      },
    });

    if (favoriteCount >= MAX_FAVORITES_PER_USER) {
      return res.status(400).json({ error: 'Maximum favorite movements reached' });
    }

    const normalizedCategoryId = Number(category_id);
    const normalizedConceptId = Number(concept_id);
    const normalizedAccountId = Number(account_id);
    const sanitizedEmoji = normalizeText(emoji, { maxLength: 16 });
    const sanitizedAlias = normalizeText(alias, { maxLength: 40 });
    const sanitizedColor = normalizeText(color, { maxLength: 20 });
    const sanitizedDescription = normalizeText(description, { maxLength: 255 });

    const [category, concept, account] = await Promise.all([
      Category.findOne({
        where: {
          id: normalizedCategoryId,
          type,
        },
        raw: true,
      }),
      Concept.findOne({
        where: {
          id: normalizedConceptId,
          category_id: normalizedCategoryId,
        },
        raw: true,
      }),
      Account.findOne({
        where: {
          id: normalizedAccountId,
          user_id: userId,
          is_active: true,
        },
        raw: true,
      }),
    ]);

    if (!category || !concept || !account) {
      return res.status(400).json({ error: 'Invalid favorite movement references' });
    }

    const favorite = await FavoriteMovement.create({
      user_id: userId,
      emoji: sanitizedEmoji,
      alias: sanitizedAlias,
      color: sanitizedColor,
      type,
      category_id: normalizedCategoryId,
      concept_id: normalizedConceptId,
      description: sanitizedDescription,
      account_id: normalizedAccountId,
    });
    const activityFavorite = await FavoriteMovement.findOne({
      where: {
        id: favorite.id,
        user_id: userId,
      },
      include: favoriteActivityIncludes,
    });
    const activityDetails = activityFavorite?.get({ plain: true }) || {
      ...formatFavoriteMovement(favorite),
      category,
      concept,
      account,
    };

    logActivity({
      user: req.user,
      eventType: 'favorite.created',
      entityType: 'favorite',
      entityId: favorite.id,
      description: 'Favorite movement created',
      metadata: buildFavoriteActivityMetadata(activityDetails),
    });

    res.status(201).json({
      message: 'Favorite movement created successfully',
      favorite: formatFavoriteMovement(favorite),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating favorite movement' });
  }
};

const deleteFavoriteMovement = async (req, res) => {
  try {
    const favoriteId = Number(req.params.id);

    if (!Number.isInteger(favoriteId)) {
      return res.status(400).json({ error: 'Invalid favorite movement id' });
    }

    const favorite = await FavoriteMovement.findOne({
      where: {
        id: favoriteId,
        user_id: req.user.id,
      },
      include: favoriteActivityIncludes,
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite movement not found' });
    }

    const activityDetails = favorite.get({ plain: true });
    const deletedCount = await FavoriteMovement.destroy({
      where: {
        id: favoriteId,
        user_id: req.user.id,
      },
    });

    if (!deletedCount) {
      return res.status(404).json({ error: 'Favorite movement not found' });
    }

    logActivity({
      user: req.user,
      eventType: 'favorite.deleted',
      entityType: 'favorite',
      entityId: favoriteId,
      description: 'Favorite movement deleted',
      metadata: buildFavoriteActivityMetadata(activityDetails),
    });

    res.json({ message: 'Favorite movement deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting favorite movement' });
  }
};

module.exports = {
  getFavoriteMovements,
  createFavoriteMovement,
  deleteFavoriteMovement,
};
