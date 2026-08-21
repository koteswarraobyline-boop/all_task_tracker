const { todayStart } = require('../utils/dateUtils');

const DELIVERY_STATUS_LABELS = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  DUE_SOON: 'Due Soon',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
};

function toClientProject(project, analysis = {}, clientMeta = {}) {
  const now = todayStart();
  const deliveryStatus = analysis.deliveryStatus || 'ON_TRACK';

  return {
    id: project.id,
    name: project.name,
    clientName: project.clientName || null,
    originalDeliveryDate: analysis.originalDeliveryDate || project.originalDeliveryDate || null,
    revisedDeliveryDate: analysis.revisedDeliveryDate || project.revisedDeliveryDate || null,
    targetDeliveryDate: analysis.targetDeliveryDate || project.targetDeliveryDate || null,
    activeDeliveryDate: analysis.activeDeliveryDate || analysis.deliveryDate || null,
    effectiveDueDate: analysis.activeDeliveryDate || analysis.deliveryDate || null,
    deliveryNotes: project.deliveryNotes || null,
    deliveryStatus,
    deliveryStatusLabel: DELIVERY_STATUS_LABELS[deliveryStatus] || deliveryStatus,
    daysBehindSchedule: analysis.daysOverdue || 0,
    daysRemaining: analysis.daysRemaining ?? null,
    completionPercent: analysis.completionPercent ?? 0,
    isBehindSchedule: deliveryStatus === 'OVERDUE' || (analysis.projectedDelayDays || 0) > 0,
    projectedDelayDays: analysis.projectedDelayDays ?? null,
    estimatedCompletion: analysis.estimatedCompletion ?? null,
    clientSummary: buildClientSummary(analysis),
    clientMeta: clientMeta
      ? {
          clientName: clientMeta.clientName,
          company: clientMeta.company,
        }
      : undefined,
  };
}

function buildClientSummary(analysis) {
  if (analysis.deliveryStatus === 'COMPLETED') {
    return 'All planned work has been completed.';
  }
  if (analysis.deliveryStatus === 'OVERDUE') {
    return `Current progress indicates the project is behind schedule by ${analysis.daysOverdue || 0} day(s).`;
  }
  if (analysis.deliveryStatus === 'AT_RISK') {
    return 'The project is progressing, but some remaining work may miss the target delivery date.';
  }
  if (analysis.deliveryStatus === 'DUE_SOON') {
    return 'The target delivery date is approaching.';
  }
  return 'The project is progressing toward the target delivery date.';
}

function toClientDelayAnalysis(analysis) {
  const primary = analysis.primaryDelayDriver;
  const major = analysis.majorContributors || [];

  return {
    deliveryStatus: analysis.deliveryStatus,
    deliveryStatusLabel: DELIVERY_STATUS_LABELS[analysis.deliveryStatus] || analysis.deliveryStatus,
    daysBehindSchedule: analysis.daysOverdue || 0,
    daysRemaining: analysis.daysRemaining ?? null,
    completionPercent: analysis.completionPercent ?? 0,
    targetDeliveryDate: analysis.deliveryDate || analysis.activeDeliveryDate || null,
    estimatedCompletion: analysis.estimatedCompletion || null,
    projectedDelayDays: analysis.projectedDelayDays ?? null,
    projectionAvailable: analysis.projectionAvailable ?? false,
    summary: buildClientSummary(analysis),
    primaryDelayedWork: primary
      ? {
          taskName: primary.taskName,
          phase: primary.phase,
          module: primary.module,
          status: primary.status,
          progress: primary.progress,
          daysBehindSchedule: primary.overdueDays,
          explanation: clientTaskExplanation(primary),
        }
      : null,
    otherDelayedWork: major.map((t) => ({
      taskName: t.taskName,
      phase: t.phase,
      module: t.module,
      progress: t.progress,
      daysBehindSchedule: t.overdueDays,
    })),
    taskCounts: {
      completed: analysis.completed ?? null,
      remaining: analysis.remainingTaskCount ?? null,
      overdue: analysis.lateTaskCount ?? 0,
      inProgress: null,
    },
  };
}

function clientTaskExplanation(task) {
  const parts = [];
  if (task.overdueDays > 0) parts.push(`${task.overdueDays} day(s) behind schedule`);
  parts.push(`${task.progress}% complete`);
  if (task.module) {
    return `${task.module}${task.taskName ? ` — ${task.taskName}` : ''}. ${parts.join(' · ')}.`;
  }
  return `${task.taskName}. ${parts.join(' · ')}.`;
}

module.exports = {
  toClientProject,
  toClientDelayAnalysis,
  DELIVERY_STATUS_LABELS,
};
