const { enrichProjectRecord } = require('./projectEnrichmentService');
const { todayStart, daysOverdue, daysUntilDue } = require('../utils/dateUtils');

function normalizeTaskStatus(status) {
  if (status === 'Code Review') return 'Testing';
  return status;
}

function categorizeProjectForHealth(proj) {
  const delivery = proj.deliveryStatus || 'ON_TRACK';
  const workflow = proj.status || 'Active';

  if (delivery === 'COMPLETED' || workflow === 'Completed') {
    return 'completed';
  }
  if (delivery === 'OVERDUE' || proj.isProjectOverdue) {
    return 'overdue';
  }
  if (delivery === 'AT_RISK' || delivery === 'DUE_SOON') {
    return 'atRisk';
  }
  if (workflow === 'Active' && delivery === 'ON_TRACK') {
    return 'onTrack';
  }
  if (workflow === 'Active') {
    return 'inProgress';
  }
  return 'onTrack';
}

function buildTrend(current, previous) {
  if (previous == null || previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return { text: 'Same as last month', tone: 'neutral' };
  const sign = delta > 0 ? '+' : '';
  const tone = delta > 0 ? 'up' : 'down';
  return { text: `${sign}${delta} from last month`, tone };
}

function countProjectsCreatedBefore(projects, beforeDate) {
  return projects.filter((p) => {
    const created = p.createdAt ? new Date(p.createdAt) : null;
    return created && created < beforeDate;
  }).length;
}

function snapshotAtMonthStart(projects, enriched, now) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentCounts = {
    total: enriched.length,
    completed: enriched.filter((p) => categorizeProjectForHealth(p) === 'completed').length,
    inProgress: enriched.filter((p) => p.status === 'Active' && categorizeProjectForHealth(p) !== 'completed').length,
    atRisk: enriched.filter((p) => categorizeProjectForHealth(p) === 'atRisk').length,
    overdue: enriched.filter((p) => categorizeProjectForHealth(p) === 'overdue').length,
  };

  const projectsBeforeMonth = enriched.filter((p) => {
    const created = p.createdAt ? new Date(p.createdAt) : null;
    return created && created < monthStart;
  });

  const prevSnapshot = {
    total: projectsBeforeMonth.length,
    completed: projectsBeforeMonth.filter((p) => categorizeProjectForHealth(p) === 'completed').length,
    inProgress: projectsBeforeMonth.filter((p) => p.status === 'Active' && categorizeProjectForHealth(p) !== 'completed').length,
    atRisk: projectsBeforeMonth.filter((p) => categorizeProjectForHealth(p) === 'atRisk').length,
    overdue: projectsBeforeMonth.filter((p) => categorizeProjectForHealth(p) === 'overdue').length,
  };

  void prevMonthStart;
  void countProjectsCreatedBefore;

  return {
    total: buildTrend(currentCounts.total, prevSnapshot.total),
    completed: buildTrend(currentCounts.completed, prevSnapshot.completed),
    inProgress: buildTrend(currentCounts.inProgress, prevSnapshot.inProgress),
    atRisk: buildTrend(currentCounts.atRisk, prevSnapshot.atRisk),
    overdue: buildTrend(currentCounts.overdue, prevSnapshot.overdue),
  };
}

function buildDeliveryHealthChart(enriched) {
  const buckets = {
    onTrack: 0,
    atRisk: 0,
    overdue: 0,
    inProgress: 0,
    completed: 0,
  };

  enriched.forEach((p) => {
    const cat = categorizeProjectForHealth(p);
    buckets[cat] += 1;
  });

  const total = enriched.length;
  const segments = [
    { key: 'onTrack', label: 'On Track', color: '#22C55E', count: buckets.onTrack },
    { key: 'atRisk', label: 'At Risk', color: '#F59E0B', count: buckets.atRisk },
    { key: 'overdue', label: 'Overdue', color: '#EF4444', count: buckets.overdue },
    { key: 'inProgress', label: 'In Progress', color: '#3B82F6', count: buckets.inProgress },
    { key: 'completed', label: 'Completed', color: '#94A3B8', count: buckets.completed },
  ].map((s) => ({
    ...s,
    percent: total > 0 ? Math.round((s.count / total) * 1000) / 10 : 0,
  }));

  return { total, segments, overdueCount: buckets.overdue };
}

function buildTaskStatusSummary(allTasks) {
  const tasks = allTasks.filter((t) => t.recordType !== 'module');
  const total = tasks.length;

  const counts = {
    completed: 0,
    inDevelopment: 0,
    testing: 0,
    blocked: 0,
    onHold: 0,
    upcoming: 0,
    assigned: 0,
  };

  tasks.forEach((t) => {
    const status = normalizeTaskStatus(t.status);
    switch (status) {
      case 'Completed':
        counts.completed += 1;
        break;
      case 'In Development':
        counts.inDevelopment += 1;
        break;
      case 'Testing':
        counts.testing += 1;
        break;
      case 'Blocked':
        counts.blocked += 1;
        break;
      case 'On Hold':
        counts.onHold += 1;
        break;
      case 'Upcoming':
        counts.upcoming += 1;
        break;
      case 'Assigned':
        counts.assigned += 1;
        break;
      default:
        break;
    }
  });

  const pct = (n) => (total > 0 ? Math.round((n / total) * 10000) / 100 : 0);

  return {
    total,
    blocks: [
      { key: 'total', label: 'Total Tasks', value: total, percent: null, color: '#4F46E5' },
      { key: 'completed', label: 'Completed', value: counts.completed, percent: pct(counts.completed), color: '#22C55E' },
      { key: 'inDevelopment', label: 'In Development', value: counts.inDevelopment, percent: pct(counts.inDevelopment), color: '#F97316' },
      { key: 'testing', label: 'Testing', value: counts.testing, percent: pct(counts.testing), color: '#06B6D4' },
      { key: 'blocked', label: 'Blocked', value: counts.blocked, percent: pct(counts.blocked), color: '#EF4444' },
      { key: 'onHold', label: 'On Hold', value: counts.onHold, percent: pct(counts.onHold), color: '#94A3B8' },
    ],
    raw: counts,
  };
}

function buildUpcomingDeadlines(projectsWithTasks, now, limit = 5) {
  const today = todayStart(now);
  const items = [];

  projectsWithTasks.forEach(({ project, tasks }) => {
    tasks
      .filter((t) => t.recordType !== 'module' && t.status !== 'Completed' && t.dueDate)
      .forEach((t) => {
        const due = new Date(`${t.dueDate}T00:00:00`);
        if (due < today) return;
        items.push({
          taskId: t.id,
          projectId: project.id,
          title: t.taskName,
          projectName: project.name,
          module: t.module || null,
          dueDate: t.dueDate,
          daysUntil: daysUntilDue(t.dueDate, today),
        });
      });
  });

  items.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  return items.slice(0, limit);
}

function buildOverdueTasks(projectsWithTasks, now, limit = 5) {
  const today = todayStart(now);
  const items = [];

  projectsWithTasks.forEach(({ project, tasks }) => {
    tasks
      .filter((t) => t.recordType !== 'module' && t.status !== 'Completed' && t.dueDate)
      .forEach((t) => {
        const late = daysOverdue(t.dueDate, today);
        if (late <= 0) return;
        items.push({
          taskId: t.id,
          projectId: project.id,
          title: t.taskName,
          projectName: project.name,
          module: t.module || null,
          daysLate: late,
          status: normalizeTaskStatus(t.status),
        });
      });
  });

  items.sort((a, b) => b.daysLate - a.daysLate);
  return items.slice(0, limit);
}

function buildRecentActivity(projectsWithTasks, limit = 5) {
  const events = [];

  projectsWithTasks.forEach(({ project, tasks }) => {
    tasks
      .filter((t) => t.recordType !== 'module')
      .forEach((t) => {
        const dev = t.developer;
        const userName = dev?.name || 'System';
        const status = normalizeTaskStatus(t.status);
        let action = 'updated status of';
        if (status === 'Completed') action = 'completed';
        else if (status === 'Assigned') action = 'created new task';
        else if (status === 'Testing') action = 'moved to Testing';
        else if (status === 'In Development') action = 'updated status of';

        events.push({
          id: `${t.id}-${t.updatedAt}`,
          taskId: t.id,
          projectId: project.id,
          userName,
          avatarColor: dev?.color || '#4F46E5',
          action,
          taskTitle: t.taskName,
          projectName: project.name,
          status,
          updatedAt: t.updatedAt,
        });
      });
  });

  events.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return events.slice(0, limit);
}

function pickDefaultProjectId(enriched, overdueTasks) {
  if (overdueTasks.length > 0) return overdueTasks[0].projectId;
  const active = enriched.find((p) => p.status === 'Active' && !p.archived);
  if (active) return active.id;
  return enriched[0]?.id || null;
}

/**
 * Build global admin dashboard payload from raw Sequelize project rows.
 */
function buildAdminDashboard(projects = [], now = todayStart()) {
  const enriched = projects.map((p) => enrichProjectRecord(p, now));

  const projectsWithTasks = projects.map((p, i) => ({
    project: projects[i],
    enriched: enriched[i],
    tasks: p.tasks || [],
  }));

  const kpi = {
    total: enriched.length,
    completed: enriched.filter((p) => categorizeProjectForHealth(p) === 'completed').length,
    inProgress: enriched.filter((p) => p.status === 'Active' && categorizeProjectForHealth(p) !== 'completed').length,
    atRisk: enriched.filter((p) => categorizeProjectForHealth(p) === 'atRisk').length,
    overdue: enriched.filter((p) => categorizeProjectForHealth(p) === 'overdue').length,
  };

  const trends = snapshotAtMonthStart(projects, enriched, now);

  const deliveryHealth = buildDeliveryHealthChart(enriched);

  const allTasks = projects.flatMap((p) => p.tasks || []);
  const taskStatus = buildTaskStatusSummary(allTasks);
  const upcomingDeadlines = buildUpcomingDeadlines(projectsWithTasks, now);
  const overdueTasks = buildOverdueTasks(projectsWithTasks, now);
  const recentActivity = buildRecentActivity(projectsWithTasks);
  const defaultProjectId = pickDefaultProjectId(enriched, overdueTasks);

  return {
    kpi,
    trends,
    deliveryHealth,
    taskStatus,
    upcomingDeadlines,
    overdueTasks,
    recentActivity,
    defaultProjectId,
    hasProjects: enriched.length > 0,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildAdminDashboard,
  categorizeProjectForHealth,
  normalizeTaskStatus,
};
