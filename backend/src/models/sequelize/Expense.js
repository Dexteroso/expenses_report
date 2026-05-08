const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
const User = require('./User');
const Account = require('./Account');
const Category = require('./Category');
const Concept = require('./Concept');

const Expense = sequelize.define(
  'Expense',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    expense_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
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
      type: DataTypes.TEXT,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    account_id: {
      type: DataTypes.INTEGER,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: 'expenses',
    timestamps: false,
  }
);

Expense.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

Expense.belongsTo(Account, {
  foreignKey: 'account_id',
  as: 'account',
});

Expense.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category',
});

Expense.belongsTo(Concept, {
  foreignKey: 'concept_id',
  as: 'concept',
});

User.hasMany(Expense, {
  foreignKey: 'user_id',
  as: 'expenses',
});

Account.hasMany(Expense, {
  foreignKey: 'account_id',
  as: 'expenses',
});

Category.hasMany(Expense, {
  foreignKey: 'category_id',
  as: 'expenses',
});

Concept.hasMany(Expense, {
  foreignKey: 'concept_id',
  as: 'expenses',
});

module.exports = Expense;
