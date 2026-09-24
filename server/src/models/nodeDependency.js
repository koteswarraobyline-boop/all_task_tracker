const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NodeDependency = sequelize.define(
  'NodeDependency',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nodeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'node_id',
    },
    dependsOnId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'depends_on_id',
    },
  },
  {
    tableName: 'node_dependencies',
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['node_id', 'depends_on_id'] },
      { fields: ['depends_on_id'] },
    ],
  }
);

module.exports = NodeDependency;
