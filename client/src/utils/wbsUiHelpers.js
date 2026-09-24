import { tokens } from '../theme';

export const TYPE_LABEL = {
  phase: 'PHASE',
  stage: 'STAGE',
  function: 'FUNCTION',
  module: 'MODULE',
  category: 'CATEGORY',
  task: 'TASK',
};

export function collectTasks(node, out = []) {
  if (!node) return out;
  if (node.type === 'task') out.push(node);
  (node.children || []).forEach((c) => collectTasks(c, out));
  return out;
}

export function findNodeInTree(tree, id) {
  if (!tree || id == null) return null;
  const target = Number(id);
  const stack = Array.isArray(tree) ? [...tree] : [tree];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (Number(n.id) === target) return n;
    if (n.children?.length) stack.push(...n.children);
  }
  return null;
}

export function buildBreadcrumbPath(tree, nodeId) {
  const path = [];
  function walk(nodes, trail) {
    for (const n of nodes || []) {
      const next = [...trail, n];
      if (Number(n.id) === Number(nodeId)) {
        path.push(...next);
        return true;
      }
      if (walk(n.children, next)) return true;
    }
    return false;
  }
  walk(tree, []);
  return path;
}

export function fmtShortDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtLongDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function workingDays(startIso, endIso) {
  if (!startIso || !endIso) return null;
  let cur = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime()) || end < cur) return null;
  let n = 0;
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) n += 1;
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

export function calendarDays(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const a = new Date(startIso);
  const b = new Date(endIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

export function ownerName(node) {
  return node?.owner?.name || node?.ownerName || 'Unassigned';
}

export function taskProgress(node) {
  if (!node) return 0;
  const status = String(node.status || '');
  if (/^(completed|done)$/i.test(status)) return 100;
  return Math.max(0, Math.min(100, Number(node.progress) || 0));
}

export function statusChipSx(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'done') {
    return { bgcolor: tokens.colors.successBg, color: tokens.colors.success };
  }
  if (s === 'blocked') {
    return { bgcolor: tokens.colors.warningBg, color: tokens.colors.warning };
  }
  if (s.includes('progress') || s === 'in development' || s === 'testing' || s === 'assigned') {
    return { bgcolor: tokens.colors.primarySoft, color: tokens.colors.primary };
  }
  if (s.includes('overdue')) {
    return { bgcolor: tokens.colors.dangerBg, color: tokens.colors.danger };
  }
  return { bgcolor: '#F1F5F9', color: tokens.colors.textSecondary };
}

export function isDoneStatus(status) {
  return /^(completed|done)$/i.test(String(status || ''));
}
