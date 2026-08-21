/**
 * Project Delay / Overdue Root-Cause Intelligence
 *
 * Delay Impact Score (transparent weights):
 *   overdue severity      × 3.0  (days overdue)
 *   remaining work        × 2.0  ((100 - progress) / 100 × 50)
 *   blocked/on-hold       + 15   (fixed penalty)
 *   dependency downstream × 8.0  (per dependent task referencing this taskId)
 *   remaining hours       × 0.5  (capped at 40h)
 *   incomplete module     + 4.0  (when module has other incomplete tasks)
 *
 * Critical-path analysis is NOT claimed when dependency data is sparse —
 * results are labeled "Likely primary delay".
 */

const {
  todayStart,
  daysOverdue,
  daysUntilDue,
  formatDateOnly,
  parseDateOnly,
  diffCalendarDays,
} = require('../utils/dateUtils');
const { getTaskProgressPercent, isTaskComplete } = require('./taskProgressService');
const { buildDeliveryHealthSummary, getTaskScheduleHealth } = require('./projectHealthService');

const WEIGHTS = {
  overdueDays: 3.0,
  remainingWork: 2.0,
  blockedHoldPenalty: 15,
  dependencyImpact: 8.0,
  remainingHours: 0.5,
  moduleLateBonus: 4.0,
  deadlineProximity: 5.0,
};

function workTasks(allRows) {
  return (allRows || []).filter((t) => t.recordType !== 'module');
}

function countDownstreamTasks(task, allTasks) {
  const id = String(task.taskId || '');
  if (!id) return 0;
  return allTasks.filter((t) => {
    if (t.id === task.id || isTaskComplete(t)) return false;
    const deps = String(t.dependencies || '');
    if (!deps) return false;
    return deps.split(/[,;|]/).map((d) => d.trim()).includes(id);
  }).length;
}

function getRemainingHours(task) {
  const est = Number(task.estimatedHours);
  const act = Number(task.actualHours);
  if (Number.isFinite(est) && est > 0) {
    if (Number.isFinite(act) && act >= 0) return Math.max(0, est - act);
    const progress = getTaskProgressPercent(task);
    return Math.max(0, est * (1 - progress / 100));
  }
  return null;
}

function scoreTaskDelayImpact(task, context) {
  const { allTasks, activeDeliveryDate, now } = context;
  const progress = getTaskProgressPercent(task);
  const remainingWorkRatio = Math.max(0, 100 - progress) / 100;
  const overdueDays = isTaskComplete(task) ? 0 : daysOverdue(task.dueDate, now);
  const schedule = getTaskScheduleHealth(task, now);

  let score = 0;
  const factors = [];

  if (overdueDays > 0) {
    const pts = overdueDays * WEIGHTS.overdueDays;
    score += pts;
    factors.push(`${overdueDays} day(s) overdue`);
  }

  if (remainingWorkRatio > 0 && task.status !== 'Completed') {
    const pts = remainingWorkRatio * 50 * WEIGHTS.remainingWork;
    score += pts;
    if (remainingWorkRatio >= 0.5) factors.push('significant remaining work');
  }

  if (task.status === 'Blocked' || task.status === 'On Hold') {
    score += WEIGHTS.blockedHoldPenalty;
    factors.push(task.status === 'Blocked' ? 'blocked' : 'on hold');
  }

  const downstream = countDownstreamTasks(task, allTasks);
  if (downstream > 0) {
    score += downstream * WEIGHTS.dependencyImpact;
    factors.push(`${downstream} dependent task(s) waiting`);
  }

  const remainingHours = getRemainingHours(task);
  if (remainingHours !== null && remainingHours > 0) {
    score += Math.min(remainingHours, 40) * WEIGHTS.remainingHours;
    if (remainingHours >= 8) factors.push(`${Math.round(remainingHours)}h remaining`);
  }

  if (task.module && context.lateModules?.has(String(task.module))) {
    score += WEIGHTS.moduleLateBonus;
    factors.push('part of a delayed module');
  }

  if (activeDeliveryDate && task.dueDate && !isTaskComplete(task)) {
    const untilProject = daysUntilDue(activeDeliveryDate, now);
    const untilTask = daysUntilDue(task.dueDate, now);
    if (untilProject !== null && untilTask !== null && untilTask > untilProject) {
      score += WEIGHTS.deadlineProximity;
      factors.push('due after project delivery date');
    }
  }

  return {
    delayImpactScore: Math.round(score * 10) / 10,
    overdueDays,
    progress,
    remainingHours,
    downstreamCount: downstream,
    scheduleStatus: schedule.scheduleStatus,
    factors,
  };
}

function buildTaskExplanation(task, scoring, labelPrefix = 'Likely primary delay') {
  const parts = [];
  if (scoring.overdueDays > 0) parts.push(`${scoring.overdueDays} day(s) overdue`);
  parts.push(`${scoring.progress}% complete`);
  if (task.status) parts.push(task.status);
  if (scoring.factors.length) {
    return `${labelPrefix}: ${task.taskName} — ${parts.join(' · ')}. Contributing factors: ${scoring.factors.join('; ')}.`;
  }
  return `${labelPrefix}: ${task.taskName} — ${parts.join(' · ')}.`;
}

function estimateCompletionDate(tasks, now = todayStart()) {
  const open = workTasks(tasks).filter((t) => !isTaskComplete(t));
  if (!open.length) return { estimatedCompletionDate: null, projectedDelayDays: null, hasProjection: false };

  let totalRemainingHours = 0;
  let tasksWithData = 0;

  open.forEach((task) => {
    const hours = getRemainingHours(task);
    if (hours !== null && hours > 0) {
      totalRemainingHours += hours;
      tasksWithData += 1;
    }
  });

  if (tasksWithData === 0) {
    const latestDue = open
      .map((t) => t.dueDate)
      .filter(Boolean)
      .sort()
      .pop();
    if (!latestDue) return { estimatedCompletionDate: null, projectedDelayDays: null, hasProjection: false };
    return {
      estimatedCompletionDate: latestDue,
      projectedDelayDays: null,
      hasProjection: true,
      projectionMethod: 'latest_open_task_due_date',
    };
  }

  const HOURS_PER_DAY = 6;
  const daysNeeded = Math.ceil(totalRemainingHours / HOURS_PER_DAY);
  const est = new Date(now);
  est.setDate(est.getDate() + daysNeeded);

  return {
    estimatedCompletionDate: formatDateOnly(est),
    projectedDelayDays: null,
    hasProjection: true,
    projectionMethod: 'remaining_hours_velocity',
    remainingHoursTotal: Math.round(totalRemainingHours * 10) / 10,
  };
}

function buildRecommendations(analysis) {
  const recs = [];
  const primary = analysis.primaryDelayDriver;
  if (primary) {
    recs.push(`Prioritize ${primary.taskName} because it has the highest delay impact.`);
  }
  if (analysis.blockedTaskCount > 0) {
    recs.push(`Review the ${analysis.blockedTaskCount} blocked task${analysis.blockedTaskCount > 1 ? 's' : ''}.`);
  }
  if (analysis.onHoldTaskCount > 0) {
    recs.push(`Follow up on ${analysis.onHoldTaskCount} on-hold item${analysis.onHoldTaskCount > 1 ? 's' : ''}.`);
  }
  if (analysis.majorContributors?.length) {
    const mod = analysis.majorContributors[0]?.module;
    if (mod) recs.push(`Re-plan the ${mod} module where multiple items are late.`);
  }
  if (
    analysis.projectedDelayDays > 0 &&
    analysis.deliveryStatus !== 'COMPLETED'
  ) {
    recs.push(
      'Consider revising the delivery date if remaining work cannot fit into the available schedule.'
    );
  }
  if (!recs.length && analysis.deliveryStatus === 'AT_RISK') {
    recs.push('Address overdue and at-risk tasks before the delivery date passes.');
  }
  return recs;
}

/**
 * Full delay analysis for admin API.
 */
function analyzeProjectDelay(project, allRows, now = todayStart()) {
  const health = buildDeliveryHealthSummary(project, allRows, now);
  const allTasks = workTasks(allRows);
  const openTasks = allTasks.filter((t) => !isTaskComplete(t));

  const lateModules = new Set();
  allTasks.forEach((t) => {
    if (t.module && getTaskScheduleHealth(t, now).isOverdue) {
      lateModules.add(String(t.module));
    }
  });

  const context = {
    allTasks,
    activeDeliveryDate: health.activeDeliveryDate,
    now,
    lateModules,
  };

  const scored = openTasks
    .map((task) => {
      const scoring = scoreTaskDelayImpact(task, context);
      if (scoring.delayImpactScore <= 0 && scoring.overdueDays <= 0) return null;
      return {
        id: task.id,
        taskId: task.taskId,
        taskName: task.taskName,
        phase: task.phase || null,
        module: task.module || null,
        status: task.status,
        progress: scoring.progress,
        startDate: task.startDate || null,
        dueDate: task.dueDate || null,
        overdueDays: scoring.overdueDays,
        remainingHours: scoring.remainingHours,
        delayImpactScore: scoring.delayImpactScore,
        scheduleStatus: scoring.scheduleStatus,
        downstreamCount: scoring.downstreamCount,
        explanation: buildTaskExplanation(task, scoring, 'Likely primary delay'),
        factors: scoring.factors,
        isLikelyPrimary: true,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.delayImpactScore - a.delayImpactScore);

  const primaryDelayDriver = scored[0] || null;
  const majorContributors = scored.slice(1, 5);
  const otherLateWork = scored.slice(5);

  const projection = estimateCompletionDate(allRows, now);

  if (projection.hasProjection && health.activeDeliveryDate && projection.estimatedCompletionDate) {
    const estDate = parseDateOnly(projection.estimatedCompletionDate);
    const targetDate = parseDateOnly(health.activeDeliveryDate);
    if (estDate && targetDate) {
      const slip = diffCalendarDays(targetDate, estDate);
      if (slip > 0) {
        projection.projectedDelayDays = slip;
      }
    }
  }

  const riskFactors = [];
  if (health.lateTaskCount > 0) riskFactors.push(`${health.lateTaskCount} late task(s)`);
  if (health.blockedTaskCount > 0) riskFactors.push(`${health.blockedTaskCount} blocked`);
  if (health.onHoldTaskCount > 0) riskFactors.push(`${health.onHoldTaskCount} on hold`);
  if (health.atRiskTaskCount > 0) riskFactors.push(`${health.atRiskTaskCount} at-risk task(s)`);
  if (health.remaining > 0) riskFactors.push(`${health.remaining} tasks remaining`);

  let summary = '';
  if (health.deliveryStatus === 'COMPLETED') {
    summary = 'All required work is completed.';
  } else if (health.deliveryStatus === 'OVERDUE') {
    summary = `Project is ${health.daysOverdue} day(s) overdue with ${health.completionPercent}% complete.`;
    if (primaryDelayDriver) {
      summary += ` Primary delay driver: ${primaryDelayDriver.taskName}.`;
    }
  } else if (health.deliveryStatus === 'AT_RISK') {
    summary = `Project schedule is at risk with ${health.lateTaskCount} late task(s) and ${health.completionPercent}% complete.`;
    if (primaryDelayDriver) {
      summary += ` Main risk: ${primaryDelayDriver.taskName}.`;
    }
  } else if (health.deliveryStatus === 'DUE_SOON') {
    summary = `Delivery date is approaching (${health.daysRemaining} day(s) remaining).`;
  } else {
    summary = 'Project is on track for the current delivery date.';
  }

  const analysis = {
    projectStatus: health.deliveryStatus,
    deliveryStatus: health.deliveryStatus,
    projectHealth: health.projectHealth,
    daysOverdue: health.daysOverdue,
    daysRemaining: health.daysRemaining,
    deliveryDate: health.deliveryDate,
    activeDeliveryDate: health.activeDeliveryDate,
    originalDeliveryDate: health.originalDeliveryDate,
    revisedDeliveryDate: health.revisedDeliveryDate,
    targetDeliveryDate: health.targetDeliveryDate,
    completionPercent: health.completionPercent,
    remainingTaskCount: health.remaining,
    completed: health.completed,
    lateTaskCount: health.lateTaskCount,
    blockedTaskCount: health.blockedTaskCount,
    onHoldTaskCount: health.onHoldTaskCount,
    atRiskTaskCount: health.atRiskTaskCount,
    primaryDelayDriver,
    majorContributors,
    otherLateWork,
    contributingTasks: scored,
    riskFactors,
    summary,
    recommendations: [],
    estimatedCompletion: projection.hasProjection ? projection.estimatedCompletionDate : null,
    projectedDelayDays:
      projection.projectedDelayDays ?? (health.isOverdue ? health.daysOverdue : null),
    projectionAvailable: projection.hasProjection,
    projectionLabel: projection.hasProjection ? 'Estimated completion' : 'Projection unavailable',
    delaySeverity: primaryDelayDriver?.delayImpactScore || health.daysOverdue || 0,
    primaryDelayTaskId: primaryDelayDriver?.id || null,
    isProjectExtended: health.isProjectExtended,
  };

  analysis.recommendations = buildRecommendations(analysis);
  return analysis;
}

module.exports = {
  WEIGHTS,
  analyzeProjectDelay,
  scoreTaskDelayImpact,
  estimateCompletionDate,
  buildRecommendations,
};
