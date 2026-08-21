const { todayStart, daysOverdue, daysUntilDue } = require('../utils/dateUtils');
const { getTaskProgressPercent, isTaskComplete } = require('./taskProgressService');
const { resolveDeliveryDates, getDeliveryTiming } = require('./deliveryDateService');

const DUE_SOON_DAYS = 7;

/**
 * Task-level schedule health for admin views.
 */
function getTaskScheduleHealth(task, now = todayStart()) {
  if (isTaskComplete(task)) {
    return { scheduleStatus: 'ON_TIME', daysLate: 0, isOverdue: false, isAtRisk: false };
  }

  const dueDate = task.dueDate;
  if (!dueDate) {
    const blocked = task.status === 'Blocked' || task.status === 'On Hold';
    return {
      scheduleStatus: blocked ? 'AT_RISK' : 'ON_TIME',
      daysLate: 0,
      isOverdue: false,
      isAtRisk: blocked,
    };
  }

  const late = daysOverdue(dueDate, now);
  const until = daysUntilDue(dueDate, now);
  const progress = getTaskProgressPercent(task);
  const remaining = Math.max(0, 100 - progress) / 100;

  if (late > 0) {
    return { scheduleStatus: 'OVERDUE', daysLate: late, isOverdue: true, isAtRisk: true };
  }

  if (until !== null && until <= 3 && remaining > 0.4) {
    return { scheduleStatus: 'AT_RISK', daysLate: 0, isOverdue: false, isAtRisk: true };
  }

  if (task.status === 'Blocked' || task.status === 'On Hold') {
    return { scheduleStatus: 'AT_RISK', daysLate: 0, isOverdue: false, isAtRisk: true };
  }

  return { scheduleStatus: 'ON_TIME', daysLate: 0, isOverdue: false, isAtRisk: false };
}

function aggregateTaskStats(allRows = []) {
  const modules = allRows.filter((t) => t.recordType === 'module');
  const tasks = allRows.filter((t) => t.recordType !== 'module');
  const totalTasks = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inDevelopment = tasks.filter((t) => t.status === 'In Development').length;
  const blocked = tasks.filter((t) => t.status === 'Blocked').length;
  const upcoming = tasks.filter((t) => t.status === 'Upcoming').length;
  const onHold = tasks.filter((t) => t.status === 'On Hold').length;
  const pending = tasks.filter((t) =>
    ['Assigned', 'Testing'].includes(t.status) || t.status === 'Code Review'
  ).length;

  const progress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
  const isComplete = totalTasks > 0 && completed === totalTasks;

  return {
    modules,
    tasks,
    totalTasks,
    completed,
    remaining: Math.max(0, totalTasks - completed),
    inDevelopment,
    pending,
    blocked,
    upcoming,
    onHold,
    progress,
    isComplete,
  };
}

/**
 * Delivery status shown in UI: ON_TRACK | AT_RISK | DUE_SOON | OVERDUE | COMPLETED
 */
function computeDeliveryStatus({
  isComplete,
  deliveryTiming,
  lateTaskCount = 0,
  blockedTaskCount = 0,
  onHoldTaskCount = 0,
  atRiskTaskCount = 0,
}) {
  if (isComplete) return 'COMPLETED';
  if (deliveryTiming.isOverdue) return 'OVERDUE';
  if (deliveryTiming.isDueSoon) return 'DUE_SOON';

  const hasRiskSignals =
    lateTaskCount > 0 ||
    blockedTaskCount > 0 ||
    onHoldTaskCount > 0 ||
    atRiskTaskCount > 0;

  if (hasRiskSignals) return 'AT_RISK';
  return 'ON_TRACK';
}

/**
 * Coarse health label: HEALTHY | AT_RISK | OVERDUE | COMPLETED
 */
function computeProjectHealth(deliveryStatus) {
  switch (deliveryStatus) {
    case 'COMPLETED':
      return 'COMPLETED';
    case 'OVERDUE':
      return 'OVERDUE';
    case 'AT_RISK':
    case 'DUE_SOON':
      return 'AT_RISK';
    default:
      return 'HEALTHY';
  }
}

function computeProjectWorkflowStatus(stats) {
  const { totalTasks, completed, blocked, onHold, inDevelopment } = stats;
  if (totalTasks > 0 && completed === totalTasks) return 'Completed';
  if (blocked > 0) return 'Delayed';
  if (onHold > 0 && inDevelopment === 0) return 'On Hold';
  return 'Active';
}

function buildDeliveryHealthSummary(project, allRows, now = todayStart()) {
  const stats = aggregateTaskStats(allRows);
  const dueDates = stats.tasks.map((t) => t.dueDate).filter(Boolean).sort();
  const dates = resolveDeliveryDates(project, dueDates);
  const timing = getDeliveryTiming(dates.activeDeliveryDate, stats.isComplete, now);

  let lateTaskCount = 0;
  let blockedTaskCount = stats.blocked;
  let onHoldTaskCount = stats.onHold;
  let atRiskTaskCount = 0;

  stats.tasks.forEach((task) => {
    const health = getTaskScheduleHealth(task, now);
    if (health.isOverdue) lateTaskCount += 1;
    if (health.isAtRisk && !health.isOverdue) atRiskTaskCount += 1;
  });

  const deliveryStatus = computeDeliveryStatus({
    isComplete: stats.isComplete,
    deliveryTiming: timing,
    lateTaskCount,
    blockedTaskCount,
    onHoldTaskCount,
    atRiskTaskCount,
  });

  return {
    ...stats,
    ...dates,
    ...timing,
    deliveryStatus,
    projectHealth: computeProjectHealth(deliveryStatus),
    workflowStatus: computeProjectWorkflowStatus(stats),
    lateTaskCount,
    blockedTaskCount,
    onHoldTaskCount,
    atRiskTaskCount,
    completionPercent: stats.progress,
    deliveryDate: dates.activeDeliveryDate,
    dueSoonThresholdDays: DUE_SOON_DAYS,
  };
}

module.exports = {
  DUE_SOON_DAYS,
  getTaskScheduleHealth,
  aggregateTaskStats,
  computeDeliveryStatus,
  computeProjectHealth,
  computeProjectWorkflowStatus,
  buildDeliveryHealthSummary,
};
