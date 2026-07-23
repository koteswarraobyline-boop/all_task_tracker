const Project = require('./project');
const Developer = require('./developer');
const Task = require('./task');
const ClientAccessRecord = require('./clientAccessRecord');
const AdminCredential = require('./adminCredential');

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

// Project <-> ClientAccessRecord Relationship
Project.hasMany(ClientAccessRecord, {
  foreignKey: 'project_id',
  as: 'clientAccessRecords',
  onDelete: 'CASCADE',
});
ClientAccessRecord.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
  onDelete: 'CASCADE',
});

module.exports = {
  Project,
  Developer,
  Task,
  ClientAccessRecord,
  AdminCredential,
};
