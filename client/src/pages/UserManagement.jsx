import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  AdminPanelSettings as AdminIcon,
  ArrowDropDown as ArrowDropDownIcon,
  CheckCircle as ActiveIcon,
  ChevronRight as ChevronRightIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  FileDownload as ExportIcon,
  Groups as UsersIcon,
  LinkOff as DisableIcon,
  Link as EnableIcon,
  Lock as PendingIcon,
  LockReset as ResetIcon,
  MoreVert as MoreIcon,
  PersonOff as InactiveIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import api from '../services/api';
import Can from '../components/Can';
import EmptyState from '../components/EmptyState';
import PageContainer, { PageHeader, MetricCard } from '../components/PageContainer';
import PaginationBar from '../components/PaginationBar';
import FilterDropdown from '../components/TaskBoard/FilterDropdown';
import { tokens } from '../theme';
import { initials } from '../utils/formatters';
import { openClientInviteEmail } from '../utils/clientInviteMail';
import { resolveClientShareUrl } from '../utils/shareUrl';
import {
  USER_ROLES,
  USER_STATUSES,
  buildUsersFromSources,
  computeUserKpis,
  exportUsersCsv,
  filterUsers,
  formatUserLastActive,
  getRoleBadgeStyle,
  getStatusStyle,
  getUserProjectCount,
  uniqueSorted,
} from '../utils/userManagementHelpers';

function StatusBadge({ status }) {
  const sx = getStatusStyle(status);
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sx.dot, flexShrink: 0 }} />
      <Chip
        label={status}
        size="small"
        sx={{
          bgcolor: sx.bgcolor,
          color: sx.color,
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: `${tokens.radius.badge}px`,
        }}
      />
    </Stack>
  );
}

function RoleBadge({ role }) {
  const sx = getRoleBadgeStyle(role);
  return (
    <Chip
      label={role}
      size="small"
      sx={{
        height: 26,
        fontWeight: 600,
        fontSize: '0.75rem',
        borderRadius: 999,
        bgcolor: sx.bgcolor,
        color: sx.color,
      }}
    />
  );
}

function UserDetailsDrawer({ open, user, onClose, onEditClient, onCopy, onEmail, onToggle, onDelete, onViewDeveloper }) {
  if (!user) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Avatar sx={{ bgcolor: user.color, width: 56, height: 56, fontWeight: 700 }}>
            {initials(user.name)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{user.name}</Typography>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{user.email}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <RoleBadge role={user.role} />
          <StatusBadge status={user.status} />
        </Stack>

        <Stack spacing={2} sx={{ mb: 3 }}>
          {[
            ['Team', user.team || '—'],
            ['Projects', getUserProjectCount(user)],
            ['Last Active', formatUserLastActive(user)],
            ...(user.projectName ? [['Project', user.projectName]] : []),
          ].map(([label, value]) => (
            <Box key={label}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.25 }}>{label}</Typography>
              <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
            </Box>
          ))}
        </Stack>

        <Stack spacing={1}>
          {user.source === 'developer' ? (
            <Button variant="contained" fullWidth onClick={() => onViewDeveloper(user)}>
              View Developer Profile
            </Button>
          ) : null}
          {user.source === 'client' ? (
            <>
              <Button variant="contained" fullWidth startIcon={<EditIcon />} onClick={() => onEditClient(user)}>
                Edit User
              </Button>
              <Button variant="outlined" fullWidth startIcon={<CopyIcon />} onClick={() => onCopy(resolveClientShareUrl(user))}>
                Copy Share Link
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<EmailIcon />}
                onClick={() => onEmail(user)}
                disabled={!user.email || user.email === '—'}
              >
                Resend Invitation
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={user.status === 'Active' ? <DisableIcon /> : <EnableIcon />}
                onClick={() => onToggle(user)}
              >
                {user.status === 'Active' ? 'Deactivate' : 'Reactivate'}
              </Button>
            </>
          ) : null}
          {user.source !== 'admin' ? (
            <Button variant="outlined" color="error" fullWidth startIcon={<DeleteIcon />} onClick={() => onDelete(user)}>
              Delete User
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Drawer>
  );
}

function UsersTableSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: `${tokens.radius.button}px` }} />
      ))}
    </Box>
  );
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [developers, setDevelopers] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailsUser, setDetailsUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuUser, setMenuUser] = useState(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [bulkWorking, setBulkWorking] = useState(false);

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
      setLoadError('');
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
      setLoadError('Unable to load users.');
      showAlert('Unable to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const users = useMemo(
    () => buildUsersFromSources({ admin, developers, clients, projectsCount: projects.length }),
    [admin, developers, clients, projects.length]
  );

  const kpis = useMemo(() => computeUserKpis(users), [users]);

  const teamOptions = useMemo(
    () => [{ value: '', label: 'All Teams' }, ...uniqueSorted(users.map((u) => u.team).filter((t) => t && t !== '—')).map((t) => ({ value: t, label: t }))],
    [users]
  );

  const roleOptions = useMemo(() => {
    const customRoles = uniqueSorted(users.map((u) => u.role).filter((r) => !USER_ROLES.includes(r)));
    return [
      { value: '', label: 'All Roles' },
      ...USER_ROLES.map((r) => ({ value: r, label: r })),
      ...customRoles.map((r) => ({ value: r, label: r })),
    ];
  }, [users]);

  const statusOptions = useMemo(
    () => [{ value: '', label: 'All Status' }, ...USER_STATUSES.map((s) => ({ value: s, label: s }))],
    []
  );

  const projectOptions = useMemo(
    () => [{ value: '', label: 'All Projects' }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))],
    [projects]
  );

  const filteredUsers = useMemo(
    () =>
      filterUsers(users, {
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        team: teamFilter,
        project: projectFilter,
      }),
    [users, debouncedSearch, roleFilter, statusFilter, teamFilter, projectFilter]
  );

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [debouncedSearch, roleFilter, statusFilter, teamFilter, projectFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const pagedUsers = filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const hasActiveFilters = Boolean(debouncedSearch || roleFilter || statusFilter || teamFilter || projectFilter);

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setTeamFilter('');
    setProjectFilter('');
  };

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.has(u.id)),
    [users, selectedIds]
  );

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageAll = () => {
    const pageIds = pagedUsers.map((u) => u.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      exportUsersCsv(filteredUsers);
      showAlert(`Exported ${filteredUsers.length} users`);
    } catch {
      showAlert('Export failed', 'error');
    } finally {
      setExporting(false);
    }
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
        password: clientForm.passwordProtected && clientForm.password ? clientForm.password : undefined,
      });
      const projectLabel = projects.find((p) => String(p.id) === String(clientForm.projectId))?.name || 'project';
      const to = clientForm.email.trim();
      if (to && created?.token) {
        openClientInviteEmail({
          to,
          clientName: clientForm.clientName.trim(),
          projectName: projectLabel,
          shareUrl: resolveClientShareUrl(created),
          passwordProtected: Boolean(clientForm.passwordProtected),
        });
        showAlert('User invited — opening email to send invite…');
      } else {
        showAlert('Client link created');
      }
      setInviteOpen(false);
      setClientForm(emptyClientForm);
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to create user', 'error');
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
        password: clientForm.passwordProtected ? (clientForm.password.trim() || undefined) : '',
      });
      showAlert('User updated');
      setEditOpen(false);
      setEditingClientId(null);
      setEditHadPassword(false);
      setClientForm(emptyClientForm);
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to update user', 'error');
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
      showAlert('This user has no email on file', 'warning');
      return;
    }
    const shareUrl = resolveClientShareUrl(user);
    if (!shareUrl) {
      showAlert('No share link available', 'warning');
      return;
    }
    openClientInviteEmail({
      to,
      clientName: user.name,
      projectName: user.projectName || user.team,
      shareUrl,
      passwordProtected: Boolean(user.passwordProtected),
    });
    showAlert('Opening your email app…');
  };

  const handleToggleClient = async (user) => {
    if (user.source !== 'client' || !user.raw) return;
    try {
      const next = user.raw.status === 'active' ? 'disabled' : 'active';
      await api.updateClientAccess(user.rawId, { status: next });
      showAlert(next === 'active' ? 'User reactivated' : 'User deactivated');
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const handleRegenerate = async (user) => {
    if (user.source !== 'client') return;
    try {
      const updated = await api.regenerateClientAccess(user.rawId);
      showAlert('Invitation link regenerated');
      const url = resolveClientShareUrl(updated);
      if (url) handleCopy(url);
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
        showAlert('User deleted');
      } else if (deleteTarget.source === 'developer') {
        await api.deleteDeveloper(deleteTarget.rawId);
        showAlert('Developer removed');
      } else {
        showAlert('Administrators cannot be deleted from here', 'warning');
      }
      setDeleteTarget(null);
      setDetailsOpen(false);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const runBulkAction = async (action) => {
    setBulkMenuAnchor(null);
    const targets = selectedUsers.filter((u) => u.source !== 'admin');
    if (!targets.length) {
      showAlert('No eligible users selected', 'warning');
      return;
    }
    setBulkConfirm({ action, count: targets.length, targets });
  };

  const confirmBulkAction = async () => {
    if (!bulkConfirm) return;
    setBulkWorking(true);
    try {
      const { action, targets } = bulkConfirm;
      if (action === 'activate' || action === 'deactivate') {
        const clients = targets.filter((u) => u.source === 'client');
        await Promise.all(
          clients.map((u) =>
            api.updateClientAccess(u.rawId, { status: action === 'activate' ? 'active' : 'disabled' })
          )
        );
        showAlert(`${clients.length} user(s) ${action === 'activate' ? 'activated' : 'deactivated'}`);
      } else if (action === 'delete') {
        await Promise.all(
          targets.map((u) =>
            u.source === 'client'
              ? api.deleteClientAccess(u.rawId)
              : api.deleteDeveloper(u.rawId)
          )
        );
        showAlert(`${targets.length} user(s) deleted`);
      }
      setBulkConfirm(null);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Bulk action failed', 'error');
    } finally {
      setBulkWorking(false);
    }
  };

  const openUserDetails = (user) => {
    setDetailsUser(user);
    setDetailsOpen(true);
  };

  const kpiCards = [
    { label: 'Total Users', value: kpis.total, trend: 'All system users', icon: <UsersIcon />, tint: '#EEF2FF', iconColor: '#4F46E5' },
    { label: 'Active Users', value: kpis.active, trend: 'Currently active', icon: <ActiveIcon />, tint: '#ECFDF5', iconColor: '#16A34A' },
    { label: 'Inactive Users', value: kpis.inactive, trend: 'Disabled accounts', icon: <InactiveIcon />, tint: '#FFF7ED', iconColor: '#EA580C' },
    { label: 'Admins', value: kpis.admins, trend: 'System administrators', icon: <AdminIcon />, tint: '#EFF6FF', iconColor: '#2563EB' },
    { label: 'Pending Invites', value: kpis.pending, trend: 'Invitations sent', icon: <PendingIcon />, tint: '#F5F3FF', iconColor: '#7C3AED' },
  ];

  return (
    <PageContainer maxWidth="100%">
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
        <Link component={RouterLink} to="/dashboard" underline="hover" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Dashboard
        </Link>
        <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>User Management</Typography>
      </Stack>

      <PageHeader
        title="User Management"
        subtitle="Manage users, roles, permissions and access across the system."
        actions={
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={16} /> : <ExportIcon />}
              onClick={handleExport}
              disabled={exporting || filteredUsers.length === 0}
              sx={{ textTransform: 'none', borderRadius: `${tokens.radius.button}px`, fontWeight: 600 }}
            >
              Export
            </Button>
            <Can permission="users.manage">
              <Button
                variant="outlined"
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
                disabled={selectedIds.size === 0}
                sx={{ textTransform: 'none', borderRadius: `${tokens.radius.button}px`, fontWeight: 600 }}
              >
                Bulk Actions{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                sx={{ textTransform: 'none', borderRadius: `${tokens.radius.button}px`, fontWeight: 600 }}
              >
                Add User
              </Button>
            </Can>
          </Stack>
        }
      />

      {loading ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 2, mb: 3 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: `${tokens.radius.card}px` }} />
            ))}
          </Box>
          <UsersTableSkeleton />
        </>
      ) : loadError ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: `${tokens.radius.card}px` }}>
          <Typography sx={{ mb: 2, fontWeight: 600 }}>{loadError}</Typography>
          <Button variant="contained" onClick={loadData}>Try Again</Button>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 2, mb: 3 }}>
            {kpiCards.map((card) => (
              <MetricCard
                key={card.label}
                {...card}
                trendVariant="neutral"
                sx={{
                  minHeight: 132,
                  '&:hover': { transform: 'none', boxShadow: tokens.shadow.card },
                  '& .MuiCardContent-root': { p: 2.5, '&:last-child': { pb: 2.5 } },
                }}
              />
            ))}
          </Box>

          <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, mb: 2, borderRadius: `${tokens.radius.card}px`, borderColor: tokens.colors.border }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }}>
              <TextField
                size="small"
                placeholder="Search by name, email or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} /> }}
                sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: `${tokens.radius.input}px` } }}
                aria-label="Search users"
              />
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                <FilterDropdown label="All Roles" options={roleOptions} value={roleFilter} onChange={setRoleFilter} minWidth={130} />
                <FilterDropdown label="All Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} minWidth={130} />
                <FilterDropdown label="All Teams" options={teamOptions} value={teamFilter} onChange={setTeamFilter} minWidth={130} />
                <FilterDropdown label="All Projects" options={projectOptions} value={projectFilter} onChange={setProjectFilter} minWidth={140} searchable />
                {hasActiveFilters ? (
                  <Button size="small" onClick={clearFilters} sx={{ textTransform: 'none', fontWeight: 600, color: tokens.colors.primary }}>
                    Clear All
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Paper>

          {selectedIds.size > 0 ? (
            <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 2, borderRadius: `${tokens.radius.button}px`, bgcolor: '#EEF2FF', borderColor: '#C7D2FE' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedIds.size} user(s) selected</Typography>
                <Button size="small" onClick={() => setSelectedIds(new Set())} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Clear selection
                </Button>
              </Stack>
            </Paper>
          ) : null}

          {users.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Add a user or adjust your filters to get started."
              actionText="Add User"
              onActionClick={() => setInviteOpen(true)}
              actionPermission="users.manage"
              actionIcon={<AddIcon />}
            />
          ) : filteredUsers.length === 0 ? (
            <EmptyState title="No users match your filters." description="Try different search terms or clear your filters." actionText="Clear Filters" onActionClick={clearFilters} />
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: `${tokens.radius.card}px`, borderColor: tokens.colors.border, overflow: 'auto' }}>
                <Table size="medium" aria-label="Users">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell padding="checkbox" sx={{ bgcolor: '#F8FAFC' }}>
                        <Checkbox
                          size="small"
                          indeterminate={pagedUsers.some((u) => selectedIds.has(u.id)) && !pagedUsers.every((u) => selectedIds.has(u.id))}
                          checked={pagedUsers.length > 0 && pagedUsers.every((u) => selectedIds.has(u.id))}
                          onChange={togglePageAll}
                          inputProps={{ 'aria-label': 'Select all users on page' }}
                        />
                      </TableCell>
                      {['User', 'Email', 'Role', 'Team', 'Status', 'Last Active', 'Projects', 'Actions'].map((col) => (
                        <TableCell key={col} sx={{ fontWeight: 700, color: tokens.colors.textSecondary, whiteSpace: 'nowrap' }}>
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedUsers.map((user) => (
                      <TableRow key={user.id} hover sx={{ cursor: 'pointer' }} onClick={() => openUserDetails(user)}>
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleRow(user.id)}
                            inputProps={{ 'aria-label': `Select ${user.name}` }}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: user.color, width: 40, height: 40, fontWeight: 700, fontSize: '0.875rem' }}>
                              {initials(user.name)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }} noWrap>{user.name}</Typography>
                              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }} noWrap>
                                {user.roleLabel || user.role}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{user.email}</TableCell>
                        <TableCell><RoleBadge role={user.role} /></TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.team || '—'}</TableCell>
                        <TableCell><StatusBadge status={user.status} /></TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {formatUserLastActive(user)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{getUserProjectCount(user, projects.length)}</TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <IconButton size="small" aria-label={`Actions for ${user.name}`} onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuUser(user); }}>
                            <MoreIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <PaginationBar
                page={page}
                pageCount={pageCount}
                totalCount={filteredUsers.length}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(1); }}
                rowsPerPageOptions={[8, 10, 20, 50]}
                itemLabel="users"
              />
            </>
          )}
        </>
      )}

      <UserDetailsDrawer
        open={detailsOpen}
        user={detailsUser}
        onClose={() => setDetailsOpen(false)}
        onEditClient={openEditClient}
        onCopy={handleCopy}
        onEmail={handleEmailClient}
        onToggle={handleToggleClient}
        onDelete={setDeleteTarget}
        onViewDeveloper={(user) => navigate(`/developers/${user.rawId}`)}
      />

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setMenuAnchor(null); openUserDetails(menuUser); }}>
          <ViewIcon fontSize="small" sx={{ mr: 1.5 }} /> View User
        </MenuItem>
        {menuUser?.source === 'client' ? (
          <>
            <MenuItem onClick={() => { openEditClient(menuUser); setMenuAnchor(null); }}>
              <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit User
            </MenuItem>
            <MenuItem onClick={() => { handleEmailClient(menuUser); setMenuAnchor(null); }} disabled={!menuUser.email || menuUser.email === '—'}>
              <EmailIcon fontSize="small" sx={{ mr: 1.5 }} /> Resend Invitation
            </MenuItem>
            <MenuItem onClick={() => { handleToggleClient(menuUser); setMenuAnchor(null); }}>
              {menuUser.status === 'Active' ? 'Deactivate' : 'Reactivate'}
            </MenuItem>
            <MenuItem onClick={() => { handleRegenerate(menuUser); setMenuAnchor(null); }}>
              <ResetIcon fontSize="small" sx={{ mr: 1.5 }} /> Regenerate Link
            </MenuItem>
          </>
        ) : null}
        {menuUser?.source === 'developer' ? (
          <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/developers/${menuUser.rawId}`); }}>
            <ViewIcon fontSize="small" sx={{ mr: 1.5 }} /> View Developer
          </MenuItem>
        ) : null}
        {menuUser?.source !== 'admin' ? (
          <MenuItem onClick={() => { setDeleteTarget(menuUser); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
          </MenuItem>
        ) : null}
      </Menu>

      <Menu anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={() => setAddMenuAnchor(null)}>
        <MenuItem onClick={() => { setAddMenuAnchor(null); setClientForm(emptyClientForm); setInviteOpen(true); }}>
          Invite Client User
        </MenuItem>
        <MenuItem onClick={() => { setAddMenuAnchor(null); setAddDevOpen(true); }}>
          Add Developer User
        </MenuItem>
      </Menu>

      <Menu anchorEl={bulkMenuAnchor} open={Boolean(bulkMenuAnchor)} onClose={() => setBulkMenuAnchor(null)}>
        <MenuItem onClick={() => runBulkAction('activate')}>Activate selected</MenuItem>
        <MenuItem onClick={() => runBulkAction('deactivate')}>Deactivate selected</MenuItem>
        <MenuItem onClick={() => runBulkAction('delete')} sx={{ color: 'error.main' }}>Delete selected</MenuItem>
      </Menu>

      <Dialog open={inviteOpen} onClose={() => !saving && setInviteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Invite User (Client)</DialogTitle>
        <Box component="form" onSubmit={handleCreateClient}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField required label="Full name" value={clientForm.clientName} onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })} autoFocus />
              <TextField label="Team / Company" value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} />
              <TextField type="email" label="Email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} helperText="Required for sending invitations" />
              <TextField required select label="Project access" value={clientForm.projectId} onChange={(e) => setClientForm({ ...clientForm, projectId: e.target.value })}>
                {projects.map((p) => (<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
              </TextField>
              <FormControlLabel control={<Switch checked={clientForm.passwordProtected} onChange={(e) => setClientForm({ ...clientForm, passwordProtected: e.target.checked })} />} label="Password protect link" />
              {clientForm.passwordProtected ? (
                <TextField required type="password" label="Password" value={clientForm.password} onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })} />
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving || !clientForm.projectId}>{saving ? 'Sending…' : 'Send Invitation'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Edit User</DialogTitle>
        <Box component="form" onSubmit={handleUpdateClient}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField required label="Full name" value={clientForm.clientName} onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })} />
              <TextField label="Team / Company" value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} />
              <TextField type="email" label="Email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
              <FormControlLabel control={<Switch checked={clientForm.passwordProtected} onChange={(e) => setClientForm({ ...clientForm, passwordProtected: e.target.checked, password: '' })} />} label="Password protect link" />
              {clientForm.passwordProtected ? (
                <TextField type="password" label={editHadPassword ? 'New password' : 'Password'} value={clientForm.password} onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })} helperText={editHadPassword ? 'Leave blank to keep existing password' : undefined} />
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={addDevOpen} onClose={() => !saving && setAddDevOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Add User (Developer)</DialogTitle>
        <Box component="form" onSubmit={handleCreateDev}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField required label="Full name" value={devForm.name} onChange={(e) => setDevForm({ ...devForm, name: e.target.value })} />
              <TextField type="email" label="Email" value={devForm.email} onChange={(e) => setDevForm({ ...devForm, email: e.target.value })} />
              <TextField label="Avatar color" type="color" value={devForm.color} onChange={(e) => setDevForm({ ...devForm, color: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDevOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Add User'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Delete user?</DialogTitle>
        <DialogContent>
          <Typography>Remove <strong>{deleteTarget?.name}</strong> from the system? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(bulkConfirm)} onClose={() => !bulkWorking && setBulkConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm bulk action</DialogTitle>
        <DialogContent>
          <Typography>
            {bulkConfirm?.action === 'delete'
              ? `Delete ${bulkConfirm?.count} selected user(s)? This cannot be undone.`
              : `${bulkConfirm?.action === 'activate' ? 'Activate' : 'Deactivate'} ${bulkConfirm?.count} selected user(s)?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkConfirm(null)} disabled={bulkWorking}>Cancel</Button>
          <Button variant="contained" color={bulkConfirm?.action === 'delete' ? 'error' : 'primary'} onClick={confirmBulkAction} disabled={bulkWorking}>
            {bulkWorking ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity} variant="filled" sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
