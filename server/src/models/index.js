const Project = require('./project');
const Developer = require('./developer');
const Task = require('./task');

// Project <-> Task Relationship
Project.hasMany(Task, {
  foreignKey: 'project_id',
  as: 'tasks',
  onDelete: 'CASCADE',
});
Task.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
});

// Developer <-> Task Relationship
Developer.hasMany(Task, {
  foreignKey: 'developer_id',
  as: 'tasks',
  onDelete: 'SET NULL',
});
Task.belongsTo(Developer, {
  foreignKey: 'developer_id',
  as: 'developer',
});

module.exports = {
  Project,
  Developer,
  Task,
};
