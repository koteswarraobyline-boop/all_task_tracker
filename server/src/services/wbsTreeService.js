const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Node, NodeDependency, Comment, Developer, Project, Task, ReviewLink } = require('../models');
const { syncProjectNodes } = require('./wbsSyncService');

const DONE_STATUSES = new Set(['Completed', 'Done']);
const IN_PROGRESS_STATUSES = new Set(['In Development', 'Testing', 'Assigned', 'In Progress']);
const BLOCKED_STATUSES = new Set(['Blocked']);

function toPlain(row) {
  return row?.get ? row.get({ plain: true }) : row;
}

function isDone(status) {
  return DONE_STATUSES.has(status);
}

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

/**
 * Detect whether adding edge nodeId → dependsOnId would create a cycle.
 */
async function wouldCreateCycle(projectId, nodeId, dependsOnId) {
  if (nodeId === dependsOnId) return true;
  const deps = await NodeDependency.findAll({
    include: [
      {
        model: Node,
        as: 'node',
        attributes: ['id'],
        where: { projectId },
        required: true,
      },
    ],
  });
  const adj = new Map();
  for (const d of deps) {
    const from = d.nodeId;
    const to = d.dependsOnId;
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from).push(to);
  }
  if (!adj.has(nodeId)) adj.set(nodeId, []);
  adj.get(nodeId).push(dependsOnId);

  const stack = [dependsOnId];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (cur === nodeId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of adj.get(cur) || []) stack.push(next);
  }
  return false;
}

function rollupProgress(node) {
  if (node.type === 'task') {
    if (isDone(node.status)) return 100;
    return Number(node.progress) || 0;
  }
  const tasks = [];
  function walk(n) {
    if (n.type === 'task') tasks.push(n);
    (n.children || []).forEach(walk);
  }
  walk(node);
  if (!tasks.length) return 0;
  const sum = tasks.reduce((a, t) => a + (isDone(t.status) ? 100 : Number(t.progress) || 0), 0);
  return Math.round(sum / tasks.length);
}

function collectTasks(node, out = []) {
  if (node.type === 'task') out.push(node);
  (node.children || []).forEach((c) => collectTasks(c, out));
  return out;
}

function dateRange(node) {
  const tasks = collectTasks(node);
  const starts = tasks.map((t) => parseDate(t.startDate)).filter(Boolean);
  const ends = tasks.map((t) => parseDate(t.dueDate)).filter(Boolean);
  if (!starts.length && !ends.length) return null;
  const start = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null;
  const end = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null;
  return { start, end };
}

function buildBreadcrumb(byId, nodeId) {
  const parts = [];
  let cur = byId.get(nodeId);
  while (cur) {
    parts.unshift(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return parts.join(' › ');
}

function filterTreeByOwner(nodes, ownerId) {
  if (!ownerId) return nodes;
  const oid = Number(ownerId);

  function filterNode(n) {
    if (n.type === 'task') {
      return n.ownerId === oid ? { ...n } : null;
    }
    const children = (n.children || []).map(filterNode).filter(Boolean);
    if (!children.length) return null;
    return { ...n, children };
  }

  return nodes.map(filterNode).filter(Boolean);
}

async function loadProjectTree(projectId, { viewAs = null, ensureSync = true, forceRefresh = false } = {}) {
  const pid = Number(projectId);
  if (ensureSync) {
    const count = await Node.count({ where: { projectId: pid } });
    if (count === 0 || forceRefresh) {
      await syncProjectNodes(pid);
    }
  }

  const nodes = await Node.findAll({
    where: { projectId: pid },
    include: [
      { model: Developer, as: 'owner', attributes: ['id', 'name', 'color', 'role', 'allocation'] },
    ],
    order: [
      ['sort_order', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  const deps = await NodeDependency.findAll({
    include: [
      {
        model: Node,
        as: 'node',
        attributes: ['id'],
        where: { projectId: pid },
        required: true,
      },
    ],
  });

  const commentCounts = await Comment.findAll({
    attributes: [
      'nodeId',
      [sequelize.fn('COUNT', sequelize.col('Comment.id')), 'count'],
    ],
    where: { projectId: pid, nodeId: { [Op.ne]: null } },
    group: ['nodeId'],
    raw: true,
  });
  const commentMap = new Map(
    commentCounts.map((r) => [r.nodeId, parseInt(r.count, 10) || 0])
  );

  const reviewLinks = await ReviewLink.findAll({
    where: { projectId: pid },
    order: [
      ['createdAt', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  const reviewMap = new Map();
  for (const row of reviewLinks) {
    const link = toPlain(row);
    if (!reviewMap.has(link.nodeId)) reviewMap.set(link.nodeId, []);
    reviewMap.get(link.nodeId).push({
      id: link.id,
      label: link.label,
      url: link.url,
      username: link.username,
      password: link.sitePassword,
      note: link.note,
      createdAt: link.createdAt,
    });
  }

  const byId = new Map();
  for (const row of nodes) {
    const n = toPlain(row);
    n.children = [];
    n.dependsOn = [];
    n.dependsOnNames = [];
    n.commentCount = commentMap.get(n.id) || 0;
    n.reviewLinks = reviewMap.get(n.id) || [];
    n.reviewLinkCount = n.reviewLinks.length;
    byId.set(n.id, n);
  }

  const depNameById = new Map([...byId.entries()].map(([id, n]) => [id, n.name]));
  for (const d of deps) {
    const n = byId.get(d.nodeId);
    if (!n) continue;
    n.dependsOn.push(d.dependsOnId);
    n.dependsOnNames.push(depNameById.get(d.dependsOnId) || `#${d.dependsOnId}`);
  }

  const roots = [];
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId).children.push(n);
    } else if (!n.parentId) {
      roots.push(n);
    } else {
      roots.push(n);
    }
  }

  function annotate(n) {
    n.progress = rollupProgress(n);
    const range = dateRange(n);
    n.rangeStart = range?.start ? range.start.toISOString().slice(0, 10) : null;
    n.rangeEnd = range?.end ? range.end.toISOString().slice(0, 10) : null;
    const tasks = collectTasks(n);
    n.taskCount = tasks.length;
    n.doneCount = tasks.filter((t) => isDone(t.status)).length;
    n.blockedCount = tasks.filter((t) => BLOCKED_STATUSES.has(t.status)).length;
    n.inProgressCount = tasks.filter((t) => IN_PROGRESS_STATUSES.has(t.status)).length;
    if (n.type === 'task') {
      const waiting = [];
      for (const depId of n.dependsOn || []) {
        const dep = byId.get(depId);
        if (dep && !isDone(dep.status)) waiting.push(dep.name);
      }
      n.waitingOn = waiting;
      n.isBlockedByDeps = waiting.length > 0;
    } else {
      n.waitingOn = [];
      n.isBlockedByDeps = false;
    }
    (n.children || []).forEach(annotate);
  }
  roots.forEach(annotate);

  const filtered = filterTreeByOwner(roots, viewAs);

  return { tree: filtered, byId, allNodes: [...byId.values()] };
}

function computeOverviewMetrics(tree, project) {
  const allTasks = [];
  tree.forEach((p) => collectTasks(p, allTasks));
  const today = startOfDay(new Date());
  const done = allTasks.filter((t) => isDone(t.status)).length;
  const inProgress = allTasks.filter((t) => IN_PROGRESS_STATUSES.has(t.status)).length;
  const blocked = allTasks.filter((t) => BLOCKED_STATUSES.has(t.status)).length;
  const pastDue = allTasks.filter((t) => {
    if (isDone(t.status) || !t.dueDate) return false;
    const d = parseDate(t.dueDate);
    return d && d < today;
  }).length;

  const overall =
    allTasks.length === 0
      ? 0
      : Math.round(
          allTasks.reduce((a, t) => a + (isDone(t.status) ? 100 : Number(t.progress) || 0), 0) /
            allTasks.length
        );

  let categories = 0;
  let modules = 0;
  function walk(n) {
    if (n.type === 'category') categories++;
    if (n.type === 'module') modules++;
    (n.children || []).forEach(walk);
  }
  tree.forEach(walk);

  const datedEnds = [];
  const datedStarts = [];
  allTasks.forEach((t) => {
    const s = parseDate(t.startDate);
    const e = parseDate(t.dueDate);
    if (s) datedStarts.push(s);
    if (e) datedEnds.push(e);
  });
  const delivery =
    parseDate(project?.targetDeliveryDate || project?.target_delivery_date) ||
    (datedEnds.length ? new Date(Math.max(...datedEnds.map((d) => d.getTime()))) : null);
  const kickoff =
    datedStarts.length ? new Date(Math.min(...datedStarts.map((d) => d.getTime()))) : null;

  let daysToDelivery = null;
  if (delivery) {
    daysToDelivery = delivery >= today ? daysBetween(today, delivery) : 0;
  }

  return {
    phases: tree.filter((n) => n.type === 'phase').length || tree.length,
    tasks: allTasks.length,
    done,
    inProgress,
    blocked,
    pastDue,
    overall,
    categories,
    modules,
    daysToDelivery,
    kickoff: kickoff ? kickoff.toISOString().slice(0, 10) : null,
    finalDelivery: delivery ? delivery.toISOString().slice(0, 10) : null,
  };
}

function buildDependencyLayers(tree) {
  const tasks = [];
  tree.forEach((p) => collectTasks(p, tasks));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const cache = new Map();

  function layerOf(t, seen = new Set()) {
    if (cache.has(t.id)) return cache.get(t.id);
    if (seen.has(t.id)) return 0;
    seen.add(t.id);
    const deps = (t.dependsOn || []).map((id) => byId.get(id)).filter(Boolean);
    if (!deps.length) {
      cache.set(t.id, 0);
      return 0;
    }
    const l = 1 + Math.max(...deps.map((d) => layerOf(d, seen)));
    cache.set(t.id, l);
    return l;
  }

  const layers = {};
  for (const t of tasks) {
    const l = layerOf(t);
    if (!layers[l]) layers[l] = [];
    layers[l].push(t);
  }
  return Object.keys(layers)
    .map(Number)
    .sort((a, b) => a - b)
    .map((step) => ({
      step: step + 1,
      tasks: layers[step],
    }));
}

module.exports = {
  loadProjectTree,
  computeOverviewMetrics,
  buildDependencyLayers,
  wouldCreateCycle,
  buildBreadcrumb,
  collectTasks,
  isDone,
  DONE_STATUSES,
  IN_PROGRESS_STATUSES,
  BLOCKED_STATUSES,
};
