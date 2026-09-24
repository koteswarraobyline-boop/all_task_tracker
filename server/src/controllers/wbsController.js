const { Op } = require('sequelize');
const {
  Project,
  Node,
  NodeDependency,
  Comment,
  Developer,
  Task,
  ReviewLink,
} = require('../models');
const { syncProjectNodes } = require('../services/wbsSyncService');
const {
  loadProjectTree,
  computeOverviewMetrics,
  buildDependencyLayers,
  wouldCreateCycle,
  buildBreadcrumb,
} = require('../services/wbsTreeService');
const {
  ensureNodeForTask,
  loadTaskCollab,
  toPublicComment,
  toPublicReviewLink,
} = require('../services/taskCollabService');
const NodeModel = require('../models/node');

function envEditPassword() {
  let v = process.env.EDIT_UNLOCK_PASSWORD || process.env.EDIT_PASSWORD || 'Byline';
  v = String(v).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

function parseProjectId(req) {
  const id = parseInt(req.params.id, 10);
  return Number.isFinite(id) ? id : null;
}

// GET /projects/:id/wbs?viewAs=&sync=1
exports.getWbs = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    if (!projectId) return res.status(400).json({ error: 'Invalid project ID' });

    const project = await Project.findByPk(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const force = req.query.sync === '1' || req.query.forceSync === '1';
    const viewAs = req.query.viewAs || null;
    const { tree, allNodes } = await loadProjectTree(projectId, {
      viewAs,
      ensureSync: true,
      forceRefresh: force,
    });
    const metrics = computeOverviewMetrics(tree, project.get({ plain: true }));
    const roadmap = buildDependencyLayers(tree);

    const developers = await Developer.findAll({
      order: [['name', 'ASC']],
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        originalDeliveryDate: project.originalDeliveryDate,
        revisedDeliveryDate: project.revisedDeliveryDate,
        targetDeliveryDate: project.targetDeliveryDate,
        hasEditUnlockPassword: Boolean(project.editUnlockPassword || envEditPassword()),
      },
      tree,
      metrics,
      roadmap,
      team: developers.map((d) => {
        const plain = d.get({ plain: true });
        const owned = allNodes.filter(
          (n) => n.type === 'task' && n.ownerId === plain.id
        );
        return {
          id: plain.id,
          name: plain.name,
          role: plain.role,
          color: plain.color,
          allocation: plain.allocation ?? 100,
          status: plain.status,
          taskCount: owned.length,
          doneCount: owned.filter((t) => t.status === 'Completed').length,
          blockedCount: owned.filter((t) => t.status === 'Blocked').length,
          inProgressCount: owned.filter((t) =>
            ['In Development', 'Testing', 'Assigned'].includes(t.status)
          ).length,
        };
      }),
      nodeCount: allNodes.length,
    });
  } catch (err) {
    console.error('getWbs:', err);
    res.status(500).json({ error: err.message || 'Failed to load WBS' });
  }
};

// POST /projects/:id/wbs/sync
exports.syncWbs = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    if (!projectId) return res.status(400).json({ error: 'Invalid project ID' });
    const result = await syncProjectNodes(projectId, { migrateDeps: true });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('syncWbs:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
};

// POST /projects/:id/nodes
exports.createNode = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    if (!projectId) return res.status(400).json({ error: 'Invalid project ID' });

    const {
      parentId = null,
      type,
      name,
      description,
      status,
      priority,
      ownerId,
      startDate,
      dueDate,
      progress,
      estimatedHours,
      actualHours,
      suggested,
      sortOrder,
    } = req.body || {};

    if (!type || !NodeModel.NODE_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid node type' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (parentId) {
      const parent = await Node.findOne({ where: { id: parentId, projectId } });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
    }

    const stableKey = `manual:${projectId}:${type}:${Date.now()}:${Math.floor(Math.random() * 1e6)}`;
    const node = await Node.create({
      projectId,
      parentId: parentId || null,
      type,
      name: String(name).trim(),
      description: description || null,
      status: status || (type === 'task' ? 'Upcoming' : null),
      priority: priority || 'Medium',
      ownerId: ownerId || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      progress: progress ?? 0,
      estimatedHours: estimatedHours ?? null,
      actualHours: actualHours ?? null,
      suggested: Boolean(suggested),
      sortOrder: sortOrder ?? 0,
      taskId: null,
      stableKey,
    });

    // Optionally create linked Task for task-type nodes so board stays in sync
    if (type === 'task') {
      let phaseName = 'Unphased';
      let moduleName = 'General';
      if (parentId) {
        const parent = await Node.findByPk(parentId);
        if (parent) {
          if (parent.type === 'module' || parent.type === 'category') {
            moduleName = parent.name;
            if (parent.parentId) {
              const gp = await Node.findByPk(parent.parentId);
              if (gp) phaseName = gp.name;
            }
          } else if (parent.type === 'phase') {
            phaseName = parent.name;
          }
        }
      }
      const task = await Task.create({
        projectId,
        taskId: `N-${node.id}`,
        taskName: node.name,
        description: node.description,
        status: node.status || 'Upcoming',
        priority: node.priority,
        developerId: node.ownerId,
        startDate: node.startDate,
        dueDate: node.dueDate,
        estimatedHours: node.estimatedHours,
        actualHours: node.actualHours,
        progressPercent: node.progress,
        phase: phaseName,
        module: moduleName,
        recordType: 'task',
      });
      await node.update({ taskId: task.id, stableKey: `task:${task.id}` });
    }

    res.status(201).json(node);
  } catch (err) {
    console.error('createNode:', err);
    res.status(500).json({ error: err.message || 'Failed to create node' });
  }
};

// PUT /projects/:id/nodes/:nodeId
exports.updateNode = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const nodeId = parseInt(req.params.nodeId, 10);
    if (!projectId || !nodeId) return res.status(400).json({ error: 'Invalid id' });

    const node = await Node.findOne({ where: { id: nodeId, projectId } });
    if (!node) return res.status(404).json({ error: 'Node not found' });

    const fields = [
      'name',
      'description',
      'status',
      'priority',
      'ownerId',
      'startDate',
      'dueDate',
      'progress',
      'estimatedHours',
      'actualHours',
      'suggested',
      'sortOrder',
      'parentId',
    ];
    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    await node.update(updates);

    if (node.taskId) {
      const taskUpdates = {};
      if (updates.name !== undefined) taskUpdates.taskName = updates.name;
      if (updates.description !== undefined) taskUpdates.description = updates.description;
      if (updates.status !== undefined) taskUpdates.status = updates.status;
      if (updates.priority !== undefined) taskUpdates.priority = updates.priority;
      if (updates.ownerId !== undefined) taskUpdates.developerId = updates.ownerId;
      if (updates.startDate !== undefined) taskUpdates.startDate = updates.startDate;
      if (updates.dueDate !== undefined) taskUpdates.dueDate = updates.dueDate;
      if (updates.estimatedHours !== undefined) taskUpdates.estimatedHours = updates.estimatedHours;
      if (updates.actualHours !== undefined) taskUpdates.actualHours = updates.actualHours;
      if (updates.progress !== undefined) taskUpdates.progressPercent = updates.progress;
      if (Object.keys(taskUpdates).length) {
        await Task.update(taskUpdates, { where: { id: node.taskId } });
      }
    }

    res.json(node);
  } catch (err) {
    console.error('updateNode:', err);
    res.status(500).json({ error: err.message || 'Failed to update node' });
  }
};

// DELETE /projects/:id/nodes/:nodeId
exports.deleteNode = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const nodeId = parseInt(req.params.nodeId, 10);
    if (!projectId || !nodeId) return res.status(400).json({ error: 'Invalid id' });

    const node = await Node.findOne({ where: { id: nodeId, projectId } });
    if (!node) return res.status(404).json({ error: 'Node not found' });

    const taskId = node.taskId;
    await node.destroy();
    if (taskId) {
      await Task.destroy({ where: { id: taskId } });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteNode:', err);
    res.status(500).json({ error: err.message || 'Failed to delete node' });
  }
};

// POST /projects/:id/nodes/:nodeId/dependencies  { dependsOnId }
exports.addDependency = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const nodeId = parseInt(req.params.nodeId, 10);
    const dependsOnId = parseInt(req.body?.dependsOnId, 10);
    if (!projectId || !nodeId || !dependsOnId) {
      return res.status(400).json({ error: 'nodeId and dependsOnId required' });
    }

    const [node, dep] = await Promise.all([
      Node.findOne({ where: { id: nodeId, projectId } }),
      Node.findOne({ where: { id: dependsOnId, projectId } }),
    ]);
    if (!node || !dep) return res.status(404).json({ error: 'Node not found' });

    if (await wouldCreateCycle(projectId, nodeId, dependsOnId)) {
      return res.status(400).json({ error: 'Circular dependency not allowed' });
    }

    const [row, created] = await NodeDependency.findOrCreate({
      where: { nodeId, dependsOnId },
      defaults: { nodeId, dependsOnId },
    });

    // Keep free-text field in sync for legacy Gantt
    if (node.taskId && dep.taskId) {
      const task = await Task.findByPk(node.taskId);
      const depTask = await Task.findByPk(dep.taskId);
      if (task && depTask) {
        const ref = depTask.taskId || String(depTask.id);
        const existing = String(task.dependencies || '')
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (!existing.some((e) => e.toLowerCase() === String(ref).toLowerCase())) {
          existing.push(ref);
          await task.update({ dependencies: existing.join(', ') });
        }
      }
    }

    res.status(created ? 201 : 200).json(row);
  } catch (err) {
    console.error('addDependency:', err);
    res.status(500).json({ error: err.message || 'Failed to add dependency' });
  }
};

// DELETE /projects/:id/nodes/:nodeId/dependencies/:dependsOnId
exports.removeDependency = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const nodeId = parseInt(req.params.nodeId, 10);
    const dependsOnId = parseInt(req.params.dependsOnId, 10);
    if (!projectId || !nodeId || !dependsOnId) {
      return res.status(400).json({ error: 'Invalid ids' });
    }

    const node = await Node.findOne({ where: { id: nodeId, projectId } });
    if (!node) return res.status(404).json({ error: 'Node not found' });

    await NodeDependency.destroy({ where: { nodeId, dependsOnId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('removeDependency:', err);
    res.status(500).json({ error: err.message || 'Failed to remove dependency' });
  }
};

// —— Comments ——

exports.listComments = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    if (!projectId) return res.status(400).json({ error: 'Invalid project ID' });

    const { tree, byId } = await loadProjectTree(projectId, { ensureSync: false });
    // Ensure byId even if empty tree
    const nodes = await Node.findAll({ where: { projectId }, attributes: ['id', 'name', 'parentId', 'type'] });
    const map = new Map(nodes.map((n) => [n.id, n.get({ plain: true })]));

    const comments = await Comment.findAll({
      where: { projectId },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      comments: comments.map((c) => {
        const plain = c.get({ plain: true });
        return {
          ...plain,
          resolved: plain.status === 'resolved' || Boolean(plain.resolvedAt),
          breadcrumb: plain.nodeId ? buildBreadcrumb(map, plain.nodeId) : 'General',
        };
      }),
    });
  } catch (err) {
    console.error('listComments:', err);
    res.status(500).json({ error: err.message || 'Failed to list comments' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    if (!projectId) return res.status(400).json({ error: 'Invalid project ID' });

    const {
      nodeId = null,
      body,
      authorName,
      authorId,
      statusFrom,
      statusTo,
    } = req.body || {};

    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    if (nodeId) {
      const node = await Node.findOne({ where: { id: nodeId, projectId } });
      if (!node) return res.status(400).json({ error: 'Node not found' });
    }

    const comment = await Comment.create({
      projectId,
      nodeId: nodeId || null,
      authorId: authorId || null,
      authorName: authorName || req.user?.username || 'Admin',
      body: String(body).trim(),
      status: 'open',
      statusFrom: statusFrom || null,
      statusTo: statusTo || null,
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error('createComment:', err);
    res.status(500).json({ error: err.message || 'Failed to create comment' });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const commentId = parseInt(req.params.commentId, 10);
    if (!projectId || !commentId) return res.status(400).json({ error: 'Invalid id' });

    const comment = await Comment.findOne({ where: { id: commentId, projectId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const updates = {};
    if (req.body.body !== undefined) updates.body = String(req.body.body).trim();
    if (req.body.status === 'resolved') {
      updates.status = 'resolved';
      updates.resolvedAt = new Date();
    }
    if (req.body.status === 'open') {
      updates.status = 'open';
      updates.resolvedAt = null;
    }
    await comment.update(updates);
    res.json(comment);
  } catch (err) {
    console.error('updateComment:', err);
    res.status(500).json({ error: err.message || 'Failed to update comment' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const commentId = parseInt(req.params.commentId, 10);
    if (!projectId || !commentId) return res.status(400).json({ error: 'Invalid id' });

    const deleted = await Comment.destroy({ where: { id: commentId, projectId } });
    if (!deleted) return res.status(404).json({ error: 'Comment not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteComment:', err);
    res.status(500).json({ error: err.message || 'Failed to delete comment' });
  }
};

// POST /projects/:id/nodes/:nodeId/review-links
exports.createReviewLink = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const nodeId = parseInt(req.params.nodeId, 10);
    if (!projectId || !nodeId) return res.status(400).json({ error: 'Invalid id' });

    const node = await Node.findOne({ where: { id: nodeId, projectId } });
    if (!node) return res.status(404).json({ error: 'Node not found' });
    if (node.type !== 'task') {
      return res.status(400).json({ error: 'Review links can only be added to tasks' });
    }

    const url = String(req.body?.url || '').trim();
    const username = String(req.body?.username || '').trim() || null;
    const password = String(req.body?.password || '').trim() || null;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const link = await ReviewLink.create({
      projectId,
      nodeId,
      label: String(req.body?.label || 'Review link').trim() || 'Review link',
      url,
      username,
      sitePassword: password,
      note: req.body?.note ? String(req.body.note).trim() : null,
    });

    res.status(201).json({
      id: link.id,
      label: link.label,
      url: link.url,
      username: link.username,
      password: link.sitePassword,
      note: link.note,
      createdAt: link.createdAt,
    });
  } catch (err) {
    console.error('createReviewLink:', err);
    res.status(500).json({ error: err.message || 'Failed to create review link' });
  }
};

// DELETE /projects/:id/review-links/:linkId
exports.deleteReviewLink = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const linkId = parseInt(req.params.linkId, 10);
    if (!projectId || !linkId) return res.status(400).json({ error: 'Invalid id' });

    const deleted = await ReviewLink.destroy({ where: { id: linkId, projectId } });
    if (!deleted) return res.status(404).json({ error: 'Review link not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteReviewLink:', err);
    res.status(500).json({ error: err.message || 'Failed to delete review link' });
  }
};

/** GET /projects/:id/tasks/:taskId/collab — comments + review links for a board task */
exports.getTaskCollab = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const taskId = parseInt(req.params.taskId, 10);
    if (!projectId || !taskId) return res.status(400).json({ error: 'Invalid id' });

    const data = await loadTaskCollab(projectId, taskId, { includeCredentials: true });
    if (!data) return res.status(404).json({ error: 'Task not found' });
    res.json(data);
  } catch (err) {
    console.error('getTaskCollab:', err);
    res.status(500).json({ error: err.message || 'Failed to load collaboration data' });
  }
};

/** GET /projects/:id/nodes/:nodeId/collab */
exports.getNodeCollab = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const nodeId = parseInt(req.params.nodeId, 10);
    if (!projectId || !nodeId) return res.status(400).json({ error: 'Invalid id' });

    const node = await Node.findOne({ where: { id: nodeId, projectId } });
    if (!node) return res.status(404).json({ error: 'Node not found' });

    if (node.taskId) {
      const data = await loadTaskCollab(projectId, node.taskId, { includeCredentials: true });
      if (data) return res.json(data);
    }

    const [commentRows, linkRows] = await Promise.all([
      Comment.findAll({ where: { projectId, nodeId }, order: [['createdAt', 'DESC']] }),
      ReviewLink.findAll({
        where: { projectId, nodeId },
        order: [
          ['createdAt', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
    ]);

    res.json({
      taskId: node.taskId || null,
      taskName: node.name,
      nodeId: node.id,
      note: (node.description || '').trim() || null,
      comments: commentRows.map(toPublicComment),
      reviewLinks: linkRows.map((l) => toPublicReviewLink(l, { includeCredentials: true })),
      commentCount: commentRows.length,
      reviewLinkCount: linkRows.length,
    });
  } catch (err) {
    console.error('getNodeCollab:', err);
    res.status(500).json({ error: err.message || 'Failed to load collaboration data' });
  }
};

/** POST /projects/:id/tasks/:taskId/review-links — ensure node then create link */
exports.createTaskReviewLink = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const taskId = parseInt(req.params.taskId, 10);
    if (!projectId || !taskId) return res.status(400).json({ error: 'Invalid id' });

    const node = await ensureNodeForTask(projectId, taskId);
    if (!node) return res.status(404).json({ error: 'Task not found' });

    const url = String(req.body?.url || '').trim();
    const username = String(req.body?.username || '').trim() || null;
    const password = String(req.body?.password || '').trim() || null;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const link = await ReviewLink.create({
      projectId,
      nodeId: node.id,
      label: String(req.body?.label || 'Review link').trim() || 'Review link',
      url,
      username,
      sitePassword: password,
      note: req.body?.note ? String(req.body.note).trim() : null,
    });

    res.status(201).json(toPublicReviewLink(link, { includeCredentials: true }));
  } catch (err) {
    console.error('createTaskReviewLink:', err);
    res.status(500).json({ error: err.message || 'Failed to create review link' });
  }
};

/** POST /projects/:id/tasks/:taskId/comments */
exports.createTaskComment = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    const taskId = parseInt(req.params.taskId, 10);
    if (!projectId || !taskId) return res.status(400).json({ error: 'Invalid id' });

    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment body is required' });

    const node = await ensureNodeForTask(projectId, taskId);
    if (!node) return res.status(404).json({ error: 'Task not found' });

    const comment = await Comment.create({
      projectId,
      nodeId: node.id,
      authorId: req.body?.authorId || null,
      authorName: req.body?.authorName || req.user?.username || 'Admin',
      body,
      status: 'open',
    });

    res.status(201).json(toPublicComment(comment));
  } catch (err) {
    console.error('createTaskComment:', err);
    res.status(500).json({ error: err.message || 'Failed to create comment' });
  }
};

// POST /projects/:id/edit-unlock  { password }
exports.unlockEditing = async (req, res) => {
  try {
    const projectId = parseProjectId(req);
    if (!projectId) return res.status(400).json({ error: 'Invalid project ID' });

    const project = await Project.findByPk(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const expected = project.editUnlockPassword || envEditPassword();
    const { password } = req.body || {};
    if (!password || password !== expected) {
      return res.status(401).json({ error: 'Incorrect unlock password' });
    }
    res.json({ unlocked: true });
  } catch (err) {
    console.error('unlockEditing:', err);
    res.status(500).json({ error: err.message || 'Unlock failed' });
  }
};
