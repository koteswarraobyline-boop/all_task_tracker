const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Developer = sequelize.define('Developer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Developers should be unique by name to avoid duplicates on upload
    validate: {
      notEmpty: true,
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#1976d2',
  },
  role: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  team: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Active',
    validate: {
      isIn: [['Active', 'On Leave', 'Inactive']],
    },
  },
  skills: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  allocation: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    validate: {
      min: 0,
      max: 100,
    },
  },
}, {
  tableName: 'developers',
});

module.exports = Developer;
