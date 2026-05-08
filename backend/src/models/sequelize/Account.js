const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
const User = require('./User');

const Account = sequelize.define(
  'Account',
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
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_four: {
      type: DataTypes.STRING(4),
    },
    account_alias: {
      type: DataTypes.STRING(120),
    },
    account_type: {
      type: DataTypes.ENUM('debit', 'credit', 'cash', 'transfer', 'investment', 'other'),
      allowNull: false,
    },
    billing_cycle_end_day: {
      type: DataTypes.TINYINT,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'accounts',
    timestamps: false,
  }
);

Account.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

User.hasMany(Account, {
  foreignKey: 'user_id',
  as: 'accounts',
});

module.exports = Account;
