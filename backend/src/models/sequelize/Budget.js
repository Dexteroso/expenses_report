const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
const User = require('./User');
const Concept = require('./Concept');

const Budget = sequelize.define(
  'Budget',
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
    concept_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    month: {
      type: DataTypes.TINYINT,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: 'budgets',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'concept_id', 'year', 'month'],
      },
    ],
  }
);

Budget.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

Budget.belongsTo(Concept, {
  foreignKey: 'concept_id',
  as: 'concept',
});

User.hasMany(Budget, {
  foreignKey: 'user_id',
  as: 'budgets',
});

Concept.hasMany(Budget, {
  foreignKey: 'concept_id',
  as: 'budgets',
});

module.exports = Budget;
