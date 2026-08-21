const { analyzeProjectDelay } = require('./projectDelayAnalysisService');
const {
  buildDeliveryHealthSummary,
  aggregateTaskStats,
  computeProjectWorkflowStatus,
} = require('./projectHealthService');
const { todayStart } = require('../utils/dateUtils');

const priorityRank = (p) => {
  const v = String(p || '').toLowerCase();
  if (['high', 'p0', 'p1', 'critical', 'urgent'].includes(v)) return 3;
  if (['medium', 'p2', 'normal'].includes(v)) return 2;
  if (['low', 'p3'].includes(v)) return 1;
  return 0;
};

/**
 * Build enriched admin project payload (list + detail fields).
 */
function enrichProjectRecord(proj, now = todayStart()) {
  const allRows = proj.tasks || [];
  const stats = aggregateTaskStats(allRows);
  const { tasks, modules } = stats;

  let lastUpdated = proj.updatedAt;
  if (tasks.length > 0) {
    const dates = tasks.map((t) => new Date(t.updatedAt).getTime());
    lastUpdated = new Date(Math.max(...dates));
  }

  const startDates = tasks.map((t) => t.startDate).filter(Boolean).sort();
  const dueDates = tasks.map((t) => t.dueDate).filter(Boolean).sort();
  const startDate = startDates[0] || (proj.createdAt ? String(proj.createdAt).slice(0, 10) : null);

  const memberMap = {};
  const assignCount = {};
  tasks.forEach((t) => {
    if (t.developer && t.developer.id) {
      memberMap[t.developer.id] = {
        id: t.developer.id,
        name: t.developer.name,
        color: t.developer.color,
      };
      assignCount[t.developer.id] = (assignCount[t.developer.id] || 0) + 1;
    }
  });
  const members = Object.values(memberMap);
  const topDevId = Object.keys(assignCount).sort((a, b) => assignCount[b] - assignCount[a])[0];
  const manager = topDevId ? memberMap[topDevId] : null;

  const status = computeProjectWorkflowStatus(stats);

  const daysSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 86400000)
    : 0;
  const archived = status === 'Completed' && daysSinceUpdate >= 60;

  let bestPriority = null;
  let bestRank = -1;
  tasks.forEach((t) => {
    if (t.status === 'Completed') return;
    const r = priorityRank(t.priority);
    if (r > bestRank) {
      bestRank = r;
      bestPriority = t.priority;
    }
  });
  if (!bestPriority) {
    const any = tasks.find((t) => t.priority);
    bestPriority = any?.priority || 'Medium';
  }

  const estimatedHours = tasks.reduce((s, t) => s + (Number(t.estimatedHours) || 0), 0);
  const actualHours = tasks.reduce((s, t) => s + (Number(t.actualHours) || 0), 0);

  const moduleSet = new Set();
  [...tasks, ...modules].forEach((t) => {
    if (t.module) moduleSet.add(String(t.module).trim());
  });

  const tagSet = new Set();
  tasks.forEach((t) => {
    if (!t.tags) return;
    String(t.tags)
      .split(/[,|]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((tag) => tagSet.add(tag));
  });
  const tags = Array.from(tagSet).slice(0, 8);

  const description =
    tasks.find((t) => t.description)?.description ||
    modules.find((t) => t.description)?.description ||
    null;

  const health = buildDeliveryHealthSummary(proj, allRows, now);
  const delayAnalysis = analyzeProjectDelay(proj, allRows, now);

  return {
    id: proj.id,
    name: proj.name,
    clientName: proj.clientName,
    description: description ? String(description).slice(0, 160) : null,
    totalTasks: stats.totalTasks,
    completed: stats.completed,
    remaining: stats.remaining,
    inDevelopment: stats.inDevelopment,
    pending: stats.pending,
    blocked: stats.blocked,
    upcoming: stats.upcoming,
    onHold: stats.onHold,
    moduleCount: moduleSet.size || modules.length,
    estimatedHours: Math.round(estimatedHours * 10) / 10,
    actualHours: Math.round(actualHours * 10) / 10,
    priority: bestPriority,
    tags,
    manager,
    lastUpdated,
    createdAt: proj.createdAt,
    startDate,
    dueDate: health.activeDeliveryDate,
    originalDeliveryDate: health.originalDeliveryDate,
    revisedDeliveryDate: health.revisedDeliveryDate,
    targetDeliveryDate: health.targetDeliveryDate,
    activeDeliveryDate: health.activeDeliveryDate,
    effectiveDueDate: health.activeDeliveryDate,
    deliveryNotes: proj.deliveryNotes || null,
    projectOverdueDays: health.daysOverdue,
    isProjectOverdue: health.isOverdue,
    isProjectExtended: health.isProjectExtended,
    daysRemaining: health.daysRemaining,
    deliveryStatus: health.deliveryStatus,
    projectHealth: health.projectHealth,
    completionPercent: health.completionPercent,
    lateTaskCount: health.lateTaskCount,
    blockedTaskCount: health.blockedTaskCount,
    onHoldTaskCount: health.onHoldTaskCount,
    atRiskTaskCount: health.atRiskTaskCount,
    primaryDelayDriver: delayAnalysis.primaryDelayDriver
      ? {
          id: delayAnalysis.primaryDelayDriver.id,
          taskId: delayAnalysis.primaryDelayDriver.taskId,
          taskName: delayAnalysis.primaryDelayDriver.taskName,
          overdueDays: delayAnalysis.primaryDelayDriver.overdueDays,
          progress: delayAnalysis.primaryDelayDriver.progress,
          delayImpactScore: delayAnalysis.primaryDelayDriver.delayImpactScore,
        }
      : null,
    primaryDelayTaskId: delayAnalysis.primaryDelayTaskId,
    delaySeverity: delayAnalysis.delaySeverity,
    projectedDelayDays: delayAnalysis.projectedDelayDays,
    estimatedCompletion: delayAnalysis.estimatedCompletion,
    members,
    status,
    archived,
    progress: health.completionPercent,
    /** Full analysis available via GET /projects/:id/delay-analysis */
    delaySummary: delayAnalysis.summary,
  };
}

module.exports = {
  enrichProjectRecord,
  analyzeProjectDelay,
};
