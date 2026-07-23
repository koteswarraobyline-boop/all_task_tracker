const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClientAccessRecord = sequelize.define('ClientAccessRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  token: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true,
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'project_id',
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'client_name',
    validate: {
      notEmpty: true,
    },
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  status: {
    type: DataTypes.ENUM('active', 'disabled'),
    allowNull: false,
    defaultValue: 'active',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at',
  },
  lastOpenedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_opened_at',
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_hash',
  },
}, {
  tableName: 'client_access_records',
});

module.exports = ClientAccessRecord;
