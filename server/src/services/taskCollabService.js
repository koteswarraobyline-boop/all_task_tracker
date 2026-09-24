const { Op } = require('sequelize');
const { Node, Comment, ReviewLink, Task } = require('../models');

/**
 * Resolve the WBS task-node for a Task row (creates nothing — sync must have run).
 */
async function findNodeForTask(projectId, taskDbId) {
  if (!projectId || !taskDbId) return null;
  return Node.findOne({
    where: { projectId, taskId: Number(taskDbId), type: 'task' },
  });
}

async function ensureNodeForTask(projectId, taskDbId) {
  let node = await findNodeForTask(projectId, taskDbId);
  if (node) return node;

  const task = await Task.findOne({ where: { id: taskDbId, projectId } });
  if (!task) return null;

  // Soft-create a leaf node so comments/links can attach before full WBS sync.
  const stableKey = `task:${task.id}`;
  const existing = await Node.findOne({ where: { stableKey } });
  if (existing) return existing;

  let parentId = null;
  if (task.phase) {
    const phaseKey = `phase:${projectId}:${String(task.phase).toLowerCase().replace(/\s+/g, '-')}`;
    const phaseNode = await Node.findOne({
      where: {
        projectId,
        type: 'phase',
        [Op.or]: [{ name: task.phase }, { stableKey: phaseKey }],
      },
    });
    parentId = phaseNode?.id || null;
  }

  node = await Node.create({
    projectId,
    parentId,
    type: 'task',
    name: task.taskName || `Task ${task.id}`,
    description: task.description || null,
    status: task.status || null,
    priority: task.priority || null,
    ownerId: task.developerId || null,
    startDate: task.startDate || null,
    dueDate: task.dueDate || null,
    progress: task.progressPercent || 0,
    estimatedHours: task.estimatedHours || null,
    actualHours: task.actualHours || null,
    sortOrder: 0,
    taskId: task.id,
    stableKey,
  });
  return node;
}

function toPublicComment(c) {
  const plain = c?.get ? c.get({ plain: true }) : c;
  return {
    id: plain.id,
    authorName: plain.authorName || 'Team',
    body: plain.body,
    status: plain.status === 'resolved' || plain.resolvedAt ? 'resolved' : 'open',
    createdAt: plain.createdAt,
  };
}

function toPublicReviewLink(link, { includeCredentials = true } = {}) {
  const plain = link?.get ? link.get({ plain: true }) : link;
  const base = {
    id: plain.id,
    label: plain.label || 'Review link',
    url: plain.url,
    createdAt: plain.createdAt,
  };
  if (includeCredentials) {
    base.username = plain.username || null;
    base.password = plain.sitePassword ?? plain.password ?? null;
  }
  return base;
}

async function loadTaskCollab(projectId, taskDbId, { includeCredentials = true } = {}) {
  const task = await Task.findOne({ where: { id: taskDbId, projectId } });
  if (!task) return null;

  const node = await findNodeForTask(projectId, taskDbId);
  const nodeId = node?.id || null;

  let comments = [];
  let reviewLinks = [];
  if (nodeId) {
    const [commentRows, linkRows] = await Promise.all([
      Comment.findAll({
        where: { projectId, nodeId },
        order: [['createdAt', 'DESC']],
      }),
      ReviewLink.findAll({
        where: { projectId, nodeId },
        order: [
          ['createdAt', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
    ]);
    comments = commentRows.map(toPublicComment);
    reviewLinks = linkRows.map((l) => toPublicReviewLink(l, { includeCredentials }));
  }

  const note = (task.remarks || task.description || '').trim() || null;

  return {
    taskId: task.id,
    taskName: task.taskName,
    nodeId,
    note: note && note.length > 800 ? `${note.slice(0, 800)}…` : note,
    comments,
    reviewLinks,
    commentCount: comments.length,
    reviewLinkCount: reviewLinks.length,
  };
}

module.exports = {
  findNodeForTask,
  ensureNodeForTask,
  loadTaskCollab,
  toPublicComment,
  toPublicReviewLink,
};
