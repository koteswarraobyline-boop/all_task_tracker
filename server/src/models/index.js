const Project = require('./project');
const Developer = require('./developer');
const Task = require('./task');
const ClientAccessRecord = require('./clientAccessRecord');
const AdminCredential = require('./adminCredential');
const Node = require('./node');
const NodeDependency = require('./nodeDependency');
const Comment = require('./comment');
const ReviewLink = require('./reviewLink');

// Project <-> Task
Project.hasMany(Task, {
  foreignKey: 'project_id',
  as: 'tasks',
  onDelete: 'CASCADE',
});
Task.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
});

// Developer <-> Task
Developer.hasMany(Task, {
  foreignKey: 'developer_id',
  as: 'tasks',
  onDelete: 'SET NULL',
});
Task.belongsTo(Developer, {
  foreignKey: 'developer_id',
  as: 'developer',
});

// Project <-> ClientAccessRecord
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

// Project <-> Node (WBS)
Project.hasMany(Node, {
  foreignKey: 'project_id',
  as: 'nodes',
  onDelete: 'CASCADE',
});
Node.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
});

Node.belongsTo(Node, {
  foreignKey: 'parent_id',
  as: 'parent',
});
Node.hasMany(Node, {
  foreignKey: 'parent_id',
  as: 'children',
  onDelete: 'CASCADE',
});

Node.belongsTo(Developer, {
  foreignKey: 'owner_id',
  as: 'owner',
  onDelete: 'SET NULL',
});
Developer.hasMany(Node, {
  foreignKey: 'owner_id',
  as: 'ownedNodes',
  onDelete: 'SET NULL',
});

Node.belongsTo(Task, {
  foreignKey: 'task_id',
  as: 'task',
  onDelete: 'SET NULL',
});
Task.hasOne(Node, {
  foreignKey: 'task_id',
  as: 'wbsNode',
  onDelete: 'SET NULL',
});

// Dependencies
Node.belongsToMany(Node, {
  through: NodeDependency,
  as: 'dependsOn',
  foreignKey: 'node_id',
  otherKey: 'depends_on_id',
});
Node.belongsToMany(Node, {
  through: NodeDependency,
  as: 'dependedOnBy',
  foreignKey: 'depends_on_id',
  otherKey: 'node_id',
});
NodeDependency.belongsTo(Node, { foreignKey: 'node_id', as: 'node' });
NodeDependency.belongsTo(Node, { foreignKey: 'depends_on_id', as: 'dependsOnNode' });

// Comments
Project.hasMany(Comment, {
  foreignKey: 'project_id',
  as: 'comments',
  onDelete: 'CASCADE',
});
Comment.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Node.hasMany(Comment, {
  foreignKey: 'node_id',
  as: 'comments',
  onDelete: 'CASCADE',
});
Comment.belongsTo(Node, { foreignKey: 'node_id', as: 'node' });
Comment.belongsTo(Developer, {
  foreignKey: 'author_id',
  as: 'author',
  onDelete: 'SET NULL',
});

// Review links (credentials for management review of a task)
Project.hasMany(ReviewLink, {
  foreignKey: 'project_id',
  as: 'reviewLinks',
  onDelete: 'CASCADE',
});
ReviewLink.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Node.hasMany(ReviewLink, {
  foreignKey: 'node_id',
  as: 'reviewLinks',
  onDelete: 'CASCADE',
});
ReviewLink.belongsTo(Node, { foreignKey: 'node_id', as: 'node' });

module.exports = {
  Project,
  Developer,
  Task,
  ClientAccessRecord,
  AdminCredential,
  Node,
  NodeDependency,
  Comment,
  ReviewLink,
};
