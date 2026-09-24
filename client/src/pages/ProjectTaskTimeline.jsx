import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  TextField,
  MenuItem,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
  Assignment as TotalIcon,
  CheckCircle as CompletedIcon,
  Timelapse as ProgressIcon,
  Code as DevIcon,
  BugReport as TestingIcon,
  Block as BlockedIcon,
  WarningAmber as OverdueIcon,
  DonutLarge as PctIcon,
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
  Timeline as TimelineIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as AnalyticsIcon,
  BarChartOutlined as ChartIcon,
  Groups as TeamIcon,
  EventBusy as DeadlineIcon,
} from '@mui/icons-material';
import api from '../services/api';
import ProjectGantt from '../components/ProjectGantt/ProjectGantt';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';
import EmptyState from '../components/EmptyState';
import PageContainer, { PageHeader } from '../components/PageContainer';
import { useProjectId } from '../hooks/useProjectId';
import ProjectPlanTopbar from '../components/ProjectPlanTopbar';
import { ViewAsBanner } from '../components/ProjectWorkspaceBar';
import { ProjectWorkspaceProvider } from '../context/ProjectWorkspaceContext';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../context/RoleContext';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { tokens, planPageSx } from '../theme';
import {
  STATUS_FILTER_OPTIONS,
  PRIORITY_OPTIONS,
  VIEW_MODES,
  filterAndSortTasks,
  computeTaskStats,
  computeProjectProgress,
  isOverdue,
  isDueThisWeek,
  startOfWeek,
  endOfWeek,
  toDateOnly,
  isWorkTask,
} from '../utils/taskManagementConstants';

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: `${tokens.radius.button}px`,
};

const DEFAULT_FILTERS = {
  statusKey: 'all',
  priorities: [],
  developerId: '',
  search: '',
  quickFilter: '',
  sortBy: 'dueDate',
  sortOrder: 'asc',
  projectFilter: '',
  dateFrom: '',
  dateTo: '',
};

const SUMMARY_CARDS = [
  { key: 'total', label: 'Total Tasks', icon: TotalIcon, color: tokens.colors.textSecondary, tint: '#F1F5F9' },
  { key: 'completed', label: 'Completed', icon: CompletedIcon, color: tokens.colors.success, tint: tokens.colors.successBg },
  { key: 'inProgress', label: 'In Progress', icon: ProgressIcon, color: tokens.colors.primary, tint: tokens.colors.primarySoft },
  { key: 'development', label: 'In Development', icon: DevIcon, color: tokens.colors.primary, tint: tokens.colors.primarySoft },
  { key: 'testing', label: 'Testing', icon: TestingIcon, color: tokens.colors.primary, tint: tokens.colors.primarySoft },
  { key: 'blocked', label: 'Blocked', icon: BlockedIcon, color: tokens.colors.warning, tint: tokens.colors.warningBg },
  { key: 'overdue', label: 'Overdue', icon: OverdueIcon, color: tokens.colors.danger, tint: tokens.colors.dangerBg },
  { key: 'completionPct', label: 'Completion', icon: PctIcon, color: tokens.colors.primary, tint: tokens.colors.primarySoft, isPct: true },
];

function SummaryCard({ label, value, pct, icon: Icon, color, tint }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: `${tokens.radius.card}px`,
        border: '1px solid',
        borderColor: tokens.colors.border,
        bgcolor: tokens.colors.card,
        boxShadow: tokens.shadow.card,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: `${tokens.radius.button}px`,
            bgcolor: tint,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: tokens.colors.textSecondary, mb: 0.25 }}>
            {label}
          </Typography>
          <Typography
            sx={{
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: tokens.colors.text,
            }}
          >
            {value}
          </Typography>
          {pct != null && (
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color, mt: 0.35 }}>
              {pct}% of total
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function AnalyticsPanel({ tasks, developers, projectProgress }) {
  const work = useMemo(() => (tasks || []).filter(isWorkTask), [tasks]);
  const completedThisWeek = useMemo(() => {
    const start = startOfWeek();
    const end = endOfWeek();
    return work.filter((t) => {
      if (t.status !== 'Completed') return false;
      const doneAt = t.updatedAt || t.dueDate;
      if (!doneAt) return false;
      const d = new Date(doneAt);
      return d >= start && d <= end;
    }).length;
  }, [work]);

  const upcoming = useMemo(() => {
    return work
      .filter((t) => t.status !== 'Completed' && t.status !== 'On Hold' && isDueThisWeek(t))
      .sort((a, b) => String(toDateOnly(a.dueDate) || '').localeCompare(String(toDateOnly(b.dueDate) || '')))
      .slice(0, 5);
  }, [work]);

  const overdueList = useMemo(() => {
    return work.filter((t) => isOverdue(t)).slice(0, 5);
  }, [work]);

  const workload = useMemo(() => {
    const map = new Map();
    work.forEach((t) => {
      const dev =
        t.developer ||
        developers.find((d) => d.id === t.developerId) ||
        null;
      const name = getDeveloperDisplayName(dev);
      if (!map.has(name)) map.set(name, { name, total: 0, open: 0, done: 0 });
      const row = map.get(name);
      row.total += 1;
      if (t.status === 'Completed') row.done += 1;
      else row.open += 1;
    });
    return [...map.values()].sort((a, b) => b.open - a.open).slice(0, 6);
  }, [work, developers]);

  const cardSx = {
    p: 2,
    borderRadius: `${tokens.radius.card}px`,
    border: '1px solid',
    borderColor: tokens.colors.border,
    bgcolor: tokens.colors.card,
    height: '100%',
    boxShadow: tokens.shadow.card,
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          lg: '1.2fr 1fr 1fr 1.2fr',
        },
        gap: 1.25,
        mb: 1.5,
      }}
    >
      <Paper elevation={0} sx={cardSx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <AnalyticsIcon sx={{ color: tokens.colors.primary, fontSize: 20 }} />
          <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: tokens.colors.text }}>
            Project Progress
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, mb: 1, color: tokens.colors.text }}>
          {projectProgress}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={projectProgress}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: tokens.colors.progressTrack,
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              backgroundColor: tokens.colors.primary,
            },
          }}
        />
        <Typography sx={{ mt: 1.25, fontSize: '0.75rem', color: tokens.colors.textSecondary, fontWeight: 500 }}>
          {completedThisWeek} tasks completed this week
        </Typography>
      </Paper>

      <Paper elevation={0} sx={cardSx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <DeadlineIcon sx={{ color: tokens.colors.textSecondary, fontSize: 20 }} />
          <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: tokens.colors.text }}>
            Upcoming Deadlines
          </Typography>
        </Stack>
        {upcoming.length === 0 ? (
          <Typography sx={{ fontSize: '0.8rem', color: tokens.colors.textSecondary }}>
            No deadlines this week
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {upcoming.map((t) => (
              <Stack key={t.id} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: tokens.colors.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.taskId ? `${t.taskId} · ` : ''}
                  {t.taskName}
                </Typography>
                <Chip
                  size="small"
                  label={toDateOnly(t.dueDate) || '—'}
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: tokens.colors.primarySoft,
                    color: tokens.colors.primary,
                  }}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper elevation={0} sx={cardSx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <OverdueIcon sx={{ color: tokens.colors.danger, fontSize: 20 }} />
          <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: tokens.colors.text }}>
            Overdue Tasks
          </Typography>
        </Stack>
        {overdueList.length === 0 ? (
          <Typography sx={{ fontSize: '0.8rem', color: tokens.colors.textSecondary }}>
            None overdue — nice work
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {overdueList.map((t) => (
              <Typography
                key={t.id}
                sx={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: tokens.colors.danger,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.taskId ? `${t.taskId} · ` : ''}
                {t.taskName}
              </Typography>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper elevation={0} sx={cardSx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <TeamIcon sx={{ color: tokens.colors.primary, fontSize: 20 }} />
          <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: tokens.colors.text }}>
            Team Workload
          </Typography>
        </Stack>
        {workload.length === 0 ? (
          <Typography sx={{ fontSize: '0.8rem', color: tokens.colors.textSecondary }}>No assignees yet</Typography>
        ) : (
          <Stack spacing={1}>
            {workload.map((w) => (
              <Box key={w.name}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.35 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 650, color: tokens.colors.text }}>
                    {w.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: tokens.colors.textSecondary, fontWeight: 500 }}>
                    {w.open} open · {w.done} done
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={w.total ? Math.round((w.done / w.total) * 100) : 0}
                  sx={{
                    height: 5,
                    borderRadius: 999,
                    bgcolor: tokens.colors.progressTrack,
                    '& .MuiLinearProgress-bar': { bgcolor: tokens.colors.primary, borderRadius: 999 },
                  }}
                />
              </Box>
            ))}
          </Stack>
        )}
        <AvatarGroup
          max={5}
          sx={{
            mt: 1.5,
            justifyContent: 'flex-start',
            '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 11 },
          }}
        >
          {workload.map((w) => (
            <Avatar
              key={w.name}
              sx={{ bgcolor: tokens.colors.primarySoft, color: tokens.colors.primary, fontWeight: 700 }}
            >
              {w.name
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()}
            </Avatar>
          ))}
        </AvatarGroup>
      </Paper>
    </Box>
  );
}

/**
 * Project Timeline — modern roadmap / Gantt experience.
 */
export default function ProjectTaskTimeline() {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { role, project: clientProject, clientMeta } = useRole();
  const isClient = role === 'client';
  const canEditPerm = usePermission('task.edit');
  const canEdit = !isClient && canEditPerm;

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerEdit, setDrawerEdit] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState('epic');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTask, setAssignTask] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [ganttReady, setGanttReady] = useState(false);

  const tasksPath = isClient
    ? `/client/${clientMeta?.token}/tasks`
    : `/projects/${projectId}/tasks`;
  const calendarPath = isClient
    ? `/client/${clientMeta?.token}/calendar`
    : `/projects/${projectId}/calendar`;

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const loadData = useCallback(async () => {
    if (!projectId && !isClient) return;
    try {
      setLoading(true);
      setLoadError(false);
      setGanttReady(false);

      if (isClient) {
        const token = clientMeta?.token;
        if (!token) {
          setLoadError(true);
          return;
        }
        const sharePassword = sessionStorage.getItem(`share-password:${token}`) || undefined;
        const data = await api.getClientTasks(token, sharePassword);
        setProject(data.project || clientProject);
        setTasks(data.tasks || []);
        setDevelopers(data.developers || []);
        return;
      }

      if (clientProject && isClient) {
        setProject(clientProject);
      } else {
        const projects = await api.getProjects();
        const found = projects.find((p) => p.id === parseInt(projectId, 10));
        setProject(found || { name: `Project #${projectId}` });
      }

      const [res, devs] = await Promise.all([
        api.getProjectTasks(projectId, { limit: -1 }),
        api.getDevelopers().catch(() => []),
      ]);
      setDevelopers(devs || []);
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load timeline:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
      // Lazy-mount gantt after paint for smoother first load
      requestAnimationFrame(() => setGanttReady(true));
    }
  }, [projectId, isClient, clientMeta?.token, clientProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = useMemo(() => {
    let list = filterAndSortTasks(tasks, filters, project?.name || '');
    // Keep module parents so epic grouping still works when present
    const modules = (tasks || []).filter((t) => t.recordType === 'module');
    const ids = new Set(list.map((t) => t.id));
    const neededMods = modules.filter((m) => {
      if (ids.has(m.id)) return true;
      return list.some(
        (t) =>
          String(t.parentId) === String(m.taskId) ||
          String(t.module) === String(m.taskId) ||
          String(t.module) === String(m.module)
      );
    });
    return [...neededMods, ...list];
  }, [tasks, filters, project?.name]);

  const stats = useMemo(() => computeTaskStats(tasks), [tasks]);
  const projectProgress = useMemo(() => computeProjectProgress(tasks), [tasks]);

  const handleDatesChange = async (taskId, dates) => {
    if (!canEdit || isClient) return;
    try {
      const updated = await api.updateTask(taskId, dates);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      if (selectedTask?.id === taskId) setSelectedTask((s) => ({ ...s, ...updated }));
      showAlert('Task dates updated');
    } catch (err) {
      console.error(err);
      showAlert('Failed to update task dates', 'error');
      loadData();
      throw err;
    }
  };

  const handleTaskSaved = (updated) => {
    if (!updated?.id) return;
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setSelectedTask(updated);
  };

  const openTask = (task, edit = false) => {
    setSelectedTask(task);
    setDrawerEdit(edit);
    setDrawerOpen(true);
  };

  const handleQuickAction = async (action, task) => {
    if (!task) return;
    switch (action) {
      case 'edit':
        openTask(task, true);
        break;
      case 'details':
      case 'comment':
        openTask(task, false);
        break;
      case 'assign':
        setAssignTask(task);
        setAssignOpen(true);
        break;
      case 'complete':
        if (!canEdit || isClient) return;
        try {
          const updated = await api.updateTask(task.id, { status: 'Completed', progressPercent: 100 });
          setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
          showAlert('Task marked complete');
        } catch (err) {
          console.error(err);
          showAlert('Failed to mark complete', 'error');
        }
        break;
      default:
        break;
    }
  };

  const handleAssign = async (developerId) => {
    if (!assignTask || !canEdit) return;
    try {
      const updated = await api.updateTask(assignTask.id, { developerId: developerId || null });
      setTasks((prev) => prev.map((t) => (t.id === assignTask.id ? { ...t, ...updated } : t)));
      showAlert('Assignee updated');
      setAssignOpen(false);
      setAssignTask(null);
    } catch (err) {
      console.error(err);
      showAlert('Failed to assign user', 'error');
    }
  };

  const setFilter = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.statusKey !== 'all') n += 1;
    if ((filters.priorities || []).length) n += 1;
    if (filters.developerId) n += 1;
    if (filters.search) n += 1;
    if (filters.dateFrom || filters.dateTo) n += 1;
    return n;
  }, [filters]);

  const navigateView = (mode) => {
    if (mode === 'timeline') return;
    if (mode === 'calendar') navigate(calendarPath);
    else navigate(`${tasksPath}${mode === 'kanban' ? '?view=kanban' : '?view=list'}`);
  };

  const workTaskCount = tasks.filter((t) => t.recordType !== 'module').length;
  const filteredWorkCount = filteredTasks.filter((t) => t.recordType !== 'module').length;

  const fieldSx = {
    minWidth: { xs: '100%', sm: 140 },
    '& .MuiInputBase-root': {
      borderRadius: `${tokens.radius.button}px`,
      bgcolor: '#fff',
      fontSize: '0.8125rem',
    },
  };

  return (
    <ProjectWorkspaceProvider projectId={projectId}>
      <PageContainer maxWidth={false} sx={planPageSx}>
        <PageHeader
          title={project?.name || 'Project Timeline'}
          subtitle="Program health and phase progress"
          actions={
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                sx={{ ...btnSx, bgcolor: 'background.paper' }}
              >
                Sync
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ChartIcon />}
                onClick={() => navigate(`/projects/${projectId}/dashboard`)}
                sx={{ ...btnSx, bgcolor: 'background.paper' }}
              >
                Analytics
              </Button>
            </Stack>
          }
          sx={{ mb: 1.5, gap: 1.5 }}
        />

        <ProjectPlanTopbar projectId={projectId} />
        <ViewAsBanner />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ mb: 1.5, alignItems: { xs: 'stretch', md: 'flex-start' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography
              component="h1"
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: tokens.colors.text,
                mb: 0.25,
              }}
            >
              Project Timeline
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary }}>
              {project?.name || 'Project'} · Roadmap of phases and delivery
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value="timeline"
              onChange={(_e, v) => v && navigateView(v)}
              aria-label="View switcher"
              sx={{
                bgcolor: '#F8FAFC',
                borderRadius: `${tokens.radius.button}px`,
                p: 0.25,
                border: `1px solid ${tokens.colors.border}`,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '6px !important',
                  px: 1.25,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  gap: 0.5,
                  color: tokens.colors.textSecondary,
                  '&.Mui-selected': {
                    bgcolor: tokens.colors.primary,
                    color: '#fff',
                    '&:hover': { bgcolor: tokens.colors.primaryHover },
                  },
                },
              }}
            >
              {VIEW_MODES.map((m) => {
                const Icon =
                  m.key === 'list'
                    ? ListIcon
                    : m.key === 'kanban'
                      ? KanbanIcon
                      : m.key === 'calendar'
                        ? CalendarIcon
                        : TimelineIcon;
                return (
                  <ToggleButton key={m.key} value={m.key}>
                    <Icon sx={{ fontSize: 16 }} />
                    {!isMobile && m.label}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
            <IconButton
              size="small"
              onClick={loadData}
              aria-label="Refresh timeline"
              sx={{
                color: tokens.colors.textSecondary,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: `${tokens.radius.button}px`,
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : loadError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadData}>
              Retry
            </Button>
          }
        >
          Could not load project timeline. Check your connection and try again.
        </Alert>
      ) : workTaskCount === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Upload or create tasks with start and due dates to see them on the timeline."
          actionText={isClient ? undefined : 'Open Board'}
          onActionClick={isClient ? undefined : () => navigate(tasksPath)}
          actionPermission="task.edit"
        />
      ) : (
        <>
          {/* Summary cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
                lg: 'repeat(8, 1fr)',
              },
              gap: 1.25,
              mb: 2,
            }}
          >
            {SUMMARY_CARDS.map((c) => {
              const raw = stats[c.key] ?? 0;
              const value = c.isPct ? `${raw}%` : raw;
              const pct =
                !c.isPct && c.key !== 'total' && stats.total
                  ? Math.round((raw / stats.total) * 100)
                  : c.isPct
                    ? null
                    : c.key === 'total'
                      ? 100
                      : 0;
              return (
                <SummaryCard
                  key={c.key}
                  label={c.label}
                  value={value}
                  pct={c.isPct ? null : pct}
                  icon={c.icon}
                  color={c.color}
                  tint={c.tint}
                />
              );
            })}
          </Box>

          <AnalyticsPanel
            tasks={tasks}
            developers={developers}
            projectProgress={projectProgress}
          />

          {/* Filters toolbar */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 1.5,
              borderRadius: `${tokens.radius.card}px`,
              border: '1px solid',
              borderColor: tokens.colors.border,
              bgcolor: tokens.colors.card,
              position: 'sticky',
              top: 0,
              zIndex: 8,
              boxShadow: tokens.shadow.card,
            }}
          >
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search tasks…"
                value={filters.search}
                onChange={(e) => setFilter({ search: e.target.value })}
                sx={{ ...fieldSx, minWidth: { xs: '100%', sm: 200 }, flex: { sm: '1 1 180px' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: tokens.colors.textMuted }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                size="small"
                label="Status"
                value={filters.statusKey}
                onChange={(e) => setFilter({ statusKey: e.target.value })}
                sx={fieldSx}
              >
                <MenuItem value="all">All statuses</MenuItem>
                {STATUS_FILTER_OPTIONS.map((s) => (
                  <MenuItem key={s.key} value={s.key}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Priority"
                value={(filters.priorities || [])[0] || ''}
                onChange={(e) =>
                  setFilter({ priorities: e.target.value ? [e.target.value] : [] })
                }
                sx={fieldSx}
              >
                <MenuItem value="">All priorities</MenuItem>
                {PRIORITY_OPTIONS.map((p) => (
                  <MenuItem key={p.key} value={p.key}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Assignee"
                value={filters.developerId}
                onChange={(e) => setFilter({ developerId: e.target.value })}
                sx={{ ...fieldSx, minWidth: { xs: '100%', sm: 160 } }}
              >
                <MenuItem value="">All assignees</MenuItem>
                <MenuItem value="unassigned">Unassigned</MenuItem>
                {developers.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {getDeveloperDisplayName(d)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={filters.dateFrom}
                onChange={(e) => setFilter({ dateFrom: e.target.value })}
                sx={fieldSx}
              />
              <TextField
                size="small"
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={filters.dateTo}
                onChange={(e) => setFilter({ dateTo: e.target.value })}
                sx={fieldSx}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={resetFilters}
                disabled={!activeFilterCount}
                sx={{
                  ...btnSx,
                  ml: { sm: 'auto' },
                  borderColor: tokens.colors.border,
                  color: tokens.colors.text,
                }}
              >
                Reset{activeFilterCount ? ` (${activeFilterCount})` : ''}
              </Button>
            </Stack>
            <Typography sx={{ mt: 1, fontSize: '0.72rem', color: tokens.colors.textSecondary, fontWeight: 500 }}>
              Showing {filteredWorkCount} of {workTaskCount} tasks
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.25, md: 2 },
              borderRadius: `${tokens.radius.card}px`,
              border: '1px solid',
              borderColor: tokens.colors.border,
              bgcolor: tokens.colors.card,
              boxShadow: tokens.shadow.card,
              width: '100%',
            }}
          >
            {!ganttReady ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={32} />
              </Box>
            ) : filteredWorkCount === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography sx={{ fontWeight: 650, mb: 1, color: tokens.colors.text }}>
                  No matching tasks
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: tokens.colors.textSecondary, mb: 2 }}>
                  Try adjusting or resetting filters to see timeline bars.
                </Typography>
                <Button variant="contained" onClick={resetFilters} sx={{ ...btnSx }}>
                  Reset Filters
                </Button>
              </Box>
            ) : (
              <ProjectGantt
                tasks={filteredTasks}
                developers={developers}
                readonly={!canEdit || isClient}
                hideAssignee={isClient}
                dark={isDark}
                height={isMobile ? 520 : 680}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                onDatesChange={handleDatesChange}
                onTaskClick={(task) => openTask(task, false)}
                onQuickAction={handleQuickAction}
              />
            )}
          </Paper>
        </>
      )}

      <TaskDetailsDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTask(null);
          setDrawerEdit(false);
        }}
        task={selectedTask}
        developers={developers}
        onTaskUpdated={handleTaskSaved}
        startInEditMode={drawerEdit}
      />

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Assign User</DialogTitle>
        <DialogContent dividers>
          <List dense>
            <ListItemButton onClick={() => handleAssign(null)}>
              <ListItemText primary="Unassigned" />
            </ListItemButton>
            {developers.map((d) => (
              <ListItemButton key={d.id} onClick={() => handleAssign(d.id)}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 800 }}>
                    {getDeveloperDisplayName(d)
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={getDeveloperDisplayName(d)} secondary={d.email} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={3500}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={alert.severity}
          onClose={() => setAlert((a) => ({ ...a, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
      </PageContainer>
    </ProjectWorkspaceProvider>
  );
}
