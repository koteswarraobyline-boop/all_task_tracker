/** Developer directory helpers — filters, KPIs, workload, export */

export const DEVELOPER_STATUSES = ['Active', 'On Leave', 'Inactive'];

export const DEFAULT_ROLES = [
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'QA Engineer',
  'DevOps Engineer',
  'UI Designer',
];

export const DEFAULT_TEAMS = ['Development', 'UI/UX', 'QA', 'Infrastructure'];

export const WORKLOAD_CAPACITY_HOURS = 40;
export const WORKLOAD_CAPACITY_TASKS = 12;

export const WORKLOAD_FILTER_OPTIONS = [
  { value: '', label: 'All Workload' },
  { value: 'low', label: 'Low (<40%)' },
  { value: 'normal', label: 'Normal (40–70%)' },
  { value: 'high', label: 'High (71–90%)' },
  { value: 'over', label: 'Over capacity (>90%)' },
];

const ROLE_BADGE_STYLES = {
  'Full Stack Developer': { bgcolor: '#EDE9FE', color: '#5B21B6' },
  'Frontend Developer': { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  'Backend Developer': { bgcolor: '#E0E7FF', color: '#4338CA' },
  'QA Engineer': { bgcolor: '#CCFBF1', color: '#0F766E' },
  'DevOps Engineer': { bgcolor: '#F3E8FF', color: '#7C3AED' },
  'UI Designer': { bgcolor: '#FFEDD5', color: '#C2410C' },
};

const STATUS_STYLES = {
  Active: { bgcolor: '#DCFCE7', color: '#15803D', dot: '#22C55E' },
  'On Leave': { bgcolor: '#FEF3C7', color: '#B45309', dot: '#F59E0B' },
  Inactive: { bgcolor: '#F1F5F9', color: '#64748B', dot: '#94A3B8' },
};

export function getRoleBadgeStyle(role) {
  if (!role) return { bgcolor: '#F1F5F9', color: '#64748B' };
  return ROLE_BADGE_STYLES[role] || { bgcolor: '#EEF2FF', color: '#4F46E5' };
}

export function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.Active;
}

export function getWorkloadBarColor(percent) {
  const p = Number(percent) || 0;
  if (p > 90) return '#EF4444';
  if (p > 70) return '#F59E0B';
  if (p < 40) return '#22C55E';
  return '#4F46E5';
}

export function matchesWorkloadFilter(percent, filter) {
  if (!filter) return true;
  const p = Number(percent) || 0;
  if (filter === 'low') return p < 40;
  if (filter === 'normal') return p >= 40 && p <= 70;
  if (filter === 'high') return p > 70 && p <= 90;
  if (filter === 'over') return p > 90;
  return true;
}

export function filterDevelopers(developers, { search, role, team, status, workload, project }) {
  const q = (search || '').trim().toLowerCase();
  return (developers || []).filter((dev) => {
    if (q) {
      const projectNames = (dev.projects || []).map((p) => p.name).join(' ');
      const hay = [dev.name, dev.email, dev.skills, projectNames]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (role && dev.role !== role) return false;
    if (team && dev.team !== team) return false;
    if (status && (dev.status || 'Active') !== status) return false;
    if (project && !(dev.projects || []).some((p) => String(p.id) === String(project))) return false;
    if (!matchesWorkloadFilter(dev.workloadPercent, workload)) return false;
    return true;
  });
}

/** Projects with open work first, then by name. */
export function sortDeveloperProjects(projects) {
  return [...(projects || [])].sort((a, b) => {
    const activeDiff = (b.activeTasks || 0) - (a.activeTasks || 0);
    if (activeDiff !== 0) return activeDiff;
    return String(a.name).localeCompare(String(b.name));
  });
}

export function formatProjectsLabel(projects, maxNames = 2) {
  const list = sortDeveloperProjects(projects);
  if (!list.length) return '';
  const names = list.map((p) => p.name);
  if (names.length <= maxNames) return names.join(', ');
  return `${names.slice(0, maxNames).join(', ')} +${names.length - maxNames} more`;
}

export function computeDeveloperKpis(developers) {
  const list = developers || [];
  const activeDevs = list.filter((d) => (d.status || 'Active') === 'Active');
  const workloadValues = activeDevs
    .map((d) => Number(d.workloadPercent) || 0)
    .filter((n) => !Number.isNaN(n));

  return {
    total: list.length,
    active: list.filter((d) => (d.status || 'Active') === 'Active').length,
    onLeave: list.filter((d) => d.status === 'On Leave').length,
    totalTasks: list.reduce((sum, d) => sum + (Number(d.totalTasks) || 0), 0),
    avgWorkload:
      workloadValues.length > 0
        ? Math.round(workloadValues.reduce((a, b) => a + b, 0) / workloadValues.length)
        : 0,
  };
}

export function formatLastActive(dev) {
  if (dev.status === 'On Leave') return 'On Leave';
  if (dev.status === 'Inactive') return 'Inactive';

  const raw = dev.lastActiveAt || dev.updatedAt;
  if (!raw) return '—';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  if (date >= startOfToday) return `Today, ${time}`;
  if (date >= startOfYesterday) return `Yesterday, ${time}`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function exportDevelopersCsv(developers, filename = 'developers') {
  const headers = [
    'Name',
    'Email',
    'Role',
    'Team',
    'Status',
    'Skills',
    'Workload %',
    'Active Tasks',
    'Completed Tasks',
    'Total Tasks',
    'Projects',
    'Last Active',
  ];
  const rows = (developers || []).map((d) => [
    d.name || '',
    d.email || '',
    d.role || '',
    d.team || '',
    d.status || 'Active',
    d.skills || '',
    d.workloadPercent ?? '',
    d.activeTasks ?? '',
    d.completedTasks ?? '',
    d.totalTasks ?? '',
    (d.projects || []).map((p) => p.name).join('; '),
    formatLastActive(d),
  ]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

export function formatDeveloperEmployeeId(id) {
  if (id == null || id === '') return '—';
  return `DEV-${String(id).padStart(4, '0')}`;
}

export function getWorkloadLabel(percent) {
  const p = Number(percent) || 0;
  if (p > 90) return 'Over capacity';
  if (p > 70) return 'High';
  if (p >= 40) return 'Normal';
  return 'Low';
}

export function getAvailabilityLabel(percent) {
  const p = Number(percent) || 0;
  if (p >= 50) return 'Available';
  if (p >= 20) return 'Limited';
  return 'Busy';
}

export function getProgressLabel(percent) {
  const p = Number(percent) || 0;
  if (p >= 80) return 'Strong';
  if (p >= 50) return 'Average';
  if (p > 0) return 'Low';
  return 'None';
}

const STATUS_BREAKDOWN_BUCKETS = [
  { name: 'Not Started', statuses: ['Upcoming'], color: '#94A3B8' },
  { name: 'Pending', statuses: ['Assigned'], color: '#EAB308' },
  { name: 'In Progress', statuses: ['In Development'], color: '#2563EB' },
  { name: 'Testing', statuses: ['Testing', 'Code Review'], color: '#9333EA' },
  { name: 'Completed', statuses: ['Completed'], color: '#22C55E' },
  { name: 'On Hold', statuses: ['On Hold'], color: '#F59E0B' },
  { name: 'Blocked', statuses: ['Blocked'], color: '#EF4444' },
];

export function buildTaskStatusBreakdown(tasks) {
  const workTasks = (tasks || []).filter((t) => !t.recordType || t.recordType === 'task');
  return STATUS_BREAKDOWN_BUCKETS.map((bucket) => ({
    name: bucket.name,
    value: workTasks.filter((t) => bucket.statuses.includes(t.status)).length,
    color: bucket.color,
  })).filter((row) => row.value > 0);
}

export function formatActivityTimestamp(raw) {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  if (date >= startOfToday) return `Today, ${time}`;
  if (date >= startOfYesterday) return `Yesterday, ${time}`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function buildRecentActivityFromTasks(tasks, limit = 8) {
  const workTasks = (tasks || []).filter((t) => !t.recordType || t.recordType === 'task');
  return [...workTasks]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
    .map((task) => {
      const isCompleted = task.status === 'Completed';
      return {
        id: task.id,
        type: isCompleted ? 'completed' : 'updated',
        description: isCompleted
          ? `Completed task "${task.taskName}"`
          : `Updated task "${task.taskName}"`,
        detail: isCompleted ? task.projectName : task.status,
        timestamp: task.updatedAt,
        formattedTime: formatActivityTimestamp(task.updatedAt),
      };
    });
}

export function buildUpcomingDeadlines(tasks, today = new Date(), limit = 5) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const workTasks = (tasks || []).filter((t) => !t.recordType || t.recordType === 'task');

  return workTasks
    .filter((task) => {
      if (task.status === 'Completed' || !task.dueDate) return false;
      const due = new Date(`${task.dueDate}T00:00:00`);
      return due >= start;
    })
    .map((task) => {
      const due = new Date(`${task.dueDate}T00:00:00`);
      const daysLeft = Math.max(0, Math.round((due - start) / 86400000));
      return { ...task, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft || a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit);
}

export function formatDueDateLabel(dueDate) {
  if (!dueDate) return '—';
  const date = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dueDate;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatJoinedDate(raw) {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function parseSkillsList(skills) {
  if (!skills) return [];
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
