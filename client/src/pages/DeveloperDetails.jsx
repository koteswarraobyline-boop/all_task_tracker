import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Link,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Assignment as TasksIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CompletedIcon,
  ChevronRight as ChevronRightIcon,
  Dashboard as BoardIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  History as ActivityIcon,
  MoreVert as MoreVertIcon,
  Palette as PaletteIcon,
  Schedule as WorkloadIcon,
  TrendingUp as ProgressIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import PageContainer, { PageHeader, MetricCard } from '../components/PageContainer';
import PaginationBar from '../components/PaginationBar';
import FilterDropdown from '../components/TaskBoard/FilterDropdown';
import PerformanceDonutChart from '../components/ProjectDashboard/PerformanceDonutChart';
import {
  PriorityLabelChip,
  ProgressCell,
  StatusBadge,
} from '../components/TaskBoard/Badges';
import { usePermission } from '../hooks/usePermission';
import { tokens } from '../theme';
import { getTaskProgressPercent } from '../utils/taskProgress';
import {
  API_STATUSES,
  PRIORITY_OPTIONS,
  getOverdueDays,
  getStatusDisplayLabel,
  shouldShowOverdueAlert,
} from '../utils/taskManagementConstants';
import {
  DEVELOPER_STATUSES,
  DEFAULT_ROLES,
  DEFAULT_TEAMS,
  WORKLOAD_CAPACITY_HOURS,
  WORKLOAD_CAPACITY_TASKS,
  buildRecentActivityFromTasks,
  buildTaskStatusBreakdown,
  buildUpcomingDeadlines,
  formatDeveloperEmployeeId,
  formatDueDateLabel,
  formatJoinedDate,
  formatLastActive,
  getAvailabilityLabel,
  getInitials,
  getProgressLabel,
  getRoleBadgeStyle,
  getStatusStyle,
  getWorkloadBarColor,
  getWorkloadLabel,
  parseSkillsList,
  sortDeveloperProjects,
  uniqueSorted,
} from '../utils/developerHelpers';

const PRESET_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#ff9800', '#ff5722', '#795548', '#607d8b',
];

const TAB_KEYS = ['overview', 'tasks', 'completed', 'activity', 'workload', 'profile', 'documents'];

const STATUS_CHART_COLORS = {
  'Not Started': '#94A3B8',
  Pending: '#EAB308',
  'In Progress': '#2563EB',
  Testing: '#9333EA',
  Completed: '#22C55E',
  'On Hold': '#F59E0B',
  Blocked: '#EF4444',
};

function TabPanel({ value, tabKey, children }) {
  if (value !== tabKey) return null;
  return <Box role="tabpanel" aria-labelledby={`dev-tab-${tabKey}`}>{children}</Box>;
}

function SectionCard({ title, children, action, sx = {} }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: `${tokens.radius.card}px`,
        borderColor: tokens.colors.border,
        height: '100%',
        ...sx,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem' }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

function WorkloadRing({ percent, color }) {
  const p = Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: 48, height: 48 }}>
      <CircularProgress
        variant="determinate"
        value={p}
        size={48}
        thickness={4}
        sx={{ color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
        aria-hidden
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontSize: '0.625rem', fontWeight: 800 }}>{p}%</Typography>
      </Box>
    </Box>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <Skeleton variant="rounded" height={200} sx={{ borderRadius: `${tokens.radius.card}px`, mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(6,1fr)' }, gap: 2, mb: 3 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: `${tokens.radius.card}px` }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={400} sx={{ borderRadius: `${tokens.radius.card}px` }} />
    </>
  );
}

function DeveloperTaskTable({
  tasks,
  columns,
  emptyTitle,
  emptyDescription,
}) {
  if (!tasks.length) {
    return (
      <Box sx={{ py: 6 }}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
        />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: `${tokens.radius.card}px`, borderColor: tokens.colors.border }}>
      <Table size="medium" aria-label="Developer tasks">
        <TableHead>
          <TableRow sx={{ bgcolor: '#F8FAFC' }}>
            {columns.map((col) => (
              <TableCell key={col} sx={{ fontWeight: 700, color: tokens.colors.textSecondary, whiteSpace: 'nowrap' }}>
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => {
            const overdue = shouldShowOverdueAlert(task);
            const overdueDays = getOverdueDays(task);
            return (
              <TableRow key={task.id} hover>
                <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }} noWrap title={task.taskName}>
                    {task.taskName}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: '0.875rem' }}>{task.projectName || '—'}</TableCell>
                {columns.includes('Phase') ? (
                  <TableCell sx={{ fontSize: '0.875rem' }}>{task.phase || '—'}</TableCell>
                ) : null}
                {columns.includes('Module') ? (
                  <TableCell sx={{ fontSize: '0.875rem' }}>{task.module || '—'}</TableCell>
                ) : null}
                {columns.includes('Status') ? (
                  <TableCell><StatusBadge status={task.status} /></TableCell>
                ) : null}
                {columns.includes('Priority') ? (
                  <TableCell><PriorityLabelChip priority={task.priority} /></TableCell>
                ) : null}
                {columns.includes('Progress') ? (
                  <TableCell><ProgressCell task={task} width={72} /></TableCell>
                ) : null}
                {columns.includes('Due Date') ? (
                  <TableCell sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    {formatDueDateLabel(task.dueDate)}
                  </TableCell>
                ) : null}
                {columns.includes('Days Late') ? (
                  <TableCell sx={{ fontWeight: 600, color: overdue ? 'error.main' : 'text.secondary' }}>
                    {overdue ? `${overdueDays}d` : '—'}
                  </TableCell>
                ) : null}
                {columns.includes('Completed') ? (
                  <TableCell sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    {formatLastActive({ updatedAt: task.updatedAt })}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function DeveloperDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = usePermission('developer.manage');
  const canAssign = usePermission('task.assign');

  const activeTab = TAB_KEYS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview';

  const [developer, setDeveloper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [moreAnchor, setMoreAnchor] = useState(null);

  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [team, setTeam] = useState('');
  const [status, setStatus] = useState('Active');
  const [skills, setSkills] = useState('');
  const [color, setColor] = useState('#1976d2');
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [taskRowsPerPage, setTaskRowsPerPage] = useState(10);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedRowsPerPage, setCompletedRowsPerPage] = useState(10);
  const [activityPage, setActivityPage] = useState(1);
  const activityRowsPerPage = 10;

  const fetchDeveloper = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getDeveloper(id);
      setDeveloper(data);
    } catch {
      setLoadError('Unable to load developer details.');
      setDeveloper(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDeveloper();
  }, [fetchDeveloper]);

  const devTasks = developer?.tasks;

  const activeTasksList = useMemo(
    () => (devTasks || []).filter((t) => t.status !== 'Completed'),
    [devTasks]
  );

  const completedTasksList = useMemo(
    () => [...(devTasks || []).filter((t) => t.status === 'Completed')].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    ),
    [devTasks]
  );

  const overdueCount = useMemo(
    () => (devTasks || []).filter((t) => shouldShowOverdueAlert(t)).length,
    [devTasks]
  );

  const avgProgress = useMemo(() => {
    if (!activeTasksList.length) return 0;
    const sum = activeTasksList.reduce((acc, t) => acc + getTaskProgressPercent(t), 0);
    return Math.round(sum / activeTasksList.length);
  }, [activeTasksList]);

  const availability = Math.max(0, 100 - (developer?.workloadPercent ?? 0));
  const statusBreakdown = useMemo(() => buildTaskStatusBreakdown(devTasks || []), [devTasks]);
  const recentActivity = useMemo(() => buildRecentActivityFromTasks(devTasks || [], 50), [devTasks]);
  const upcomingDeadlines = useMemo(() => buildUpcomingDeadlines(devTasks || []), [devTasks]);
  const projects = useMemo(() => sortDeveloperProjects(developer?.projects || []), [developer]);
  const skillsList = parseSkillsList(developer?.skills);

  const statusOptions = useMemo(
    () => [{ value: '', label: 'All Status' }, ...API_STATUSES.filter((s) => s !== 'Completed').map((s) => ({ value: s, label: getStatusDisplayLabel(s) }))],
    []
  );

  const priorityOptions = useMemo(
    () => [{ value: '', label: 'All Priority' }, ...PRIORITY_OPTIONS.map((p) => ({ value: p.label, label: p.label }))],
    []
  );

  const projectOptions = useMemo(
    () => [{ value: '', label: 'All Projects' }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))],
    [projects]
  );

  const filteredActiveTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return activeTasksList.filter((task) => {
      if (q) {
        const hay = [task.taskName, task.projectName, task.module, task.phase, task.priority, task.status]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter && task.status !== statusFilter) return false;
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (projectFilter && String(task.projectId) !== projectFilter) return false;
      if (overdueOnly && !shouldShowOverdueAlert(task)) return false;
      return true;
    });
  }, [activeTasksList, taskSearch, statusFilter, priorityFilter, projectFilter, overdueOnly]);

  const pagedActiveTasks = useMemo(() => {
    const start = (taskPage - 1) * taskRowsPerPage;
    return filteredActiveTasks.slice(start, start + taskRowsPerPage);
  }, [filteredActiveTasks, taskPage, taskRowsPerPage]);

  const pagedCompletedTasks = useMemo(() => {
    const start = (completedPage - 1) * completedRowsPerPage;
    return completedTasksList.slice(start, start + completedRowsPerPage);
  }, [completedTasksList, completedPage, completedRowsPerPage]);

  const pagedActivity = useMemo(() => {
    const start = (activityPage - 1) * activityRowsPerPage;
    return recentActivity.slice(start, start + activityRowsPerPage);
  }, [recentActivity, activityPage]);

  const primaryProject = projects.find((p) => p.activeTasks > 0) || projects[0];

  const handleTabChange = (_, next) => {
    setSearchParams({ tab: next }, { replace: true });
  };

  const openEditForm = () => {
    if (!developer) return;
    setName(developer.name || '');
    setEmail(developer.email || '');
    setRole(developer.role || '');
    setTeam(developer.team || '');
    setStatus(developer.status || 'Active');
    setSkills(developer.skills || '');
    setColor(developer.color || '#1976d2');
    setFormErrors({});
    setOpenForm(true);
  };

  const handleSaveDeveloper = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await api.updateDeveloper(id, {
        name: name.trim(),
        email: email.trim() || null,
        role: role || null,
        team: team || null,
        status,
        skills: skills.trim() || null,
        color,
      });
      setOpenForm(false);
      setSnack({ open: true, message: 'Developer updated successfully.', severity: 'success' });
      fetchDeveloper();
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || 'Failed to update developer.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setMoreAnchor(null);
    try {
      await api.updateDeveloper(id, { status: 'Inactive' });
      setSnack({ open: true, message: 'Developer deactivated.', severity: 'success' });
      fetchDeveloper();
    } catch {
      setSnack({ open: true, message: 'Failed to deactivate developer.', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteDeveloper(id);
      navigate('/developers');
    } catch {
      setSnack({ open: true, message: 'Failed to delete developer.', severity: 'error' });
      setDeleting(false);
      setOpenDelete(false);
    }
  };

  const handleAssignTask = () => {
    if (primaryProject) {
      navigate(`/projects/${primaryProject.id}/tasks`);
    } else {
      setSnack({ open: true, message: 'No project tasks available to assign.', severity: 'warning' });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <ProfileSkeleton />
      </PageContainer>
    );
  }

  if (loadError || !developer) {
    return (
      <PageContainer>
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: `${tokens.radius.card}px` }}>
          <Typography sx={{ mb: 2, fontWeight: 600 }}>{loadError || 'Developer not found.'}</Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate('/developers')}>
              Back to Developers
            </Button>
            <Button variant="contained" onClick={fetchDeveloper}>Try Again</Button>
          </Stack>
        </Paper>
      </PageContainer>
    );
  }

  const roleStyle = getRoleBadgeStyle(developer.role);
  const devStatusStyle = getStatusStyle(developer.status || 'Active');
  const workload = developer.workloadPercent ?? 0;
  const workloadColor = getWorkloadBarColor(workload);

  const kpiCards = [
    {
      label: 'Workload',
      value: `${workload}%`,
      trend: getWorkloadLabel(workload),
      trendVariant: workload > 90 ? 'warning' : 'neutral',
      icon: <WorkloadRing percent={workload} color={workloadColor} />,
      tint: '#F5F3FF',
      iconColor: tokens.colors.primary,
    },
    {
      label: 'Active Tasks',
      value: developer.activeTasks ?? 0,
      trend: 'Assigned',
      trendVariant: 'neutral',
      icon: <TasksIcon />,
      tint: '#EFF6FF',
      iconColor: '#2563EB',
    },
    {
      label: 'Completed Tasks',
      value: developer.completedTasks ?? 0,
      trend: 'Done',
      trendVariant: 'neutral',
      icon: <CompletedIcon />,
      tint: '#ECFDF5',
      iconColor: '#16A34A',
    },
    {
      label: 'Overdue Tasks',
      value: overdueCount,
      trend: overdueCount ? 'Needs attention' : 'On track',
      trendVariant: overdueCount ? 'warning' : 'neutral',
      icon: <OverdueIcon />,
      tint: '#FEF2F2',
      iconColor: '#EF4444',
    },
    {
      label: 'Availability',
      value: `${availability}%`,
      trend: getAvailabilityLabel(availability),
      trendVariant: 'neutral',
      icon: <WorkloadIcon />,
      tint: '#EFF6FF',
      iconColor: '#2563EB',
    },
    {
      label: 'Avg. Task Progress',
      value: `${avgProgress}%`,
      trend: getProgressLabel(avgProgress),
      trendVariant: 'neutral',
      icon: <ProgressIcon />,
      tint: '#FFF7ED',
      iconColor: '#EA580C',
    },
  ];

  const taskColumns = ['Task', 'Project', 'Phase', 'Module', 'Status', 'Priority', 'Progress', 'Due Date', 'Days Late'];
  const completedColumns = ['Task', 'Project', 'Phase', 'Module', 'Priority', 'Progress', 'Completed'];

  return (
    <PageContainer>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
        <Link component={RouterLink} to="/dashboard" underline="hover" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Dashboard
        </Link>
        <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Link component={RouterLink} to="/developers" underline="hover" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Developers
        </Link>
        <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{developer.name}</Typography>
      </Stack>

      <PageHeader
        title="Developer Details"
        subtitle="View detailed information about the developer and their performance."
        back={
          <IconButton onClick={() => navigate('/developers')} aria-label="Back to developers" sx={{ flexShrink: 0 }}>
            <BackIcon />
          </IconButton>
        }
        actions={
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {canManage ? (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={openEditForm}
                sx={{ textTransform: 'none', borderRadius: `${tokens.radius.button}px`, fontWeight: 600 }}
              >
                Edit Developer
              </Button>
            ) : null}
            {canAssign ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAssignTask}
                sx={{ textTransform: 'none', borderRadius: `${tokens.radius.button}px`, fontWeight: 600 }}
              >
                Assign Task
              </Button>
            ) : null}
            {canManage ? (
              <>
                <IconButton aria-label="More options" onClick={(e) => setMoreAnchor(e.currentTarget)}>
                  <MoreVertIcon />
                </IconButton>
                <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
                  {developer.status !== 'Inactive' ? (
                    <MenuItem onClick={handleDeactivate}>Deactivate</MenuItem>
                  ) : null}
                  <MenuItem
                    onClick={() => { setMoreAnchor(null); setOpenDelete(true); }}
                    sx={{ color: 'error.main' }}
                  >
                    Delete Developer
                  </MenuItem>
                </Menu>
              </>
            ) : null}
          </Stack>
        }
      />

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          borderRadius: `${tokens.radius.card}px`,
          borderColor: tokens.colors.border,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} lg={5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'center', sm: 'flex-start' }}>
              <Avatar sx={{ bgcolor: developer.color, width: 88, height: 88, fontSize: '1.75rem', fontWeight: 700 }}>
                {getInitials(developer.name)}
              </Avatar>
              <Box sx={{ minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700, mb: 1 }}>
                  {developer.name}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  <Chip
                    label={developer.status || 'Active'}
                    size="small"
                    sx={{ bgcolor: devStatusStyle.bgcolor, color: devStatusStyle.color, fontWeight: 600 }}
                  />
                  {developer.role ? (
                    <Chip label={developer.role} size="small" sx={{ ...roleStyle, fontWeight: 600 }} />
                  ) : null}
                </Stack>
                {developer.email ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', mb: 0.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                    <EmailIcon sx={{ fontSize: 18 }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>{developer.email}</Typography>
                  </Stack>
                ) : null}
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} lg={7}>
            <Grid container spacing={2}>
              {[
                ['Employee ID', formatDeveloperEmployeeId(developer.id)],
                ['Team', developer.team || '—'],
                ['Date Joined', formatJoinedDate(developer.createdAt)],
                ['Last Active', formatLastActive(developer)],
              ].map(([label, value]) => (
                <Grid item xs={6} sm={4} key={label}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{value}</Typography>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>Skills</Typography>
                {skillsList.length ? (
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {skillsList.map((skill) => (
                      <Chip key={skill} label={skill} size="small" sx={{ fontWeight: 600, bgcolor: '#EEF2FF', color: tokens.colors.primary }} />
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>—</Typography>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {kpiCards.map((card) => (
          <MetricCard
            key={card.label}
            {...card}
            sx={{
              minHeight: 132,
              '&:hover': { transform: 'none', boxShadow: tokens.shadow.card },
              '& .MuiCardContent-root': { p: 2.5, '&:last-child': { pb: 2.5 } },
            }}
          />
        ))}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: `${tokens.radius.card}px`, borderColor: tokens.colors.border, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Developer detail tabs"
          sx={{
            px: 1,
            borderBottom: '1px solid',
            borderColor: tokens.colors.border,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
            '& .Mui-selected': { color: tokens.colors.primary },
            '& .MuiTabs-indicator': { bgcolor: tokens.colors.primary, height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab label="Overview" value="overview" id="dev-tab-overview" />
          <Tab label={`Tasks (${developer.activeTasks ?? 0})`} value="tasks" id="dev-tab-tasks" />
          <Tab label={`Completed (${developer.completedTasks ?? 0})`} value="completed" id="dev-tab-completed" />
          <Tab label="Activity" value="activity" id="dev-tab-activity" />
          <Tab label="Workload" value="workload" id="dev-tab-workload" />
          <Tab label="Profile" value="profile" id="dev-tab-profile" />
          <Tab label="Documents" value="documents" id="dev-tab-documents" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} tabKey="overview">
        <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
          <Grid item xs={12} md={4}>
            <PerformanceDonutChart
              title="Task Progress"
              data={statusBreakdown}
              colorMap={STATUS_CHART_COLORS}
              emptyMessage="No assigned tasks yet."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SectionCard title="Workload Trend (Last 6 Weeks)">
              <Box sx={{ py: 2 }}>
                <EmptyState
                  title="Workload history is not available yet."
                  description="Historical workload tracking will appear here once enough activity data is collected."
                />
              </Box>
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <SectionCard title="About">
              <Stack spacing={1.5}>
                {[
                  ['Primary Role', developer.role || '—'],
                  ['Team', developer.team || '—'],
                  ['Date Joined', formatJoinedDate(developer.createdAt)],
                  ['Open Estimated Hours', developer.openEstimatedHours ? `${developer.openEstimatedHours}h / ${WORKLOAD_CAPACITY_HOURS}h capacity` : '—'],
                  ['Active Projects', projects.length ? projects.map((p) => p.name).join(', ') : '—'],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{value}</Typography>
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>

        <Grid container spacing={2.5}>
          <Grid item xs={12} md={4}>
            <SectionCard
              title="Recent Activity"
              action={
                recentActivity.length > 5 ? (
                  <Button size="small" onClick={() => handleTabChange(null, 'activity')} sx={{ textTransform: 'none', fontWeight: 600 }}>
                    View all activity
                  </Button>
                ) : null
              }
            >
              {recentActivity.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No recent activity</Typography>
              ) : (
                <Stack spacing={2} divider={<Divider flexItem />}>
                  {recentActivity.slice(0, 5).map((item) => (
                    <Stack key={item.id} direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          bgcolor: item.type === 'completed' ? '#ECFDF5' : '#EEF2FF',
                          color: item.type === 'completed' ? '#16A34A' : tokens.colors.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {item.type === 'completed' ? <CompletedIcon sx={{ fontSize: 18 }} /> : <ActivityIcon sx={{ fontSize: 18 }} />}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.description}</Typography>
                        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {item.detail ? `${item.detail} · ` : ''}{item.formattedTime}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <SectionCard
              title="Upcoming Deadlines"
              action={
                upcomingDeadlines.length ? (
                  <Button size="small" onClick={() => handleTabChange(null, 'tasks')} sx={{ textTransform: 'none', fontWeight: 600 }}>
                    View all deadlines
                  </Button>
                ) : null
              }
            >
              {upcomingDeadlines.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No upcoming deadlines</Typography>
              ) : (
                <Stack spacing={2}>
                  {upcomingDeadlines.map((task) => {
                    const urgencyColor = task.daysLeft <= 7 ? '#EF4444' : task.daysLeft <= 14 ? '#F59E0B' : tokens.colors.textSecondary;
                    return (
                      <Box key={task.id}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{task.taskName}</Typography>
                        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>
                          Due: {formatDueDateLabel(task.dueDate)}
                        </Typography>
                        <Chip
                          label={`${task.daysLeft}d left`}
                          size="small"
                          sx={{ mt: 0.75, fontWeight: 700, bgcolor: `${urgencyColor}18`, color: urgencyColor }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <SectionCard title="Quick Actions">
              <Stack spacing={1}>
                {[
                  {
                    icon: <BoardIcon />,
                    title: 'View Task Board',
                    description: 'See all tasks assigned to this developer',
                    onClick: () => primaryProject && navigate(`/projects/${primaryProject.id}/tasks`),
                    disabled: !primaryProject,
                  },
                  {
                    icon: <WorkloadIcon />,
                    title: 'View Workload',
                    description: 'Detailed workload and capacity view',
                    onClick: () => handleTabChange(null, 'workload'),
                  },
                  {
                    icon: <CalendarIcon />,
                    title: 'View Calendar',
                    description: "Project calendar for this developer's tasks",
                    onClick: () => primaryProject && navigate(`/projects/${primaryProject.id}/calendar`),
                    disabled: !primaryProject,
                  },
                ].map((action) => (
                  <Paper
                    key={action.title}
                    variant="outlined"
                    onClick={action.disabled ? undefined : action.onClick}
                    sx={{
                      p: 1.5,
                      borderRadius: `${tokens.radius.button}px`,
                      borderColor: tokens.colors.border,
                      cursor: action.disabled ? 'default' : 'pointer',
                      opacity: action.disabled ? 0.55 : 1,
                      '&:hover': action.disabled ? {} : { borderColor: tokens.colors.primary, bgcolor: '#F8FAFC' },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ color: tokens.colors.primary }}>{action.icon}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{action.title}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{action.description}</Typography>
                      </Box>
                      <ChevronRightIcon sx={{ color: 'text.secondary' }} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} tabKey="tasks">
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: `${tokens.radius.card}px`, borderColor: tokens.colors.border }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }}>
            <TextField
              size="small"
              placeholder="Search tasks..."
              value={taskSearch}
              onChange={(e) => { setTaskSearch(e.target.value); setTaskPage(1); }}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: `${tokens.radius.input}px` } }}
            />
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <FilterDropdown label="Status" options={statusOptions} value={statusFilter} onChange={(v) => { setStatusFilter(v); setTaskPage(1); }} minWidth={130} />
              <FilterDropdown label="Priority" options={priorityOptions} value={priorityFilter} onChange={(v) => { setPriorityFilter(v); setTaskPage(1); }} minWidth={130} />
              <FilterDropdown label="Project" options={projectOptions} value={projectFilter} onChange={(v) => { setProjectFilter(v); setTaskPage(1); }} minWidth={140} searchable />
              <FilterDropdown
                label="Overdue"
                options={[{ value: '', label: 'All' }, { value: 'yes', label: 'Overdue only' }]}
                value={overdueOnly ? 'yes' : ''}
                onChange={(v) => { setOverdueOnly(v === 'yes'); setTaskPage(1); }}
                minWidth={120}
              />
            </Stack>
          </Stack>
        </Paper>
        <DeveloperTaskTable
          tasks={pagedActiveTasks}
          columns={taskColumns}
          emptyTitle="No active tasks assigned"
          emptyDescription={filteredActiveTasks.length === 0 && activeTasksList.length > 0 ? 'Try adjusting your filters.' : 'Tasks assigned to this developer will appear here.'}
        />
        {filteredActiveTasks.length > 0 ? (
          <PaginationBar
            page={taskPage}
            pageCount={Math.max(1, Math.ceil(filteredActiveTasks.length / taskRowsPerPage))}
            totalCount={filteredActiveTasks.length}
            rowsPerPage={taskRowsPerPage}
            onPageChange={setTaskPage}
            onRowsPerPageChange={(v) => { setTaskRowsPerPage(v); setTaskPage(1); }}
            itemLabel="tasks"
          />
        ) : null}
      </TabPanel>

      <TabPanel value={activeTab} tabKey="completed">
        <DeveloperTaskTable
          tasks={pagedCompletedTasks}
          columns={completedColumns}
          emptyTitle="No completed tasks yet"
          emptyDescription="Completed tasks for this developer will appear here."
        />
        {completedTasksList.length > 0 ? (
          <PaginationBar
            page={completedPage}
            pageCount={Math.max(1, Math.ceil(completedTasksList.length / completedRowsPerPage))}
            totalCount={completedTasksList.length}
            rowsPerPage={completedRowsPerPage}
            onPageChange={setCompletedPage}
            onRowsPerPageChange={(v) => { setCompletedRowsPerPage(v); setCompletedPage(1); }}
            itemLabel="tasks"
          />
        ) : null}
      </TabPanel>

      <TabPanel value={activeTab} tabKey="activity">
        {recentActivity.length === 0 ? (
          <Box sx={{ py: 4 }}>
            <EmptyState title="No recent activity" description="Task updates for this developer will appear here." />
          </Box>
        ) : (
          <>
            <SectionCard title="Activity History">
              <Stack spacing={2} divider={<Divider flexItem />}>
                {pagedActivity.map((item) => (
                  <Stack key={`${item.id}-${item.timestamp}`} direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        bgcolor: item.type === 'completed' ? '#ECFDF5' : '#EEF2FF',
                        color: item.type === 'completed' ? '#16A34A' : tokens.colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.type === 'completed' ? <CompletedIcon sx={{ fontSize: 18 }} /> : <ActivityIcon sx={{ fontSize: 18 }} />}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{item.description}</Typography>
                      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                        {item.detail ? `${item.detail} · ` : ''}{item.formattedTime}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
            <PaginationBar
              page={activityPage}
              pageCount={Math.max(1, Math.ceil(recentActivity.length / activityRowsPerPage))}
              totalCount={recentActivity.length}
              rowsPerPage={activityRowsPerPage}
              onPageChange={setActivityPage}
              onRowsPerPageChange={() => {}}
              rowsPerPageOptions={[10]}
              itemLabel="events"
            />
          </>
        )}
      </TabPanel>

      <TabPanel value={activeTab} tabKey="workload">
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Current Workload">
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontWeight: 700, fontSize: '2rem' }}>{workload}%</Typography>
                  <Chip label={getWorkloadLabel(workload)} sx={{ fontWeight: 700 }} />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, workload)}
                  sx={{
                    height: 10,
                    borderRadius: 999,
                    bgcolor: '#E5E7EB',
                    '& .MuiLinearProgress-bar': { bgcolor: workloadColor, borderRadius: 999 },
                  }}
                />
                <Grid container spacing={2}>
                  {[
                    ['Capacity basis', developer.openEstimatedHours > 0 ? `${WORKLOAD_CAPACITY_HOURS}h / week` : `${WORKLOAD_CAPACITY_TASKS} tasks`],
                    ['Open estimated hours', developer.openEstimatedHours ? `${developer.openEstimatedHours}h` : '—'],
                    ['Active tasks', developer.activeTasks ?? 0],
                    ['Overdue tasks', overdueCount],
                    ['Availability', `${availability}% (${getAvailabilityLabel(availability)})`],
                  ].map(([label, value]) => (
                    <Grid item xs={6} key={label}>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
                      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Workload Trend">
              <Box sx={{ py: 2 }}>
                <EmptyState
                  title="Workload history is not available yet."
                  description="Historical workload tracking will appear here once enough activity data is collected."
                />
              </Box>
            </SectionCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} tabKey="profile">
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Personal Information">
              <Stack spacing={1.5}>
                {[
                  ['Full Name', developer.name],
                  ['Email', developer.email || '—'],
                  ['Status', developer.status || 'Active'],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Employment Information">
              <Stack spacing={1.5}>
                {[
                  ['Employee ID', formatDeveloperEmployeeId(developer.id)],
                  ['Role', developer.role || '—'],
                  ['Team', developer.team || '—'],
                  ['Date Joined', formatJoinedDate(developer.createdAt)],
                  ['Last Active', formatLastActive(developer)],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          </Grid>
          <Grid item xs={12}>
            <SectionCard title="Skills">
              {skillsList.length ? (
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {skillsList.map((skill) => (
                    <Chip key={skill} label={skill} sx={{ fontWeight: 600, bgcolor: '#EEF2FF', color: tokens.colors.primary }} />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>No skills listed</Typography>
              )}
              {canManage ? (
                <Button startIcon={<EditIcon />} onClick={openEditForm} sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}>
                  Edit Profile
                </Button>
              ) : null}
            </SectionCard>
          </Grid>
          {projects.length ? (
            <Grid item xs={12}>
              <SectionCard title="Projects">
                <Stack spacing={1}>
                  {projects.map((project) => (
                    <Paper
                      key={project.id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: `${tokens.radius.button}px`, cursor: 'pointer', '&:hover': { borderColor: tokens.colors.primary } }}
                      onClick={() => navigate(`/projects/${project.id}/tasks`)}
                    >
                      <Typography sx={{ fontWeight: 700 }}>{project.name}</Typography>
                      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                        {project.activeTasks} active · {project.totalTasks} total tasks
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </SectionCard>
            </Grid>
          ) : null}
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} tabKey="documents">
        <Box sx={{ py: 6 }}>
          <EmptyState
            title="Document management is not available yet."
            description="Developer documents will appear here when document support is added to the application."
          />
        </Box>
      </TabPanel>

      <Dialog open={openForm} onClose={() => !saving && setOpenForm(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveDeveloper}>
          <DialogTitle sx={{ fontWeight: 700 }}>Edit Developer</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required margin="normal" error={Boolean(formErrors.name)} helperText={formErrors.name} />
            <TextField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth margin="normal" error={Boolean(formErrors.email)} helperText={formErrors.email} />
            <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)} fullWidth margin="normal">
              <MenuItem value="">None</MenuItem>
              {uniqueSorted([...DEFAULT_ROLES, role].filter(Boolean)).map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Team" value={team} onChange={(e) => setTeam(e.target.value)} fullWidth margin="normal">
              <MenuItem value="">None</MenuItem>
              {uniqueSorted([...DEFAULT_TEAMS, team].filter(Boolean)).map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} fullWidth margin="normal" required>
              {DEVELOPER_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField label="Skills" value={skills} onChange={(e) => setSkills(e.target.value)} fullWidth margin="normal" placeholder="e.g. React, Node.js, TypeScript" />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Avatar Color</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {PRESET_COLORS.map((c) => (
                <Tooltip key={c} title={c}>
                  <IconButton
                    size="small"
                    onClick={() => setColor(c)}
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: c,
                      border: color === c ? '3px solid #0F172A' : '2px solid transparent',
                      '&:hover': { bgcolor: c, opacity: 0.85 },
                    }}
                    aria-label={`Select color ${c}`}
                  >
                    {color === c ? <PaletteIcon sx={{ color: '#fff', fontSize: 16 }} /> : null}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenForm(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={openDelete} onClose={() => !deleting && setOpenDelete(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Developer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{developer.name}</strong>? Assigned tasks will remain but lose this developer assignment.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
