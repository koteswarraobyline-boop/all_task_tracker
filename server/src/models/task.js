const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
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
  developerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'developer_id',
  },
  taskId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'task_id',
  },
  module: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  feature: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  taskName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'task_name',
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  priority: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(
      'Upcoming',
      'Assigned',
      'In Development',
      'Code Review',
      'Testing',
      'Completed',
      'Blocked',
      'On Hold'
    ),
    allowNull: false,
    defaultValue: 'Upcoming',
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
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phase: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  week: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  estDays: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'est_days',
  },
  dependencies: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  parentId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'parent_id',
  },
  recordType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'task',
    field: 'record_type',
  },
  tags: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  progressPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'progress_percent',
  },
  customFields: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'custom_fields',
  },
}, {
  tableName: 'tasks',
});

module.exports = Task;
