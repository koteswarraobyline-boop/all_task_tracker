const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReviewLink = sequelize.define(
  'ReviewLink',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'project_id',
    },
    nodeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'node_id',
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Review link',
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sitePassword: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'site_password',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'review_links',
    indexes: [
      { fields: ['project_id'] },
      { fields: ['node_id'] },
    ],
  }
);

module.exports = ReviewLink;
