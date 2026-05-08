const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
const Category = require('./Category');

const Concept = sequelize.define(
  'Concept',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: 'concepts',
    timestamps: false,
  }
);

Concept.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category',
});

Category.hasMany(Concept, {
  foreignKey: 'category_id',
  as: 'concepts',
});

module.exports = Concept;
