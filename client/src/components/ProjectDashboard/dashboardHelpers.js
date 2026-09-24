import {
  isWorkTask,
  isOverdue,
  getOverdueDays,
  shouldShowOverdueAlert,
  startOfDay,
  toDateOnly,
  buildStatusChartData,
  buildPriorityChartData,
} from '../../utils/taskManagementConstants';

export function formatProjectId(id) {
  return `PRJ-${String(id).padStart(3, '0')}`;
}

export function pctOf(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function formatShortDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function timeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function relativeDeadlineLabel(dueDate, today = startOfDay()) {
  const due = toDateOnly(dueDate);
  if (!due) return 'No date';
  const dueDay = new Date(`${due}T00:00:00`);
  const diff = Math.round((dueDay - today) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d late`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return `In ${diff}d`;
  if (diff <= 14) return 'Next week';
  return formatShortDate(dueDate);
}

export function deadlinePillSx(dueDate, today = startOfDay()) {
  const due = toDateOnly(dueDate);
  if (!due) return { bgcolor: '#F1F5F9', color: '#64748B' };
  const dueDay = new Date(`${due}T00:00:00`);
  const diff = Math.round((dueDay - today) / 86400000);
  if (diff < 0) return { bgcolor: '#FEE2E2', color: '#B91C1C' };
  if (diff === 0) return { bgcolor: '#FEF3C7', color: '#B45309' };
  if (diff <= 3) return { bgcolor: '#FFEDD5', color: '#C2410C' };
  return { bgcolor: '#EFF6FF', color: '#2563EB' };
}

export function computeScheduleBuckets(tasks, today = startOfDay()) {
  const buckets = { ahead: 0, onSchedule: 0, atRisk: 0, overdue: 0 };
  (tasks || []).filter(isWorkTask).forEach((task) => {
    if (task.status === 'Completed') {
      buckets.ahead += 1;
      return;
    }
    if (isOverdue(task, today)) {
      buckets.overdue += 1;
      return;
    }
    const due = toDateOnly(task.dueDate);
    if (!due) {
      buckets.onSchedule += 1;
      return;
    }
    const dueDay = new Date(`${due}T00:00:00`);
    const daysUntil = Math.ceil((dueDay - today) / 86400000);
    if (daysUntil <= 7) buckets.atRisk += 1;
    else buckets.onSchedule += 1;
  });
  return buckets;
}

export function computeKpiMetrics(tasks) {
  const list = (tasks || []).filter(isWorkTask);
  const total = list.length;
  const completed = list.filter((t) => t.status === 'Completed').length;
  const inDevelopment = list.filter((t) => t.status === 'In Development').length;
  const testing = list.filter((t) => t.status === 'Testing' || t.status === 'Code Review').length;
  const onHold = list.filter((t) => t.status === 'On Hold').length;
  const blocked = list.filter((t) => t.status === 'Blocked').length;
  return { total, completed, inDevelopment, testing, onHold, blocked };
}

export function buildProgressTimelinePercent(rawTimeline, taskTotal) {
  const timeline = rawTimeline || [];
  if (!timeline.length) return [];
  const baselineTotal = taskTotal || timeline[timeline.length - 1]?.totalTasks || 1;
  return timeline.slice(-21).map((row) => {
    const actualPct = baselineTotal
      ? Math.round(((row.completedTasks || 0) / baselineTotal) * 100)
      : 0;
    const plannedPct = baselineTotal
      ? Math.round(((row.totalTasks || 0) / baselineTotal) * 100)
      : 0;
    return {
      ...row,
      label: String(row.date || '').slice(5),
      actualPct,
      plannedPct,
    };
  });
}

export function buildPriorityDonutData(tasks) {
  const DONUT_COLORS = {
    Critical: '#DC2626',
    High: '#EA580C',
    Medium: '#CA8A04',
    Low: '#16A34A',
    Other: '#64748B',
  };
  return buildPriorityChartData(tasks).map((row) => ({
    ...row,
    color: DONUT_COLORS[row.name] || DONUT_COLORS.Other,
  }));
}

export function buildStatusDonutData(tasks) {
  return buildStatusChartData(tasks);
}

export { exportTasksCsv } from '../../utils/projectExport';

export function computeHealthScore(completionPercent, scheduleBuckets, deliveryStatus) {
  const completion = Number(completionPercent) || 0;
  let score = completion;
  score -= (scheduleBuckets?.overdue || 0) * 1.5;
  score -= (scheduleBuckets?.atRisk || 0) * 0.75;
  if (deliveryStatus === 'OVERDUE') score -= 12;
  else if (deliveryStatus === 'AT_RISK') score -= 6;
  else if (deliveryStatus === 'DUE_SOON') score -= 3;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function deliveryStatusMessage(status) {
  switch (status) {
    case 'COMPLETED':
      return 'All work is complete. Great job finishing this project!';
    case 'OVERDUE':
      return 'Project is past the active delivery date. Review overdue tasks and delay drivers.';
    case 'AT_RISK':
      return 'Some tasks need attention before the delivery date.';
    case 'DUE_SOON':
      return 'Delivery date is approaching. Keep momentum on remaining work.';
    default:
      return 'Good progress! The project is on schedule.';
  }
}

export { isOverdue, getOverdueDays, isWorkTask, shouldShowOverdueAlert };
