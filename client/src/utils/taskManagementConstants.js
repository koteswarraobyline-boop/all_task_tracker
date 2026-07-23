/**
 * Task Management module — status/priority display, colors, and filters.
 * Maps UI labels to existing API statuses so backend ENUM stays unchanged.
 */

/** Canonical API statuses stored in the database */
export const API_STATUSES = [
  'Upcoming',
  'Assigned',
  'In Development',
  'Code Review',
  'Testing',
  'Completed',
  'Blocked',
  'On Hold',
];

/**
 * UI status catalog for filters and chips.
 * `apiStatuses` = which DB values belong to this filter bucket.
 * `writeStatus` = value sent to the API when selecting this status.
 */
export const STATUS_CATALOG = [
  {
    key: 'all',
    label: 'All Tasks',
    apiStatuses: null,
    writeStatus: null,
    color: '#64748B',
    progress: null,
  },
  {
    key: 'not_started',
    label: 'Not Started',
    apiStatuses: ['Upcoming'],
    writeStatus: 'Upcoming',
    color: '#94A3B8',
    progress: 0,
  },
  {
    key: 'pending',
    label: 'Pending',
    apiStatuses: ['Assigned'],
    writeStatus: 'Assigned',
    color: '#EAB308',
    progress: 10,
  },
  {
    key: 'in_development',
    label: 'In Development',
    apiStatuses: ['In Development'],
    writeStatus: 'In Development',
    color: '#2563EB',
    progress: 60,
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    // Aggregate: actively moving through the pipeline (not a duplicate of In Development alone)
    apiStatuses: ['In Development', 'Code Review', 'Testing'],
    writeStatus: 'In Development',
    color: '#F97316',
    progress: 50,
  },
  {
    key: 'in_review',
    label: 'In Review',
    apiStatuses: ['Code Review'],
    writeStatus: 'Code Review',
    color: '#6366F1',
    progress: 70,
  },
  {
    key: 'testing',
    label: 'Testing',
    apiStatuses: ['Testing'],
    writeStatus: 'Testing',
    color: '#9333EA',
    progress: 80,
  },
  {
    key: 'blocked',
    label: 'Blocked',
    apiStatuses: ['Blocked'],
    writeStatus: 'Blocked',
    color: '#EF4444',
    progress: 25,
  },
  {
    key: 'completed',
    label: 'Completed',
    apiStatuses: ['Completed'],
    writeStatus: 'Completed',
    color: '#22C55E',
    progress: 100,
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    apiStatuses: ['On Hold'],
    writeStatus: 'On Hold',
    color: '#6B7280',
    progress: 0,
  },
];

/** Filter chips only (excludes "All Tasks") */
export const STATUS_FILTER_OPTIONS = STATUS_CATALOG.filter((s) => s.key !== 'all');

/** Selectable statuses for inline edits (one write target each) */
export const EDITABLE_STATUSES = [
  STATUS_CATALOG.find((s) => s.key === 'not_started'),
  STATUS_CATALOG.find((s) => s.key === 'pending'),
  STATUS_CATALOG.find((s) => s.key === 'in_development'),
  STATUS_CATALOG.find((s) => s.key === 'in_review'),
  STATUS_CATALOG.find((s) => s.key === 'testing'),
  STATUS_CATALOG.find((s) => s.key === 'blocked'),
  STATUS_CATALOG.find((s) => s.key === 'completed'),
  STATUS_CATALOG.find((s) => s.key === 'cancelled'),
].filter(Boolean);

/** Priority filters */
export const PRIORITY_OPTIONS = [
  { key: 'Critical', label: 'Critical', match: ['Critical', 'P0', 'critical'] },
  { key: 'High', label: 'High', match: ['High', 'P1', 'high'] },
  { key: 'Medium', label: 'Medium', match: ['Medium', 'P2', 'medium'] },
  { key: 'Low', label: 'Low', match: ['Low', 'P3', 'low'] },
];

export const PRIORITY_COLORS = {
  Critical: { color: '#B91C1C', bgcolor: '#FEE2E2', border: '#FECACA' },
  High: { color: '#C2410C', bgcolor: '#FFEDD5', border: '#FED7AA' },
  Medium: { color: '#B45309', bgcolor: '#FEF3C7', border: '#FDE68A' },
  Low: { color: '#166534', bgcolor: '#DCFCE7', border: '#BBF7D0' },
};

export const PRIORITY_COLORS_DARK = {
  Critical: { color: '#FCA5A5', bgcolor: '#450a0a', border: '#7f1d1d' },
  High: { color: '#FDBA74', bgcolor: '#7c2d12', border: '#9a3412' },
  Medium: { color: '#FCD34D', bgcolor: '#451a03', border: '#92400e' },
  Low: { color: '#6EE7B7', bgcolor: '#064e3b', border: '#065f46' },
};

export const SORT_OPTIONS = [
  { key: 'dueDate', label: 'Due Date' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'progress', label: 'Progress' },
  { key: 'createdAt', label: 'Created Date' },
];

export const VIEW_MODES = [
  { key: 'list', label: 'List' },
  { key: 'kanban', label: 'Kanban' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'calendar', label: 'Calendar' },
];

const API_TO_DISPLAY = {
  Upcoming: 'Not Started',
  Assigned: 'Pending',
  'In Development': 'In Development',
  'Code Review': 'In Review',
  Testing: 'Testing',
  Completed: 'Completed',
  Blocked: 'Blocked',
  'On Hold': 'Cancelled',
};

const API_TO_COLOR = {
  Upcoming: '#94A3B8',
  Assigned: '#EAB308',
  'In Development': '#2563EB',
  'Code Review': '#6366F1',
  Testing: '#9333EA',
  Completed: '#22C55E',
  Blocked: '#EF4444',
  'On Hold': '#6B7280',
};

/** Module-local progress defaults (examples from product spec) */
export const MODULE_STATUS_PROGRESS = {
  Upcoming: 0,
  Assigned: 10,
  'In Development': 60,
  'Code Review': 70,
  Testing: 80,
  Completed: 100,
  Blocked: 25,
  'On Hold': 0,
};

export function getStatusDisplayLabel(apiStatus) {
  return API_TO_DISPLAY[apiStatus] || apiStatus || '—';
}

export function getStatusColor(apiStatus) {
  return API_TO_COLOR[apiStatus] || '#64748B';
}

export function getStatusChipSx(apiStatus, isDark = false) {
  const color = getStatusColor(apiStatus);
  if (isDark) {
    return {
      color,
      bgcolor: `${color}22`,
      border: `1px solid ${color}55`,
    };
  }
  return {
    color,
    bgcolor: `${color}18`,
    border: `1px solid ${color}44`,
  };
}

export function normalizePriority(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  const lower = v.toLowerCase();
  if (lower === 'critical' || lower === 'p0') return 'Critical';
  if (lower === 'high' || lower === 'p1') return 'High';
  if (lower === 'medium' || lower === 'p2') return 'Medium';
  if (lower === 'low' || lower === 'p3') return 'Low';
  const hit = PRIORITY_OPTIONS.find((p) => p.match.some((m) => m.toLowerCase() === lower));
  return hit?.key || v;
}

export function getPriorityStyle(raw, isDark = false) {
  const key = normalizePriority(raw) || 'Medium';
  const map = isDark ? PRIORITY_COLORS_DARK : PRIORITY_COLORS;
  return map[key] || map.Medium;
}

export function getModuleProgressPercent(task) {
  if (!task) return 0;
  const explicit =
    task.progressPercent !== null && task.progressPercent !== undefined && task.progressPercent !== ''
      ? Number(task.progressPercent)
      : NaN;
  if (!Number.isNaN(explicit)) return Math.min(100, Math.max(0, Math.round(explicit)));
  return MODULE_STATUS_PROGRESS[task.status] ?? 0;
}

export function isWorkTask(task) {
  return task && task.recordType !== 'module';
}

export function toDateOnly(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-start
  x.setDate(x.getDate() + diff);
  return x;
}

export function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return endOfDay(e);
}

export function isOverdue(task, today = startOfDay()) {
  if (!task || task.status === 'Completed' || task.status === 'On Hold') return false;
  const due = toDateOnly(task.dueDate);
  if (!due) return false;
  return new Date(`${due}T00:00:00`) < today;
}

export function isDueToday(task, today = startOfDay()) {
  const due = toDateOnly(task.dueDate);
  if (!due) return false;
  const t = today.toISOString().slice(0, 10);
  return due === t;
}

export function isDueThisWeek(task, today = new Date()) {
  const due = toDateOnly(task.dueDate);
  if (!due) return false;
  const d = new Date(`${due}T00:00:00`);
  return d >= startOfWeek(today) && d <= endOfWeek(today);
}

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/**
 * Apply combined filters + search + sort for the Task Management module.
 */
export function filterAndSortTasks(tasks, filters, projectName = '') {
  const list = (tasks || []).filter(isWorkTask);
  const {
    statusKey = 'all',
    priorities = [],
    developerId = '',
    projectFilter = '',
    dateFrom = '',
    dateTo = '',
    quickFilter = '',
    search = '',
    sortBy = 'dueDate',
    sortOrder = 'asc',
  } = filters || {};

  const statusEntry = STATUS_CATALOG.find((s) => s.key === statusKey) || STATUS_CATALOG[0];
  const q = String(search || '').trim().toLowerCase();
  const today = startOfDay();

  let result = list.filter((task) => {
    if (statusEntry.apiStatuses && !statusEntry.apiStatuses.includes(task.status)) {
      return false;
    }

    if (priorities.length) {
      const p = normalizePriority(task.priority);
      if (!p || !priorities.includes(p)) return false;
    }

    if (developerId === 'unassigned') {
      if (task.developerId) return false;
    } else if (developerId) {
      if (String(task.developerId) !== String(developerId)) return false;
    }

    if (projectFilter) {
      const name = (projectName || '').toLowerCase();
      if (!name.includes(String(projectFilter).toLowerCase())) return false;
    }

    const start = toDateOnly(task.startDate);
    const due = toDateOnly(task.dueDate);
    if (dateFrom) {
      const anchor = due || start;
      if (!anchor || anchor < dateFrom) return false;
    }
    if (dateTo) {
      const anchor = due || start;
      if (!anchor || anchor > dateTo) return false;
    }

    if (quickFilter === 'due_today' && !isDueToday(task, today)) return false;
    if (quickFilter === 'due_week' && !isDueThisWeek(task, today)) return false;
    if (quickFilter === 'overdue' && !isOverdue(task, today)) return false;
    if (quickFilter === 'completed' && task.status !== 'Completed') return false;

    if (q) {
      const name = String(task.taskName || '').toLowerCase();
      const proj = String(projectName || '').toLowerCase();
      const assignee = String(task.developer?.name || '').toLowerCase();
      const id = String(task.taskId || '').toLowerCase();
      if (!name.includes(q) && !proj.includes(q) && !assignee.includes(q) && !id.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const dir = sortOrder === 'desc' ? -1 : 1;
  result = [...result].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'priority': {
        const pa = PRIORITY_RANK[normalizePriority(a.priority)] ?? 99;
        const pb = PRIORITY_RANK[normalizePriority(b.priority)] ?? 99;
        cmp = pa - pb;
        break;
      }
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''));
        break;
      case 'progress':
        cmp = getModuleProgressPercent(a) - getModuleProgressPercent(b);
        break;
      case 'createdAt':
        cmp = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        break;
      case 'dueDate':
      default: {
        const da = toDateOnly(a.dueDate) || '9999-99-99';
        const db = toDateOnly(b.dueDate) || '9999-99-99';
        cmp = da.localeCompare(db);
        break;
      }
    }
    return cmp * dir;
  });

  return result;
}

/** Summary KPI cards from a task list (unfiltered work tasks preferred) */
export function computeTaskStats(tasks) {
  const list = (tasks || []).filter(isWorkTask);
  const today = startOfDay();
  const highPriorities = new Set(['Critical', 'High']);

  const total = list.length;
  const completed = list.filter((t) => t.status === 'Completed').length;
  const ongoing = list.filter((t) =>
    ['In Development', 'Code Review', 'Testing', 'Assigned'].includes(t.status)
  ).length;
  const inProgress = list.filter((t) =>
    ['In Development', 'Code Review', 'Testing'].includes(t.status)
  ).length;
  const development = list.filter((t) => t.status === 'In Development').length;
  const testing = list.filter((t) => t.status === 'Testing').length;
  const pending = list.filter((t) => t.status === 'Assigned' || t.status === 'Upcoming').length;
  const blocked = list.filter((t) => t.status === 'Blocked').length;
  const overdue = list.filter((t) => isOverdue(t, today)).length;
  const highPriority = list.filter((t) => highPriorities.has(normalizePriority(t.priority))).length;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    ongoing,
    inProgress,
    development,
    testing,
    pending,
    blocked,
    overdue,
    highPriority,
    completionPct,
  };
}

export function buildStatusChartData(tasks) {
  const list = (tasks || []).filter(isWorkTask);
  const counts = {};
  list.forEach((t) => {
    const label = getStatusDisplayLabel(t.status);
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: getStatusColor(
      Object.keys(API_TO_DISPLAY).find((k) => API_TO_DISPLAY[k] === name) || name
    ),
  }));
}

export function buildPriorityChartData(tasks) {
  const list = (tasks || []).filter(isWorkTask);
  const buckets = { Critical: 0, High: 0, Medium: 0, Low: 0, Other: 0 };
  list.forEach((t) => {
    const p = normalizePriority(t.priority);
    if (p && buckets[p] !== undefined) buckets[p] += 1;
    else if (t.priority) buckets.Other += 1;
  });
  return Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

/** Completions grouped by ISO week (last 8 weeks) */
export function buildCompletedPerWeek(tasks) {
  const list = (tasks || []).filter(isWorkTask).filter((t) => t.status === 'Completed');
  const weeks = [];
  const now = startOfWeek(new Date());

  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    const end = endOfWeek(start);
    const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    weeks.push({ key: start.toISOString().slice(0, 10), label, start, end, count: 0 });
  }

  list.forEach((t) => {
    const doneAt = t.updatedAt || t.dueDate || t.createdAt;
    if (!doneAt) return;
    const d = new Date(doneAt);
    const bucket = weeks.find((w) => d >= w.start && d <= w.end);
    if (bucket) bucket.count += 1;
  });

  return weeks.map(({ label, count }) => ({ name: label, completed: count }));
}

export function computeProjectProgress(tasks) {
  const list = (tasks || []).filter(isWorkTask);
  if (!list.length) return 0;
  const sum = list.reduce((acc, t) => acc + getModuleProgressPercent(t), 0);
  return Math.round(sum / list.length);
}
