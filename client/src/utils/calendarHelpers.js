import { splitTitleAndDescription } from '../components/TaskDetailsDrawer';
import { normalizeLegacyStatus, STATUS_LABELS } from '../components/TaskBoard/constants';
import {
  getStatusColor,
  getOverdueDays,
  isOverdue,
  isDueToday,
  isWorkTask,
  toDateOnly,
  startOfDay,
  normalizePriority,
} from './taskManagementConstants';
import { getTaskProgressPercent } from './taskProgress';
import { getDeveloperDisplayName } from './developerDisplay';

export { toDateOnly, startOfDay };

export const COLOR_BY_OPTIONS = [
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'developer', label: 'Developer' },
];

const PRIORITY_EVENT_COLORS = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#D97706',
  Low: '#2563EB',
  P0: '#DC2626',
  P1: '#EA580C',
  P2: '#2563EB',
  P3: '#059669',
};

const DEFAULT_DEV_COLOR = '#64748B';

/** FullCalendar end is exclusive for all-day events. */
export function exclusiveEnd(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function formatDateKey(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDateKey(key) {
  if (!key) return null;
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDayHeader(date) {
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthYear(date) {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function getEventColor(task, colorBy, developers = []) {
  if (colorBy === 'priority') {
    const p = normalizePriority(task.priority) || task.priority;
    return PRIORITY_EVENT_COLORS[p] || PRIORITY_EVENT_COLORS[task.priority] || DEFAULT_DEV_COLOR;
  }
  if (colorBy === 'developer') {
    const dev = developers.find(
      (d) => d.id === task.developerId || d.id === parseInt(task.developerId, 10)
    );
    return dev?.color || DEFAULT_DEV_COLOR;
  }
  const status = normalizeLegacyStatus(task.status);
  return getStatusColor(status === 'Upcoming' ? 'Upcoming' : task.status === 'Code Review' ? 'Testing' : task.status);
}

export function taskSpansDate(task, dateKey) {
  const start = toDateOnly(task.startDate);
  const due = toDateOnly(task.dueDate);
  if (!start && !due) return false;
  if (start && due) return dateKey >= start && dateKey <= due;
  return dateKey === (due || start);
}

export function taskToCalendarEvent(task, { colorBy = 'status', developers = [] } = {}) {
  const start = toDateOnly(task.startDate);
  const due = toDateOnly(task.dueDate);
  if (!start && !due) return null;

  const { title } = splitTitleAndDescription(task.taskName, task.description);
  const color = getEventColor(task, colorBy, developers);
  const normalizedStatus = normalizeLegacyStatus(task.status);
  const overdue = isOverdue(task);
  const overdueDays = getOverdueDays(task);

  let eventStart = start || due;
  let eventEnd;
  if (start && due && due > start) {
    eventEnd = exclusiveEnd(due);
  } else if (!start && due) {
    eventStart = due;
  }

  return {
    id: String(task.id),
    title: title || task.taskName || 'Task',
    start: eventStart,
    end: eventEnd,
    allDay: true,
    backgroundColor: color,
    borderColor: color,
    textColor: '#fff',
    extendedProps: {
      task,
      taskId: task.taskId,
      status: normalizedStatus,
      statusLabel: STATUS_LABELS[normalizedStatus] || normalizedStatus,
      progress: getTaskProgressPercent(task),
      overdue,
      overdueDays,
      colorBy,
    },
  };
}

export function tasksForDate(tasks, dateKey) {
  return (tasks || []).filter((t) => isWorkTask(t) && taskSpansDate(t, dateKey));
}

export function groupDayTasks(tasks, dateKey, today = startOfDay()) {
  const dayTasks = tasksForDate(tasks, dateKey);
  const groups = { overdue: [], dueToday: [], upcoming: [], completed: [] };

  dayTasks.forEach((task) => {
    const normalized = normalizeLegacyStatus(task.status);
    if (normalized === 'Completed' || task.status === 'Completed') {
      groups.completed.push(task);
    } else if (isOverdue(task, today)) {
      groups.overdue.push(task);
    } else if (isDueToday(task, today) || dateKey === toDateOnly(task.dueDate)) {
      groups.dueToday.push(task);
    } else {
      groups.upcoming.push(task);
    }
  });

  const sortFn = (a, b) => String(a.taskId || '').localeCompare(String(b.taskId || ''));
  Object.keys(groups).forEach((k) => groups[k].sort(sortFn));
  return groups;
}

export function countDaySummary(groups) {
  return {
    overdue: groups.overdue.length,
    dueToday: groups.dueToday.length,
    upcoming: groups.upcoming.length,
    completed: groups.completed.length,
    total:
      groups.overdue.length +
      groups.dueToday.length +
      groups.upcoming.length +
      groups.completed.length,
  };
}

export function buildTooltip(task, developers = []) {
  const { title } = splitTitleAndDescription(task.taskName, task.description);
  const dev = developers.find(
    (d) => d.id === task.developerId || d.id === parseInt(task.developerId, 10)
  );
  const status = STATUS_LABELS[normalizeLegacyStatus(task.status)] || task.status;
  const lines = [
    title || 'Task',
    task.taskId ? `ID: ${task.taskId}` : null,
    `Status: ${status}`,
    dev ? `Developer: ${getDeveloperDisplayName(dev)}` : null,
    task.startDate ? `Start: ${toDateOnly(task.startDate)}` : null,
    task.dueDate ? `Due: ${toDateOnly(task.dueDate)}` : null,
    `Progress: ${getTaskProgressPercent(task)}%`,
  ].filter(Boolean);
  return lines.join('\n');
}

export function tasksInMonth(tasks, year, monthIndex) {
  const monthStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const monthEnd = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return (tasks || []).filter((t) => {
    if (!isWorkTask(t)) return false;
    const start = toDateOnly(t.startDate);
    const due = toDateOnly(t.dueDate);
    const anchor = due || start;
    if (!anchor) return false;
    if (start && due) return start <= monthEnd && due >= monthStart;
    return anchor >= monthStart && anchor <= monthEnd;
  });
}

export function scheduledTasks(tasks) {
  return (tasks || []).filter(
    (t) => isWorkTask(t) && (toDateOnly(t.startDate) || toDateOnly(t.dueDate))
  );
}

export function formatPriorityShort(priority) {
  const raw = String(priority || '').trim();
  if (!raw) return '—';
  const upper = raw.toUpperCase();
  const tier = { P0: 'High', P1: 'Medium', P2: 'Low', P3: 'Low', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  if (/^P[0-3]$/.test(upper)) return `${upper} - ${tier[upper] || raw}`;
  return raw;
}
