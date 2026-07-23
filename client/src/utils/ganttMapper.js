/**
 * Maps Task Tracker tasks ↔ SVAR Gantt chart models.
 * App dates: startDate / dueDate (inclusive DATEONLY strings).
 * Gantt dates: start / end (Date objects; end is exclusive for duration math).
 */

import { getTaskProgressPercent } from './taskProgress';
import { getStatusDisplayLabel, getStatusColor } from './taskManagementConstants';
import { getDeveloperDisplayName } from './developerDisplay';

/** Workflow status → simplified timeline status for display. */
export const TIMELINE_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DELAYED: 'Delayed',
};

/**
 * Roadmap-style bar colors (Jira / ClickUp / Monday inspired).
 * Green=Completed, Blue=Development, Orange=In Progress, Purple=Testing,
 * Yellow=Pending, Red=Blocked, Gray=Cancelled.
 */
export const STATUS_BAR_COLORS = {
  Upcoming: '#EAB308',
  Assigned: '#EAB308',
  'In Development': '#2563EB',
  'Code Review': '#F97316',
  Testing: '#9333EA',
  Completed: '#22C55E',
  Blocked: '#EF4444',
  'On Hold': '#6B7280',
};

const TIMELINE_STATUS_COLORS = {
  [TIMELINE_STATUS.NOT_STARTED]: '#EAB308',
  [TIMELINE_STATUS.IN_PROGRESS]: '#F97316',
  [TIMELINE_STATUS.COMPLETED]: '#22C55E',
  [TIMELINE_STATUS.DELAYED]: '#EF4444',
};

export const GROUP_BY_OPTIONS = [
  { key: 'epic', label: 'Epic' },
  { key: 'module', label: 'Module' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'milestone', label: 'Milestone' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
];

/** Common holidays (month-day) — highlighted on day/week scales. */
export const HOLIDAY_MMDD = new Set([
  '01-01',
  '01-26',
  '05-01',
  '08-15',
  '10-02',
  '12-25',
]);

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Format a Date as local YYYY-MM-DD (never UTC — avoids CSV day-shift). */
export function formatLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Normalize any date-like value to YYYY-MM-DD (CSV / DATEONLY form).
 * Uses local calendar parts for Date objects so IST/other offsets don't shift the day.
 */
export function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatLocalDate(value);
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // ISO datetime → prefer the calendar date before the T (API / Sequelize)
  const isoDay = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoDay) return isoDay[1];
  const s = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Parse DATEONLY as local midnight Date. */
export function parseLocalDate(dateStr) {
  const s = toDateOnly(dateStr);
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Live Start label from a Gantt row (updates while dragging). */
export function rowStartLabel(row) {
  if (row?.start instanceof Date && !Number.isNaN(row.start.getTime())) {
    return formatLocalDate(row.start);
  }
  return toDateOnly(row?.$startLabel) || toDateOnly(row?.start) || null;
}

/** Live Due label from a Gantt row (end is exclusive). */
export function rowDueLabel(row) {
  if (row?.end instanceof Date && !Number.isNaN(row.end.getTime())) {
    return dueFromExclusiveEnd(row.end);
  }
  return toDateOnly(row?.$endLabel) || toDateOnly(row?.end) || null;
}

/** Inclusive day count between two local dates. */
export function daysBetweenInclusive(start, end) {
  if (!start || !end) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/** Remaining calendar days until due (negative if overdue). */
export function remainingDays(dueDate, today = new Date()) {
  const due = parseLocalDate(dueDate);
  if (!due) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - t.getTime()) / 86400000);
}

/** Exclusive end = day after inclusive due date (SVAR duration math). */
export function exclusiveEndFromDue(dueDate) {
  const d = parseLocalDate(dueDate);
  if (!d) return null;
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return next;
}

export function dueFromExclusiveEnd(endDate) {
  if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) return null;
  const d = new Date(endDate);
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(date) {
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return HOLIDAY_MMDD.has(`${mm}-${dd}`);
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Map app workflow status (+ due date) to simplified Gantt status.
 */
export function toTimelineStatus(task, today = new Date()) {
  const status = task?.status;
  if (status === 'Completed') return TIMELINE_STATUS.COMPLETED;
  if (status === 'Blocked') return TIMELINE_STATUS.DELAYED;

  const due = parseLocalDate(task?.dueDate);
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (due && due < todayLocal && status !== 'Completed') {
    return TIMELINE_STATUS.DELAYED;
  }

  if (status === 'Upcoming' || status === 'Assigned') return TIMELINE_STATUS.NOT_STARTED;
  return TIMELINE_STATUS.IN_PROGRESS;
}

export function barColorForTask(task) {
  const timeline = toTimelineStatus(task);
  if (timeline === TIMELINE_STATUS.DELAYED && task?.status !== 'Blocked') {
    return TIMELINE_STATUS_COLORS[TIMELINE_STATUS.DELAYED];
  }
  return STATUS_BAR_COLORS[task?.status] || getStatusColor(task?.status) || '#64748B';
}

/** Single-day (or zero-duration) tasks render as milestone diamonds. */
export function isMilestoneTask(task) {
  if (!task || task.recordType === 'module') return false;
  const start = toDateOnly(task.startDate);
  const due = toDateOnly(task.dueDate);
  if (start && due && start === due) return true;
  const tags = Array.isArray(task.tags) ? task.tags : [];
  return tags.some((t) => String(t).toLowerCase() === 'milestone');
}

/**
 * Parse free-text dependencies field into predecessor taskId strings.
 * Accepts "1.2, 1.3" or "T-1;T-2" etc.
 */
export function parseDependencyIds(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/[,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeSprintKey(raw) {
  let weekKey = (raw || 'Unscheduled').trim();
  if (!weekKey) weekKey = 'Unscheduled';
  const lower = weekKey.toLowerCase();
  if (lower.startsWith('week') || lower.startsWith('sprint')) {
    const num = weekKey.match(/\d+/);
    if (num) weekKey = `Sprint ${num[0]}`;
  } else if (lower.startsWith('w') && /^\s*w\d+/i.test(weekKey)) {
    const num = weekKey.match(/\d+/);
    if (num) weekKey = `Sprint ${num[0]}`;
  }
  return weekKey;
}

function groupKeyForTask(task, groupBy, devById) {
  switch (groupBy) {
    case 'module':
      return (task.module || task.parentId || 'Ungrouped').toString().trim() || 'Ungrouped';
    case 'sprint':
      return normalizeSprintKey(task.week);
    case 'milestone':
    case 'epic':
      return (task.phase || 'General').trim() || 'General';
    case 'assignee': {
      const developer =
        task.developer ||
        (task.developerId != null ? devById.get(task.developerId) : null) ||
        null;
      return getDeveloperDisplayName(developer);
    }
    case 'status':
      return getStatusDisplayLabel(task.status) || 'Unknown';
    default:
      return (task.phase || 'General').trim() || 'General';
  }
}

function enrichWorkTask(t, devById, parent) {
  const start = parseLocalDate(t.startDate) || parseLocalDate(t.dueDate) || new Date();
  const due = parseLocalDate(t.dueDate) || start;
  const endExclusive = exclusiveEndFromDue(formatLocalDate(due));
  const duration = daysBetweenInclusive(start, due);
  const progress = getTaskProgressPercent(t);
  const timelineStatus = toTimelineStatus(t);
  const developer =
    t.developer || (t.developerId != null ? devById.get(t.developerId) : null) || null;
  const assigneeName = getDeveloperDisplayName(developer);
  const est = Number(t.estimatedHours) || 0;
  const remainingHours =
    est > 0 ? Math.max(0, Math.round((est * (100 - progress)) / 100)) : null;
  const remDays = remainingDays(formatLocalDate(due));
  const milestone = isMilestoneTask(t);

  const epic = (t.phase || 'General').trim() || 'General';

  return {
    id: t.id,
    text: t.taskName || 'Task',
    type: milestone ? 'milestone' : 'task',
    parent,
    start,
    end: endExclusive,
    duration: milestone ? 0 : duration,
    progress,
    color: barColorForTask(t),
    $appId: t.id,
    $task: t,
    $taskId: t.taskId || '',
    $epic: epic,
    $assignee: assigneeName,
    $assigneeInitials: assigneeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join(''),
    $status: timelineStatus,
    $workflowStatus: t.status,
    $statusLabel: getStatusDisplayLabel(t.status),
    $priority: t.priority || '',
    $startLabel: formatLocalDate(start),
    $endLabel: formatLocalDate(due),
    $progress: progress,
    $description: t.description || '',
    $remarks: t.remarks || '',
    $estimatedHours: est || null,
    $remainingHours: remainingHours,
    $remainingDays: remDays,
    $synthetic: false,
    open: false,
  };
}

function rollupGroup(groupNode, kids) {
  if (!kids.length) return;
  let minStart = null;
  let maxEnd = null;
  let progressSum = 0;
  let progressCount = 0;
  kids.forEach((k) => {
    if (k.start && (!minStart || k.start < minStart)) minStart = k.start;
    const kEnd = k.end || k.start;
    if (kEnd && (!maxEnd || kEnd > maxEnd)) maxEnd = kEnd;
    if (typeof k.progress === 'number' && (k.type === 'task' || k.type === 'milestone')) {
      progressSum += k.progress;
      progressCount += 1;
    }
  });
  if (minStart) {
    groupNode.start = minStart;
    groupNode.end =
      maxEnd ||
      (() => {
        const e = new Date(minStart);
        e.setDate(e.getDate() + 1);
        return e;
      })();
    groupNode.duration = daysBetweenInclusive(
      minStart,
      new Date(groupNode.end.getTime() - 86400000)
    );
    groupNode.progress = progressCount ? Math.round(progressSum / progressCount) : 0;
    groupNode.$progress = groupNode.progress;
    groupNode.$startLabel = formatLocalDate(minStart);
    groupNode.$endLabel = formatLocalDate(new Date(groupNode.end.getTime() - 86400000));
  }
}

/**
 * Build hierarchical Gantt tasks + dependency links from project tasks.
 * @param {Array} tasks
 * @param {Array} developers
 * @param {{ groupBy?: string, collapsedGroups?: Set<string>, defaultOpen?: boolean }} [options]
 */
export function buildGanttData(tasks, developers = [], options = {}) {
  const list = Array.isArray(tasks) ? tasks : [];
  const groupBy = options.groupBy || 'epic';
  const defaultOpen = options.defaultOpen !== false;
  const collapsedGroups = options.collapsedGroups || new Set();
  const devById = new Map((developers || []).map((d) => [d.id, d]));

  const modules = list.filter((t) => t.recordType === 'module');
  const workTasks = list.filter((t) => t.recordType !== 'module');

  const moduleByTaskId = new Map();
  modules.forEach((m) => {
    if (m.taskId) moduleByTaskId.set(String(m.taskId), m);
  });

  const ganttTasks = [];
  const idMap = new Map();
  const taskIdToGanttId = new Map();
  const groupOrder = [];
  const groupSet = new Set();

  const ensureGroup = (key) => {
    if (groupSet.has(key)) return `group:${key}`;
    groupSet.add(key);
    groupOrder.push(key);
    const gid = `group:${key}`;
    const open = defaultOpen && !collapsedGroups.has(key);
    ganttTasks.push({
      id: gid,
      text: key,
      type: 'summary',
      open,
      parent: 0,
      progress: 0,
      $groupKey: key,
      $epic: key,
      $synthetic: true,
      start: new Date(),
      duration: 1,
      $statusLabel: '',
      $assignee: '',
      $progress: 0,
    });
    return gid;
  };

  // Epic mode keeps module nesting when modules exist
  if (groupBy === 'epic' && modules.length) {
    workTasks.forEach((t) => {
      const phase = (t.phase || 'General').trim() || 'General';
      ensureGroup(phase);
    });
    modules.forEach((m) => {
      const phase = (m.phase || 'General').trim() || 'General';
      ensureGroup(phase);
    });

    modules.forEach((m) => {
      const phase = (m.phase || 'General').trim() || 'General';
      const gid = `mod:${m.id}`;
      idMap.set(m.id, gid);
      if (m.taskId) taskIdToGanttId.set(String(m.taskId), gid);

      const start = parseLocalDate(m.startDate) || parseLocalDate(m.dueDate) || new Date();
      const due = parseLocalDate(m.dueDate) || start;
      const end =
        exclusiveEndFromDue(formatLocalDate(due)) ||
        (() => {
          const e = new Date(start);
          e.setDate(e.getDate() + 1);
          return e;
        })();

      ganttTasks.push({
        id: gid,
        text: m.taskName || m.module || m.taskId || 'Module',
        type: 'summary',
        open: defaultOpen && !collapsedGroups.has(`mod:${m.id}`),
        parent: `group:${phase}`,
        start,
        end,
        duration: daysBetweenInclusive(start, due),
        progress: getTaskProgressPercent(m),
        $appId: m.id,
        $task: m,
        $synthetic: false,
        $epic: phase,
        $progress: getTaskProgressPercent(m),
        $startLabel: formatLocalDate(start),
        $endLabel: formatLocalDate(due),
        $statusLabel: '',
        $assignee: '',
      });
    });

    workTasks.forEach((t) => {
      const phase = (t.phase || 'General').trim() || 'General';
      let parent = `group:${phase}`;
      if (t.parentId && moduleByTaskId.has(String(t.parentId))) {
        parent = `mod:${moduleByTaskId.get(String(t.parentId)).id}`;
      } else if (t.module && moduleByTaskId.has(String(t.module))) {
        parent = `mod:${moduleByTaskId.get(String(t.module)).id}`;
      }
      const node = enrichWorkTask(t, devById, parent);
      idMap.set(t.id, node.id);
      if (t.taskId) taskIdToGanttId.set(String(t.taskId), node.id);
      ganttTasks.push(node);
    });
  } else {
    workTasks.forEach((t) => {
      const key = groupKeyForTask(t, groupBy, devById);
      ensureGroup(key);
    });
    if (!groupOrder.length) ensureGroup(groupBy === 'sprint' ? 'Unscheduled' : 'General');

    workTasks.forEach((t) => {
      const key = groupKeyForTask(t, groupBy, devById);
      const parent = `group:${key}`;
      const node = enrichWorkTask(t, devById, parent);
      idMap.set(t.id, node.id);
      if (t.taskId) taskIdToGanttId.set(String(t.taskId), node.id);
      ganttTasks.push(node);
    });
  }

  // Roll up group dates
  groupOrder.forEach((key) => {
    const gid = `group:${key}`;
    const kids = ganttTasks.filter((g) => {
      if (g.parent === gid) return true;
      const parentNode = ganttTasks.find((p) => p.id === g.parent);
      return parentNode?.parent === gid;
    });
    const groupNode = ganttTasks.find((g) => g.id === gid);
    if (groupNode) rollupGroup(groupNode, kids);
  });

  // Roll up modules
  ganttTasks
    .filter((g) => typeof g.id === 'string' && g.id.startsWith('mod:'))
    .forEach((modNode) => {
      const kids = ganttTasks.filter((g) => g.parent === modNode.id);
      rollupGroup(modNode, kids);
    });

  // Phase-end milestone diamonds (one per epic/group with a due range)
  if (groupBy === 'milestone' || groupBy === 'epic') {
    groupOrder.forEach((key) => {
      const groupNode = ganttTasks.find((g) => g.id === `group:${key}`);
      if (!groupNode?.end) return;
      const due = new Date(groupNode.end.getTime() - 86400000);
      ganttTasks.push({
        id: `ms:${key}`,
        text: `${key} milestone`,
        type: 'milestone',
        parent: `group:${key}`,
        start: due,
        end: exclusiveEndFromDue(formatLocalDate(due)),
        duration: 0,
        progress: groupNode.progress >= 100 ? 100 : 0,
        color: '#0EA5E9',
        $synthetic: true,
        $statusLabel: 'Milestone',
        $assignee: '',
        $progress: groupNode.progress >= 100 ? 100 : 0,
        $startLabel: formatLocalDate(due),
        $endLabel: formatLocalDate(due),
        $taskId: '',
        $isGroupMilestone: true,
      });
    });
  }

  const links = [];
  let linkId = 1;
  workTasks.forEach((t) => {
    const preds = parseDependencyIds(t.dependencies);
    preds.forEach((predTaskId) => {
      const source = taskIdToGanttId.get(String(predTaskId));
      const target = idMap.get(t.id);
      if (source != null && target != null && source !== target) {
        links.push({
          id: linkId++,
          source,
          target,
          type: 'e2s',
        });
      }
    });
  });

  const leafProgress = workTasks.map((t) => getTaskProgressPercent(t));
  const projectCompletion = leafProgress.length
    ? Math.round(leafProgress.reduce((a, b) => a + b, 0) / leafProgress.length)
    : 0;

  return { ganttTasks, links, projectCompletion, idMap, groupOrder };
}

/**
 * Convert a Gantt task date change back to API payload fields.
 */
export function ganttDatesToApi(taskPatch) {
  const start = taskPatch.start instanceof Date ? taskPatch.start : parseLocalDate(taskPatch.start);
  let end = taskPatch.end instanceof Date ? taskPatch.end : parseLocalDate(taskPatch.end);

  if (!start) return null;

  if (!end && taskPatch.duration) {
    end = new Date(start);
    end.setDate(end.getDate() + Math.max(1, Number(taskPatch.duration)));
  }

  const startDate = formatLocalDate(start);
  const dueDate = end ? dueFromExclusiveEnd(end) : startDate;
  return { startDate, dueDate };
}
