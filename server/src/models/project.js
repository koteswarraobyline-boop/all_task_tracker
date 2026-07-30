const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'client_name',
  },
  originalDeliveryDate: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'original_delivery_date',
  },
  revisedDeliveryDate: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'revised_delivery_date',
  },
  targetDeliveryDate: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'target_delivery_date',
  },
  deliveryNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'delivery_notes',
  },
}, {
  tableName: 'projects',
});

module.exports = Project;
