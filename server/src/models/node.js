const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NODE_TYPES = ['phase', 'stage', 'function', 'module', 'category', 'task'];

const Node = sequelize.define(
  'Node',
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
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_id',
    },
    type: {
      type: DataTypes.ENUM(...NODE_TYPES),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    priority: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'owner_id',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'start_date',
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'due_date',
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
    },
    estimatedHours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'estimated_hours',
    },
    actualHours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'actual_hours',
    },
    suggested: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
    /** Links leaf nodes to existing Task rows so board/calendar/Gantt keep working. */
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      field: 'task_id',
    },
    /** Idempotent sync key, e.g. phase:1:discovery or task:42 */
    stableKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'stable_key',
    },
  },
  {
    tableName: 'nodes',
    indexes: [
      { fields: ['project_id'] },
      { fields: ['parent_id'] },
      { fields: ['type'] },
      { fields: ['owner_id'] },
      { fields: ['task_id'], unique: true },
      { fields: ['stable_key'], unique: true },
    ],
  }
);

Node.NODE_TYPES = NODE_TYPES;

module.exports = Node;
