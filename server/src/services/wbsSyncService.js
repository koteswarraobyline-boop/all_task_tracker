const { Op } = require('sequelize');
const { Task, Node, NodeDependency } = require('../models');

function slugify(value) {
  return String(value || 'untitled')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

function isWorkTask(task) {
  const rt = task.recordType || task.record_type;
  return !rt || rt === 'task';
}

function parseDependencyRefs(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function taskProgress(task) {
  if (task.status === 'Completed') return 100;
  const p = parseFloat(task.progressPercent ?? task.progress_percent);
  return Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;
}

/**
 * Materialize / refresh WBS nodes from existing Phase → Module → Task rows.
 * Idempotent via stable_key. Does not delete manually-added middle levels
 * (stage/function/category) unless orphaned with no children and no task link.
 */
async function syncProjectNodes(projectId, { migrateDeps = true } = {}) {
  const pid = Number(projectId);
  if (!Number.isFinite(pid)) throw new Error('Invalid project id');

  const tasks = await Task.findAll({
    where: { project_id: pid },
    order: [['id', 'ASC']],
  });

  const workTasks = tasks.filter(isWorkTask);
  const phaseOrder = [];
  const phaseMap = new Map(); // phaseName -> { modules: Map }

  for (const t of workTasks) {
    const phaseName = (t.phase || 'Unphased').trim() || 'Unphased';
    const moduleName = (t.module || 'General').trim() || 'General';
    if (!phaseMap.has(phaseName)) {
      phaseMap.set(phaseName, { modules: new Map() });
      phaseOrder.push(phaseName);
    }
    const phaseEntry = phaseMap.get(phaseName);
    if (!phaseEntry.modules.has(moduleName)) {
      phaseEntry.modules.set(moduleName, []);
    }
    phaseEntry.modules.get(moduleName).push(t);
  }

  const keptKeys = new Set();
  const taskIdToNodeId = new Map();
  let sortCounter = 0;

  async function upsertNode(payload) {
    keptKeys.add(payload.stableKey);
    const existing = await Node.findOne({ where: { stableKey: payload.stableKey } });
    if (existing) {
      await existing.update(payload);
      return existing;
    }
    return Node.create(payload);
  }

  for (let pi = 0; pi < phaseOrder.length; pi++) {
    const phaseName = phaseOrder[pi];
    const phaseKey = `phase:${pid}:${slugify(phaseName)}`;
    const phaseNode = await upsertNode({
      projectId: pid,
      parentId: null,
      type: 'phase',
      name: phaseName,
      description: null,
      status: null,
      priority: null,
      ownerId: null,
      startDate: null,
      dueDate: null,
      progress: 0,
      estimatedHours: null,
      actualHours: null,
      suggested: false,
      sortOrder: sortCounter++,
      taskId: null,
      stableKey: phaseKey,
    });

    const modules = phaseMap.get(phaseName).modules;
    let mi = 0;
    for (const [moduleName, moduleTasks] of modules.entries()) {
      const moduleKey = `module:${pid}:${slugify(phaseName)}:${slugify(moduleName)}`;
      const moduleNode = await upsertNode({
        projectId: pid,
        parentId: phaseNode.id,
        type: 'module',
        name: moduleName,
        description: null,
        status: null,
        priority: null,
        ownerId: null,
        startDate: null,
        dueDate: null,
        progress: 0,
        estimatedHours: null,
        actualHours: null,
        suggested: false,
        sortOrder: sortCounter++,
        taskId: null,
        stableKey: moduleKey,
      });
      mi++;

      for (const t of moduleTasks) {
        const taskKey = `task:${t.id}`;
        const node = await upsertNode({
          projectId: pid,
          parentId: moduleNode.id,
          type: 'task',
          name: t.taskName || t.task_name || `Task ${t.id}`,
          description: t.description || null,
          status: t.status || 'Upcoming',
          priority: t.priority || null,
          ownerId: t.developerId || t.developer_id || null,
          startDate: t.startDate || t.start_date || null,
          dueDate: t.dueDate || t.due_date || null,
          progress: taskProgress(t),
          estimatedHours: t.estimatedHours ?? t.estimated_hours ?? null,
          actualHours: t.actualHours ?? t.actual_hours ?? null,
          suggested: false,
          sortOrder: sortCounter++,
          taskId: t.id,
          stableKey: taskKey,
        });
        taskIdToNodeId.set(t.id, node.id);
      }
    }
  }

  // Remove auto-synced phase/module/task nodes that disappeared (keep custom middle layers)
  const stale = await Node.findAll({
    where: {
      projectId: pid,
      type: { [Op.in]: ['phase', 'module', 'task'] },
      stableKey: { [Op.notIn]: [...keptKeys] },
    },
  });
  for (const n of stale) {
    await n.destroy();
  }

  if (migrateDeps && workTasks.length) {
    const taskIdByHuman = new Map();
    for (const t of workTasks) {
      if (t.taskId || t.task_id) {
        taskIdByHuman.set(String(t.taskId || t.task_id).trim().toLowerCase(), t.id);
      }
      taskIdByHuman.set(String(t.id), t.id);
      const name = (t.taskName || t.task_name || '').trim().toLowerCase();
      if (name) taskIdByHuman.set(name, t.id);
    }

    for (const t of workTasks) {
      const nodeId = taskIdToNodeId.get(t.id);
      if (!nodeId) continue;
      const refs = parseDependencyRefs(t.dependencies);
      if (!refs.length) continue;

      for (const ref of refs) {
        const depTaskId =
          taskIdByHuman.get(ref.toLowerCase()) ||
          taskIdByHuman.get(ref.replace(/^#/, '').toLowerCase());
        if (!depTaskId || depTaskId === t.id) continue;
        const dependsOnId = taskIdToNodeId.get(depTaskId);
        if (!dependsOnId) continue;
        await NodeDependency.findOrCreate({
          where: { nodeId, dependsOnId },
          defaults: { nodeId, dependsOnId },
        });
      }
    }
  }

  return { phases: phaseOrder.length, tasks: workTasks.length };
}

async function syncProjectNodesSafe(projectId) {
  try {
    return await syncProjectNodes(projectId);
  } catch (err) {
    console.warn(`WBS sync failed for project ${projectId}:`, err.message);
    return null;
  }
}

module.exports = {
  syncProjectNodes,
  syncProjectNodesSafe,
  slugify,
  parseDependencyRefs,
};
