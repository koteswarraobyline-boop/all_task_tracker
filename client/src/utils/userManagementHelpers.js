/** User Management — roster building, filters, KPIs, export */

import { formatLastActive as formatDevLastActive } from './developerHelpers';
import { formatDateTime } from './formatters';

export const USER_ROLES = ['Administrator', 'Developer', 'Client'];

export const USER_STATUSES = ['Active', 'Pending', 'Inactive', 'Suspended'];

export const ROLE_BADGE_STYLES = {
  Administrator: { bgcolor: '#EDE9FE', color: '#5B21B6' },
  Admin: { bgcolor: '#EDE9FE', color: '#5B21B6' },
  'Super Admin': { bgcolor: '#EDE9FE', color: '#5B21B6' },
  'Project Manager': { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  Developer: { bgcolor: '#DCFCE7', color: '#15803D' },
  'Full Stack Developer': { bgcolor: '#EDE9FE', color: '#5B21B6' },
  'Frontend Developer': { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  'Backend Developer': { bgcolor: '#E0E7FF', color: '#4338CA' },
  'QA Engineer': { bgcolor: '#FFEDD5', color: '#C2410C' },
  'DevOps Engineer': { bgcolor: '#F3E8FF', color: '#7C3AED' },
  'UI Designer': { bgcolor: '#FFEDD5', color: '#C2410C' },
  'Content Manager': { bgcolor: '#F1F5F9', color: '#475569' },
  Client: { bgcolor: '#F1F5F9', color: '#475569' },
};

export const STATUS_STYLES = {
  Active: { bgcolor: '#DCFCE7', color: '#15803D', dot: '#22C55E' },
  Pending: { bgcolor: '#FEF3C7', color: '#B45309', dot: '#F59E0B' },
  Inactive: { bgcolor: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
  Suspended: { bgcolor: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
};

const MODULE_PERMS = [
  { label: 'Dashboard', roles: ['Administrator', 'Developer'] },
  { label: 'Projects', roles: ['Administrator', 'Developer'] },
  { label: 'Task Board', roles: ['Administrator', 'Developer', 'Client'] },
  { label: 'Calendar', roles: ['Administrator', 'Developer', 'Client'] },
  { label: 'Developers', roles: ['Administrator'] },
  { label: 'Users', roles: ['Administrator'] },
  { label: 'Settings', roles: ['Administrator'] },
];

export function permissionChipsForRole(role) {
  const bucket =
    role === 'Administrator' || role === 'Admin' ? 'Administrator' : role === 'Client' ? 'Client' : 'Developer';
  return MODULE_PERMS.filter((m) => m.roles.includes(bucket)).map((m) => m.label);
}

export function getRoleBadgeStyle(role) {
  if (!role) return { bgcolor: '#F1F5F9', color: '#64748B' };
  return ROLE_BADGE_STYLES[role] || { bgcolor: '#EEF2FF', color: '#4F46E5' };
}

export function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.Inactive;
}

export function formatUserLastActive(user) {
  if (!user) return '—';
  if (user.status === 'Pending') return 'Invitation pending';
  if (user.source === 'developer' && user.raw) {
    return formatDevLastActive(user.raw);
  }
  if (user.lastActive) return formatDateTime(user.lastActive);
  return '—';
}

export function getUserProjectCount(user, totalProjects = 0) {
  if (!user) return 0;
  if (user.source === 'admin') return totalProjects;
  if (user.source === 'client') return user.projectId ? 1 : 0;
  if (user.source === 'developer') return user.projectCount ?? 0;
  return 0;
}

export function userMatchesProject(user, projectId) {
  if (!projectId) return true;
  const pid = String(projectId);
  if (user.source === 'client') return String(user.projectId) === pid;
  if (user.source === 'developer') {
    return (user.projectIds || []).some((id) => String(id) === pid);
  }
  if (user.source === 'admin') return true;
  return false;
}

export function buildUsersFromSources({ admin, developers, clients, projectsCount = 0 }) {
  const rows = [];

  if (admin) {
    rows.push({
      id: `admin-${admin.id}`,
      source: 'admin',
      rawId: admin.id,
      name: admin.username
        ? admin.username.charAt(0).toUpperCase() + admin.username.slice(1)
        : 'Administrator',
      email: admin.email || '—',
      role: 'Administrator',
      roleLabel: 'Admin',
      team: '—',
      status: 'Active',
      lastActive: null,
      createdAt: null,
      color: '#6366F1',
      permissions: permissionChipsForRole('Administrator'),
      projectCount: projectsCount,
      projectIds: [],
      activity: [],
    });
  }

  (developers || []).forEach((d) => {
    const devStatus = d.status === 'Inactive' ? 'Inactive' : d.status === 'On Leave' ? 'Inactive' : 'Active';
    rows.push({
      id: `dev-${d.id}`,
      source: 'developer',
      rawId: d.id,
      name: d.name || 'Developer',
      email: d.email || '—',
      role: d.role || 'Developer',
      roleLabel: d.role || 'Developer',
      team: d.team || '—',
      status: devStatus,
      lastActive: d.lastActiveAt || d.updatedAt,
      createdAt: d.createdAt,
      color: d.color || '#6366F1',
      permissions: permissionChipsForRole('Developer'),
      projectCount: (d.projects || []).length,
      projectIds: (d.projects || []).map((p) => p.id),
      activity: [],
      raw: d,
    });
  });

  (clients || []).forEach((c) => {
    const status =
      c.status === 'active' ? 'Active' : c.status === 'disabled' ? 'Inactive' : 'Pending';
    rows.push({
      id: `client-${c.id}`,
      source: 'client',
      rawId: c.id,
      name: c.clientName || 'Client',
      email: c.email || '—',
      role: 'Client',
      roleLabel: 'Client',
      team: c.company || '—',
      status,
      lastActive: c.lastOpenedAt,
      createdAt: c.createdAt,
      color: '#64748B',
      permissions: permissionChipsForRole('Client'),
      projectCount: c.projectId ? 1 : 0,
      projectId: c.projectId,
      projectIds: c.projectId ? [c.projectId] : [],
      projectName: c.project?.name || (c.projectId ? `Project #${c.projectId}` : '—'),
      token: c.token,
      shareUrl: c.shareUrl,
      passwordProtected: c.passwordProtected,
      activity: [
        ...(c.lastOpenedAt
          ? [{ text: 'Opened shared project', when: formatDateTime(c.lastOpenedAt) }]
          : []),
      ],
      raw: c,
    });
  });

  return rows;
}

export function computeUserKpis(users) {
  const list = users || [];
  return {
    total: list.length,
    active: list.filter((u) => u.status === 'Active').length,
    inactive: list.filter((u) => u.status === 'Inactive' || u.status === 'Suspended').length,
    admins: list.filter((u) => u.role === 'Administrator' || u.roleLabel === 'Admin').length,
    pending: list.filter((u) => u.status === 'Pending').length,
  };
}

export function filterUsers(users, { search, role, status, team, project }) {
  const q = (search || '').trim().toLowerCase();
  return (users || []).filter((u) => {
    if (q) {
      const hay = [u.name, u.email, u.role, u.roleLabel, u.team].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (role) {
      if (role === 'Administrator') {
        if (u.source !== 'admin') return false;
      } else if (role === 'Developer') {
        if (u.source !== 'developer') return false;
      } else if (role === 'Client') {
        if (u.source !== 'client') return false;
      } else if (u.role !== role) {
        return false;
      }
    }
    if (status && u.status !== status) return false;
    if (team && u.team !== team) return false;
    if (project && !userMatchesProject(u, project)) return false;
    return true;
  });
}

export function exportUsersCsv(rows, filename = 'users') {
  const headers = ['Name', 'Email', 'Role', 'Team', 'Status', 'Last Active', 'Projects', 'Created'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = (rows || []).map((u) =>
    [
      u.name,
      u.email,
      u.role,
      u.team,
      u.status,
      formatUserLastActive(u),
      u.projectCount ?? 0,
      u.createdAt || '',
    ]
      .map(escape)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}
