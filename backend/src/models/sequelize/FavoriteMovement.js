const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
const User = require('./User');
const Account = require('./Account');
const Category = require('./Category');
const Concept = require('./Concept');

const FavoriteMovement = sequelize.define(
  'FavoriteMovement',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    emoji: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    alias: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    concept_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    account_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: 'favorite_movements',
    timestamps: false,
  }
);

FavoriteMovement.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

FavoriteMovement.belongsTo(Account, {
  foreignKey: 'account_id',
  as: 'account',
});

FavoriteMovement.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category',
});

FavoriteMovement.belongsTo(Concept, {
  foreignKey: 'concept_id',
  as: 'concept',
});

User.hasMany(FavoriteMovement, {
  foreignKey: 'user_id',
  as: 'favoriteMovements',
});

module.exports = FavoriteMovement;
