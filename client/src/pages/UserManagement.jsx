import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Stack,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  Avatar,
  Tabs,
  Tab,
  InputAdornment,
  Menu,
  Pagination,
  Checkbox,
  Divider,
  Skeleton,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  LinkOff as DisableIcon,
  Link as EnableIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  FileDownload as ExportIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  PersonAdd as InviteIcon,
  Groups as UsersIcon,
  CheckCircle as ActiveIcon,
  AdminPanelSettings as AdminIcon,
  Code as DevIcon,
  Person as ClientIcon,
  Clear as ClearIcon,
  KeyboardCommandKey as CmdIcon,
  Close as CloseIcon,
  Dashboard as DashIcon,
  Email as EmailIcon,
  FolderOpen as ProjectsIcon,
  ViewKanban as TasksIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon,
  LockReset as ResetIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PageContainer, { MetricCard } from '../components/PageContainer';
import EmptyState from '../components/EmptyState';
import { tokens } from '../theme';
import { initials, formatDate, formatDateTime } from '../utils/formatters';
import { openClientInviteEmail } from '../utils/clientInviteMail';

const ROLE_SX = {
  Administrator: { bgcolor: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' },
  'Super Admin': { bgcolor: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' },
  Admin: { bgcolor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' },
  Developer: { bgcolor: '#FFEDD5', color: '#9A3412', border: '1px solid #FED7AA' },
  Client: { bgcolor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' },
};

const STATUS_SX = {
  Active: { color: '#15803D', dot: '#22C55E' },
  Pending: { color: '#B45309', dot: '#F59E0B' },
  Inactive: { color: '#64748B', dot: '#94A3B8' },
  Suspended: { color: '#B91C1C', dot: '#EF4444' },
};

const MODULE_PERMS = [
  { key: 'dashboard', label: 'Dashboard', desc: 'View project overview & KPIs', icon: <DashIcon sx={{ fontSize: 18 }} />, roles: ['Administrator', 'Developer'] },
  { key: 'projects', label: 'Projects', desc: 'Create and manage projects', icon: <ProjectsIcon sx={{ fontSize: 18 }} />, roles: ['Administrator', 'Developer'] },
  { key: 'tasks', label: 'Task Board', desc: 'View and update tasks', icon: <TasksIcon sx={{ fontSize: 18 }} />, roles: ['Administrator', 'Developer', 'Client'] },
  { key: 'calendar', label: 'Calendar', desc: 'Schedule and deadlines', icon: <CalendarIcon sx={{ fontSize: 18 }} />, roles: ['Administrator', 'Developer', 'Client'] },
  { key: 'developers', label: 'Developers', desc: 'Manage assignee directory', icon: <DevIcon sx={{ fontSize: 18 }} />, roles: ['Administrator'] },
  { key: 'users', label: 'Users', desc: 'Invite and manage users', icon: <UsersIcon sx={{ fontSize: 18 }} />, roles: ['Administrator'] },
  { key: 'settings', label: 'Settings', desc: 'Workspace configuration', icon: <SettingsIcon sx={{ fontSize: 18 }} />, roles: ['Administrator'] },
];

const TABS = [
  { id: 'all', label: 'All Users' },
  { id: 'Administrator', label: 'Administrators' },
  { id: 'Developer', label: 'Developers' },
  { id: 'Client', label: 'Clients' },
  { id: 'inactive', label: 'Inactive Users' },
];

const AVATAR_COLORS = ['#6366F1', '#2563EB', '#059669', '#EA580C', '#DB2777', '#0891B2', '#7C3AED'];

const glassSx = {
  bgcolor: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
  borderRadius: `${tokens.radius.card}px`,
};

function roleColor(id) {
  return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length];
}

function permissionChipsForRole(role) {
  return MODULE_PERMS.filter((m) => m.roles.includes(role)).map((m) => m.label);
}

function exportUsersCsv(rows) {
  const headers = ['Name', 'Email', 'Role', 'Company', 'Status', 'Last Active', 'Created'];
  const lines = rows.map((u) =>
    [u.name, u.email, u.role, u.department, u.status, u.lastActive || '', u.createdAt || '']
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }) {
  const sx = STATUS_SX[status] || STATUS_SX.Inactive;
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        gap: 0.75
      }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sx.dot, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 650, color: sx.color }}>{status}</Typography>
    </Stack>
  );
}

function RoleBadge({ role }) {
  const sx = ROLE_SX[role] || ROLE_SX.Client;
  return (
    <Chip
      size="small"
      label={role}
      sx={{ height: 26, fontWeight: 750, fontSize: '0.7rem', borderRadius: 999, ...sx }}
    />
  );
}

export default function UserManagement() {
  const [developers, setDevelopers] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuUser, setMenuUser] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editHadPassword, setEditHadPassword] = useState(false);
  const [addDevOpen, setAddDevOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const emptyClientForm = {
    clientName: '',
    company: '',
    email: '',
    projectId: '',
    passwordProtected: false,
    password: '',
  };

  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [devForm, setDevForm] = useState({ name: '', email: '', color: '#6366F1' });

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [devs, accessRecords, projectList, me] = await Promise.all([
        api.getDevelopers().catch(() => []),
        api.listClientAccess().catch(() => []),
        api.getProjects().catch(() => []),
        api.getMe().catch(() => null),
      ]);
      setDevelopers(devs || []);
      setClients(accessRecords || []);
      setProjects(projectList || []);
      setAdmin(me);
    } catch (error) {
      console.error(error);
      showAlert('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('users-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const users = useMemo(() => {
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
        department: '—',
        position: 'Administrator',
        phone: '—',
        status: 'Active',
        lastActive: null,
        createdAt: null,
        color: '#6366F1',
        permissions: permissionChipsForRole('Administrator'),
        activity: [],
      });
    }

    developers.forEach((d) => {
      rows.push({
        id: `dev-${d.id}`,
        source: 'developer',
        rawId: d.id,
        name: d.name || 'Developer',
        email: d.email || '—',
        role: 'Developer',
        department: '—',
        position: 'Developer',
        phone: '—',
        status: 'Active',
        lastActive: d.updatedAt,
        createdAt: d.createdAt,
        color: d.color || roleColor(d.id),
        permissions: permissionChipsForRole('Developer'),
        taskStats: {
          total: d.totalTasks || 0,
          completed: d.completedTasks || 0,
        },
        activity: [],
        raw: d,
      });
    });

    clients.forEach((c) => {
      const status =
        c.status === 'active' ? 'Active' : c.status === 'disabled' ? 'Inactive' : 'Pending';
      rows.push({
        id: `client-${c.id}`,
        source: 'client',
        rawId: c.id,
        name: c.clientName || 'Client',
        email: c.email || '—',
        role: 'Client',
        department: c.company || '—',
        position: 'Client',
        phone: '—',
        status,
        lastActive: c.lastOpenedAt,
        createdAt: c.createdAt,
        color: roleColor(c.id + 3),
        permissions: permissionChipsForRole('Client'),
        projectName: c.project?.name || `Project #${c.projectId}`,
        shareUrl: c.shareUrl,
        passwordProtected: c.passwordProtected,
        activity: [
          ...(c.lastOpenedAt
            ? [{ text: 'Opened shared project', when: formatDateTime(c.lastOpenedAt) }]
            : []),
          { text: `Linked to ${c.project?.name || 'project'}`, when: formatDate(c.createdAt) },
        ],
        raw: c,
      });
    });

    return rows;
  }, [admin, developers, clients]);

  const departments = useMemo(
    () => [...new Set(users.map((u) => u.department).filter((d) => d && d !== '—'))].sort(),
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (tab === 'inactive') {
        if (u.status === 'Active') return false;
      } else if (tab !== 'all' && u.role !== tab) {
        return false;
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (deptFilter !== 'all' && u.department !== deptFilter) return false;
      if (q) {
        const hay = [u.name, u.email, u.role, u.department, u.position].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, tab, search, roleFilter, statusFilter, deptFilter]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, roleFilter, statusFilter, deptFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const from = filtered.length === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to = Math.min(page * rowsPerPage, filtered.length);

  const selected = users.find((u) => u.id === selectedId) || null;

  useEffect(() => {
    if (selectedId && !users.some((u) => u.id === selectedId)) {
      setSelectedId(null);
    }
  }, [users, selectedId]);

  const totals = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'Active').length;
    const admins = users.filter((u) => u.role === 'Administrator').length;
    const devs = users.filter((u) => u.role === 'Developer').length;
    const clientCount = users.filter((u) => u.role === 'Client').length;
    return { total, active, admins, devs, clientCount };
  }, [users]);

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setDeptFilter('all');
    setTab('all');
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.createClientAccess({
        clientName: clientForm.clientName.trim(),
        company: clientForm.company.trim() || null,
        email: clientForm.email.trim() || null,
        projectId: parseInt(clientForm.projectId, 10),
        expiresAt: null,
        password:
          clientForm.passwordProtected && clientForm.password ? clientForm.password : undefined,
      });
      const projectLabel =
        projects.find((p) => String(p.id) === String(clientForm.projectId))?.name || 'project';
      const to = clientForm.email.trim();
      if (to && created?.shareUrl) {
        openClientInviteEmail({
          to,
          clientName: clientForm.clientName.trim(),
          projectName: projectLabel,
          shareUrl: created.shareUrl,
          passwordProtected: Boolean(clientForm.passwordProtected),
        });
        showAlert('Client link created — opening email to send invite…');
      } else {
        showAlert('Client link created — copy it from the Clients tab or user details');
      }
      setInviteOpen(false);
      setClientForm(emptyClientForm);
      setTab('Client');
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to create client link', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditClient = (user) => {
    if (user?.source !== 'client' || !user.raw) return;
    setEditingClientId(user.rawId);
    setEditHadPassword(Boolean(user.raw.passwordProtected));
    setClientForm({
      clientName: user.raw.clientName || '',
      company: user.raw.company || '',
      email: user.raw.email || '',
      projectId: String(user.raw.projectId || ''),
      passwordProtected: Boolean(user.raw.passwordProtected),
      password: '',
    });
    setEditOpen(true);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!editingClientId) return;
    if (clientForm.passwordProtected && !clientForm.password.trim() && !editHadPassword) {
      showAlert('Enter a password to protect this link', 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.updateClientAccess(editingClientId, {
        clientName: clientForm.clientName.trim(),
        company: clientForm.company.trim() || null,
        email: clientForm.email.trim() || null,
        // leave blank = keep existing password; empty string when toggle off = remove password
        password: clientForm.passwordProtected
          ? (clientForm.password.trim() || undefined)
          : '',
      });
      showAlert(
        clientForm.passwordProtected && clientForm.password.trim()
          ? 'Client updated — password changed'
          : 'Client updated'
      );
      setEditOpen(false);
      setEditingClientId(null);
      setEditHadPassword(false);
      setClientForm(emptyClientForm);
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to update client', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDev = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createDeveloper({
        name: devForm.name.trim(),
        email: devForm.email.trim() || null,
        color: devForm.color,
      });
      showAlert('Developer added');
      setAddDevOpen(false);
      setDevForm({ name: '', email: '', color: '#6366F1' });
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to add developer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showAlert('Link copied to clipboard');
    } catch {
      showAlert('Unable to copy link', 'error');
    }
  };

  const handleEmailClient = (user) => {
    const to = user?.email && user.email !== '—' ? String(user.email).trim() : '';
    if (!to) {
      showAlert('This client has no email on file', 'warning');
      return;
    }
    if (!user?.shareUrl) {
      showAlert('No share link available for this client', 'warning');
      return;
    }
    const opened = openClientInviteEmail({
      to,
      clientName: user.name,
      projectName: user.projectName || user.department,
      shareUrl: user.shareUrl,
      passwordProtected: Boolean(user.passwordProtected),
    });
    if (opened) showAlert('Opening your email app…');
    else showAlert('Could not open email', 'error');
  };

  const handleToggleClient = async (user) => {
    if (user.source !== 'client' || !user.raw) return;
    try {
      const next = user.raw.status === 'active' ? 'disabled' : 'active';
      await api.updateClientAccess(user.rawId, { status: next });
      showAlert(next === 'active' ? 'User enabled' : 'User disabled');
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const handleRegenerate = async (user) => {
    if (user.source !== 'client') return;
    try {
      const updated = await api.regenerateClientAccess(user.rawId);
      showAlert(`New link ready`);
      if (updated?.shareUrl) handleCopy(updated.shareUrl);
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to regenerate link', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.source === 'client') {
        await api.deleteClientAccess(deleteTarget.rawId);
        showAlert('Client access deleted');
      } else if (deleteTarget.source === 'developer') {
        await api.deleteDeveloper(deleteTarget.rawId);
        showAlert('Developer removed');
      } else {
        showAlert('Administrators cannot be deleted from here', 'warning');
      }
      setDeleteTarget(null);
      setSelectedId(null);
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const filterSx = {
    minWidth: 140,
    '& .MuiOutlinedInput-root': {
      height: 40,
      bgcolor: '#fff',
      borderRadius: 2,
      fontSize: '0.8125rem',
      fontWeight: 600,
    },
  };

  return (
    <PageContainer maxWidth={1800}>
      {/* Breadcrumb + header actions */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: 'stretch', lg: 'flex-start' },
          gap: 2,
          mb: 1
        }}>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 1 }}>
            Settings / User Management
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '1.75rem', md: '2.15rem' },
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              mb: 0.75,
            }}
          >
            User Management
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', lineHeight: 1.5 }}>
            Manage users, roles and permissions across your workspace.
          </Typography>
        </Box>
        <Stack
          direction="row"
          useFlexGap
          sx={{
            gap: 1.25,
            flexWrap: "wrap"
          }}>
          <Button
            variant="contained"
            startIcon={<InviteIcon />}
            onClick={() => {
              setClientForm(emptyClientForm);
              setInviteOpen(true);
            }}
            sx={{
              height: 44,
              background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
              boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
            }}
          >
            Invite User
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddDevOpen(true)}
            sx={{ bgcolor: '#fff', height: 44 }}
          >
            Add Developer
          </Button>
        </Stack>
      </Stack>
      {/* KPI cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            xl: 'repeat(5, 1fr)',
          },
          gap: 2.5,
          my: 4,
        }}
      >
        <MetricCard label="Total Users" value={totals.total} icon={<UsersIcon />} tint="#EEF2FF" iconColor="#6366F1" />
        <MetricCard label="Active Users" value={totals.active} icon={<ActiveIcon />} tint="#ECFDF5" iconColor="#059669" />
        <MetricCard label="Administrators" value={totals.admins} icon={<AdminIcon />} tint="#F5F3FF" iconColor="#7C3AED" />
        <MetricCard label="Developers" value={totals.devs} icon={<DevIcon />} tint="#FFF7ED" iconColor="#EA580C" />
        <MetricCard label="Clients" value={totals.clientCount} icon={<ClientIcon />} tint="#F8FAFC" iconColor="#64748B" />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            xl: selected && panelOpen ? 'minmax(0, 1fr) 340px' : '1fr',
          },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* Main table card */}
        <Paper elevation={0} sx={{ ...glassSx, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              minHeight: 48,
              '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 48, fontSize: '0.875rem' },
            }}
          >
            {TABS.map((t) => (
              <Tab key={t.id} value={t.id} label={t.label} />
            ))}
          </Tabs>

          {/* Toolbar */}
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            useFlexGap
            sx={{
              gap: 1.5,
              alignItems: { xs: 'stretch', lg: 'center' },
              flexWrap: "wrap",
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
            <TextField
              id="users-search"
              size="small"
              placeholder="Search users by name, email or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: { xs: '100%', md: 260 }, '& .MuiOutlinedInput-root': { height: 40, bgcolor: '#F8FAFC', borderRadius: 2 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" aria-label="Clear search" onClick={() => setSearch('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : (
                    <InputAdornment position="end">
                      <Chip size="small" icon={<CmdIcon sx={{ fontSize: '14px !important' }} />} label="K" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700 }} />
                    </InputAdornment>
                  ),
                }
              }}
            />

            <TextField select size="small" label="Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} sx={filterSx}>
              <MenuItem value="all">All Roles</MenuItem>
              {['Administrator', 'Developer', 'Client'].map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>

            <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={filterSx}>
              <MenuItem value="all">All Status</MenuItem>
              {['Active', 'Pending', 'Inactive'].map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>

            <Button
              size="small"
              startIcon={<FilterIcon />}
              onClick={() => setShowMoreFilters((v) => !v)}
              variant={showMoreFilters ? 'contained' : 'outlined'}
              sx={{ height: 40, bgcolor: showMoreFilters ? undefined : '#fff' }}
            >
              More Filters
            </Button>

            <Tooltip title="Refresh">
              <IconButton onClick={loadData} aria-label="Refresh users" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: '#fff', width: 40, height: 40 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export CSV">
              <IconButton
                onClick={() => {
                  exportUsersCsv(filtered);
                  showAlert(`Exported ${filtered.length} users`);
                }}
                aria-label="Export users"
                sx={{ border: '1px solid', borderColor: 'divider', bgcolor: '#fff', width: 40, height: 40 }}
              >
                <ExportIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Collapse in={showMoreFilters}>
            <Stack
              direction="row"
              useFlexGap
              sx={{
                gap: 1.5,
                flexWrap: "wrap",
                px: 2,
                pb: 2
              }}>
              <TextField select size="small" label="Company" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} sx={filterSx}>
                <MenuItem value="all">All companies</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>
              {(roleFilter !== 'all' || statusFilter !== 'all' || deptFilter !== 'all' || search || tab !== 'all') && (
                <Button size="small" startIcon={<ClearIcon />} onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
            </Stack>
          </Collapse>

          {loading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1.5, borderRadius: 2 }} />
              ))}
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ p: 4 }}>
              <EmptyState
                title="No users yet"
                description="Invite a client or add a developer to start building your workspace roster."
                actionText="Invite User"
                onActionClick={() => {
                  setClientForm(emptyClientForm);
                  setInviteOpen(true);
                }}
                actionPermission="users.manage"
                actionIcon={<InviteIcon />}
              />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 750, mb: 1 }}>No matching users</Typography>
              <Typography sx={{ color: 'text.secondary', mb: 2 }}>Try adjusting search or filters.</Typography>
              <Button variant="outlined" onClick={resetFilters}>Clear filters</Button>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 420px)', overflowX: 'auto' }}>
                <Table stickyHeader sx={{ minWidth: 980 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ bgcolor: '#F8FAFC' }} />
                      {['User', 'Role', 'Company', 'Permissions', 'Status', 'Last Active', 'Created', 'Actions'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 750, bgcolor: '#F8FAFC', fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paged.map((user) => {
                      const isSelected = selectedId === user.id;
                      return (
                        <TableRow
                          key={user.id}
                          hover
                          selected={isSelected}
                          onClick={() => {
                            setSelectedId(user.id);
                            setPanelOpen(true);
                          }}
                          sx={{
                            cursor: 'pointer',
                            transition: tokens.motion.fast,
                            '&.Mui-selected': { bgcolor: 'rgba(79,70,229,0.04)' },
                            '&:hover': { bgcolor: 'rgba(79,70,229,0.03)' },
                          }}
                        >
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              onChange={() => setSelectedId(isSelected ? null : user.id)}
                              inputProps={{ 'aria-label': `Select ${user.name}` }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 260 }}>
                            <Stack
                              direction="row"
                              sx={{
                                alignItems: "center",
                                gap: 1.5
                              }}>
                              <Avatar sx={{ width: 40, height: 40, bgcolor: user.color, fontWeight: 700, fontSize: '0.85rem' }}>
                                {initials(user.name)}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }} noWrap>{user.name}</Typography>
                                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>{user.email}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell><RoleBadge role={user.role} /></TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }} noWrap>{user.department}</Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220 }}>
                            <Stack
                              direction="row"
                              useFlexGap
                              sx={{
                                gap: 0.5,
                                flexWrap: "wrap"
                              }}>
                              {user.permissions.slice(0, 3).map((p) => (
                                <Chip
                                  key={p}
                                  size="small"
                                  label={p}
                                  sx={{ height: 22, fontSize: '0.65rem', fontWeight: 650, bgcolor: '#F1F5F9', color: '#475569' }}
                                />
                              ))}
                              {user.permissions.length > 3 && (
                                <Chip
                                  size="small"
                                  label={`+${user.permissions.length - 3}`}
                                  sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell><StatusBadge status={user.status} /></TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                              {formatDateTime(user.lastActive)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                              {formatDate(user.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" sx={{
                              gap: 0.25
                            }}>
                              <Tooltip title="View">
                                <IconButton
                                  size="small"
                                  aria-label={`View ${user.name}`}
                                  onClick={() => {
                                    setSelectedId(user.id);
                                    setPanelOpen(true);
                                  }}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <IconButton
                                size="small"
                                aria-label={`More actions for ${user.name}`}
                                onClick={(e) => {
                                  setMenuAnchor(e.currentTarget);
                                  setMenuUser(user);
                                }}
                              >
                                <MoreIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: 'stretch', sm: 'center' },
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}>
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                  Showing {from} to {to} of {filtered.length} users
                </Typography>
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap"
                  }}>
                  <TextField
                    select
                    size="small"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { height: 36 }, '& .MuiSelect-select': { fontSize: '0.8rem', fontWeight: 600 } }}
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <MenuItem key={n} value={n}>{n} per page</MenuItem>
                    ))}
                  </TextField>
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={(_e, v) => setPage(v)}
                    color="primary"
                    shape="rounded"
                    size="small"
                  />
                </Stack>
              </Stack>
            </>
          )}
        </Paper>

        {/* Right details panel */}
        {selected && panelOpen && (
          <Paper
            elevation={0}
            sx={{
              ...glassSx,
              p: 0,
              position: { xl: 'sticky' },
              top: 88,
              maxHeight: { xl: 'calc(100vh - 120px)' },
              overflow: 'auto',
              display: { xs: 'none', xl: 'block' },
            }}
          >
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "flex-start",
                p: 2.5,
                pb: 2
              }}>
              <Stack
                direction="row"
                sx={{
                  gap: 1.5,
                  alignItems: "center",
                  minWidth: 0
                }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: selected.color, fontWeight: 800, fontSize: '1.15rem' }}>
                  {initials(selected.name)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }} noWrap>{selected.name}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }} noWrap>{selected.email}</Typography>
                  <Box sx={{ mt: 1 }}><RoleBadge role={selected.role} /></Box>
                </Box>
              </Stack>
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  gap: 1
                }}>
                <StatusBadge status={selected.status} />
                <IconButton size="small" aria-label="Close panel" onClick={() => setPanelOpen(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Divider />

            <Box sx={{ px: 2.5, py: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2.5 }}>
                {[
                  ...(selected.department && selected.department !== '—'
                    ? [['Company', selected.department]]
                    : []),
                  ['Role', selected.role],
                  ...(selected.projectName ? [['Project', selected.projectName]] : []),
                  ...(selected.source === 'client'
                    ? [['Password', selected.passwordProtected ? 'Protected' : 'None']]
                    : []),
                  ['Last active', selected.lastActive ? formatDateTime(selected.lastActive) : '—'],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', mb: 0.35 }}>
                      {label.toUpperCase()}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 650 }} noWrap>{value}</Typography>
                  </Box>
                ))}
              </Box>

              <Typography sx={{ fontWeight: 750, fontSize: '0.875rem', mb: 1.5 }}>Permissions</Typography>
              <Stack spacing={0.5} sx={{ mb: 2.5 }}>
                {MODULE_PERMS.map((mod) => {
                  const allowed = mod.roles.includes(selected.role) && selected.status === 'Active';
                  return (
                    <Stack
                      key={mod.key}
                      direction="row"
                      sx={{
                        alignItems: "center",
                        gap: 1.25,
                        py: 1,
                        px: 1.25,
                        borderRadius: 2,
                        bgcolor: allowed ? 'rgba(34,197,94,0.06)' : '#F8FAFC',
                        border: '1px solid',
                        borderColor: allowed ? 'rgba(34,197,94,0.2)' : 'divider'
                      }}>
                      <Box sx={{ color: allowed ? '#16A34A' : '#94A3B8', display: 'flex' }}>{mod.icon}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{mod.label}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }} noWrap>{mod.desc}</Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={allowed ? 'Allowed' : 'Denied'}
                        sx={{
                          height: 22,
                          fontWeight: 750,
                          fontSize: '0.65rem',
                          bgcolor: allowed ? '#DCFCE7' : '#F1F5F9',
                          color: allowed ? '#166534' : '#64748B',
                        }}
                      />
                    </Stack>
                  );
                })}
              </Stack>

              {(selected.activity || []).length > 0 && (
                <>
                  <Typography sx={{ fontWeight: 750, fontSize: '0.875rem', mb: 1.5 }}>Recent Activity</Typography>
                  <Stack spacing={1.25} sx={{ mb: 2.5 }}>
                    {selected.activity.map((a, i) => (
                      <Stack key={i} direction="row" sx={{
                        gap: 1.25
                      }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#6366F1', mt: 0.75, flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 650 }}>{a.text}</Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{a.when}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}

              <Stack sx={{
                gap: 1
              }}>
                {selected.source === 'client' && (
                  <>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => openEditClient(selected)}
                    >
                      Edit Client
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CopyIcon />}
                      onClick={() => handleCopy(selected.shareUrl)}
                    >
                      Copy Share Link
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<EmailIcon />}
                      onClick={() => handleEmailClient(selected)}
                      disabled={!selected.email || selected.email === '—'}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Email Link to Client
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={selected.status === 'Active' ? <DisableIcon /> : <EnableIcon />}
                      onClick={() => handleToggleClient(selected)}
                    >
                      {selected.status === 'Active' ? 'Disable Access' : 'Enable Access'}
                    </Button>
                  </>
                )}
                {selected.source !== 'admin' && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteTarget(selected)}
                  >
                    Delete User
                  </Button>
                )}
              </Stack>
            </Box>
          </Paper>
        )}
      </Box>
      {/* Row actions menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setSelectedId(menuUser?.id);
            setPanelOpen(true);
            setMenuAnchor(null);
          }}
        >
          <ViewIcon fontSize="small" sx={{ mr: 1.5 }} /> View
        </MenuItem>
        {menuUser?.source === 'developer' && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              showAlert('Edit developer from the Developers page', 'info');
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit
          </MenuItem>
        )}
        {menuUser?.source === 'client' && (
          <>
            <MenuItem
              onClick={() => {
                openEditClient(menuUser);
                setMenuAnchor(null);
              }}
            >
              <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleCopy(menuUser.shareUrl);
                setMenuAnchor(null);
              }}
            >
              <CopyIcon fontSize="small" sx={{ mr: 1.5 }} /> Copy Link
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleEmailClient(menuUser);
                setMenuAnchor(null);
              }}
              disabled={!menuUser.email || menuUser.email === '—'}
            >
              <EmailIcon fontSize="small" sx={{ mr: 1.5 }} /> Email Client
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleToggleClient(menuUser);
                setMenuAnchor(null);
              }}
            >
              {menuUser.status === 'Active' ? (
                <><DisableIcon fontSize="small" sx={{ mr: 1.5 }} /> Disable</>
              ) : (
                <><EnableIcon
                  sx={{
                    fontSize: "small",
                    mr: 1.5
                  }} /> Enable</>
              )}
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleRegenerate(menuUser);
                setMenuAnchor(null);
              }}
            >
              <ResetIcon fontSize="small" sx={{ mr: 1.5 }} /> Regenerate Link
            </MenuItem>
          </>
        )}
        {menuUser?.source !== 'admin' && (
          <MenuItem
            onClick={() => {
              setDeleteTarget(menuUser);
              setMenuAnchor(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
          </MenuItem>
        )}
      </Menu>
      {/* Invite client — same create-client-link flow as before */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Create Client Link</DialogTitle>
        <Box component="form" onSubmit={handleCreateClient}>
          <DialogContent>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: 2
              }}>
              Generate a secure share link so a client can view one project’s tasks in read-only mode.
            </Typography>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                required
                label="Client name"
                value={clientForm.clientName}
                onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                autoFocus
              />
              <TextField
                label="Company"
                value={clientForm.company}
                onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
              />
              <TextField
                type="email"
                label="Client email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder="client@company.com"
                helperText="Optional — if set, your mail app opens with the invite link ready to send"
              />
              <TextField
                required
                select
                label="Project"
                value={clientForm.projectId}
                onChange={(e) => setClientForm({ ...clientForm, projectId: e.target.value })}
                helperText="Client will only see this project"
              >
                {projects.length === 0 ? (
                  <MenuItem value="" disabled>
                    No projects available — upload one first
                  </MenuItem>
                ) : (
                  projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))
                )}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={clientForm.passwordProtected}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, passwordProtected: e.target.checked })
                    }
                  />
                }
                label="Password protect link"
              />
              {clientForm.passwordProtected && (
                <TextField
                  required
                  type="password"
                  label="Password"
                  value={clientForm.password}
                  onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !clientForm.projectId || !clientForm.clientName.trim()}
            >
              {saving ? 'Creating…' : 'Create Client Link'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit client — change details / password without regenerating the link */}
      <Dialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingClientId(null);
          setEditHadPassword(false);
          setClientForm(emptyClientForm);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Client</DialogTitle>
        <Box component="form" onSubmit={handleUpdateClient}>
          <DialogContent>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 2,
              }}
            >
              Update client details or change the share-link password. Leave the password blank to keep the current one.
            </Typography>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                required
                label="Client name"
                value={clientForm.clientName}
                onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                autoFocus
              />
              <TextField
                label="Company"
                value={clientForm.company}
                onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
              />
              <TextField
                type="email"
                label="Client email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder="client@company.com"
              />
              <TextField
                label="Project"
                value={
                  projects.find((p) => String(p.id) === String(clientForm.projectId))?.name ||
                  `Project #${clientForm.projectId}`
                }
                fullWidth
                slotProps={{ input: { readOnly: true } }}
                helperText="Project is locked to this link — create a new client link to change it"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={clientForm.passwordProtected}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, passwordProtected: e.target.checked, password: '' })
                    }
                  />
                }
                label="Password protect link"
              />
              {clientForm.passwordProtected && (
                <TextField
                  type="password"
                  label={editHadPassword ? 'New password' : 'Password'}
                  value={clientForm.password}
                  onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                  helperText={
                    editHadPassword
                      ? 'Leave blank to keep the existing password'
                      : 'Required to enable password protection'
                  }
                  required={!editHadPassword}
                  autoComplete="new-password"
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditOpen(false);
                setEditingClientId(null);
                setEditHadPassword(false);
                setClientForm(emptyClientForm);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !clientForm.clientName.trim()}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      {/* Add developer */}
      <Dialog open={addDevOpen} onClose={() => setAddDevOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Add User (Developer)</DialogTitle>
        <Box component="form" onSubmit={handleCreateDev}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                required
                label="Full name"
                value={devForm.name}
                onChange={(e) => setDevForm({ ...devForm, name: e.target.value })}
              />
              <TextField
                type="email"
                label="Email"
                value={devForm.email}
                onChange={(e) => setDevForm({ ...devForm, email: e.target.value })}
              />
              <TextField
                label="Avatar color"
                type="color"
                value={devForm.color}
                onChange={(e) => setDevForm({ ...devForm, color: e.target.value })}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDevOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Add Developer'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteTarget?.name}</strong> from the workspace? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
