const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Comment = sequelize.define(
  'Comment',
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
      allowNull: true,
      field: 'node_id',
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'author_id',
    },
    authorName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Admin',
      field: 'author_name',
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'open',
    },
    statusFrom: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'status_from',
    },
    statusTo: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'status_to',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
    },
  },
  {
    tableName: 'comments',
    indexes: [
      { fields: ['project_id'] },
      { fields: ['node_id'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = Comment;
