const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminCredential = sequelize.define('AdminCredential', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash',
  },
}, {
  tableName: 'admin_credentials',
});

module.exports = AdminCredential;
