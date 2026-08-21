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
  Groups as TeamIcon,
  EventBusy as DeadlineIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../services/api';
import ProjectGantt from '../components/ProjectGantt/ProjectGantt';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';
import EmptyState from '../components/EmptyState';
import PageContainer from '../components/PageContainer';
import { useProjectId } from '../hooks/useProjectId';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../context/RoleContext';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
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
  { key: 'total', label: 'Total Tasks', icon: TotalIcon, color: '#64748B', tint: '#F1F5F9' },
  { key: 'completed', label: 'Completed', icon: CompletedIcon, color: '#22C55E', tint: '#ECFDF5' },
  { key: 'inProgress', label: 'In Progress', icon: ProgressIcon, color: '#F97316', tint: '#FFF7ED' },
  { key: 'development', label: 'In Development', icon: DevIcon, color: '#2563EB', tint: '#EFF6FF' },
  { key: 'testing', label: 'Testing', icon: TestingIcon, color: '#9333EA', tint: '#FAF5FF' },
  { key: 'blocked', label: 'Blocked', icon: BlockedIcon, color: '#EF4444', tint: '#FEF2F2' },
  { key: 'overdue', label: 'Overdue', icon: OverdueIcon, color: '#DC2626', tint: '#FEF2F2' },
  { key: 'completionPct', label: 'Completion', icon: PctIcon, color: '#0EA5E9', tint: '#F0F9FF', isPct: true },
];

function SummaryCard({ label, value, pct, icon: Icon, color, tint, isDark }) {
  return (
    <Paper
      component={motion.div}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: isDark ? 'background.paper' : '#fff',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: color,
        }}
      />
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: isDark ? `${color}22` : tint,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', mb: 0.25 }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {value}
          </Typography>
          {pct != null && (
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color, mt: 0.35 }}>
              {pct}% of total
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function AnalyticsPanel({ tasks, developers, isDark, projectProgress }) {
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
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: isDark ? 'background.paper' : '#fff',
    height: '100%',
    boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
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
        gap: 1.5,
        mb: 2,
      }}
    >
      <Paper elevation={0} sx={cardSx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <AnalyticsIcon sx={{ color: '#0EA5E9', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Project Progress</Typography>
        </Stack>
        <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 1 }}>{projectProgress}%</Typography>
        <LinearProgress
          variant="determinate"
          value={projectProgress}
          sx={{
            height: 10,
            borderRadius: 999,
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              background: 'linear-gradient(90deg,#2563EB,#22C55E)',
              transition: 'transform 0.6s ease',
            },
          }}
        />
        <Typography sx={{ mt: 1.25, fontSize: '0.75rem', color: 'text.secondary', fontWeight: 650 }}>
          {completedThisWeek} tasks completed this week
        </Typography>
      </Paper>

      <Paper elevation={0} sx={cardSx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <DeadlineIcon sx={{ color: '#F97316', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Upcoming Deadlines</Typography>
        </Stack>
        {upcoming.length === 0 ? (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No deadlines this week</Typography>
        ) : (
          <Stack spacing={0.75}>
            {upcoming.map((t) => (
              <Stack key={t.id} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 650,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.taskId ? `${t.taskId} · ` : ''}
                  {t.taskName}
                </Typography>
                <Chip size="small" label={toDateOnly(t.dueDate) || '—'} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper elevation={0} sx={cardSx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <OverdueIcon sx={{ color: '#EF4444', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Overdue Tasks</Typography>
        </Stack>
        {overdueList.length === 0 ? (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>None overdue — nice work</Typography>
        ) : (
          <Stack spacing={0.75}>
            {overdueList.map((t) => (
              <Typography
                key={t.id}
                sx={{
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  color: '#DC2626',
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
          <TeamIcon sx={{ color: '#6366F1', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Team Workload</Typography>
        </Stack>
        {workload.length === 0 ? (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No assignees yet</Typography>
        ) : (
          <Stack spacing={1}>
            {workload.map((w) => (
              <Box key={w.name}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.35 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{w.name}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 650 }}>
                    {w.open} open / {w.total}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={w.total ? Math.round((w.done / w.total) * 100) : 0}
                  sx={{ height: 6, borderRadius: 999 }}
                />
              </Box>
            ))}
          </Stack>
        )}
        <AvatarGroup max={5} sx={{ mt: 1.5, justifyContent: 'flex-start', '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 11 } }}>
          {workload.map((w) => (
            <Avatar key={w.name} sx={{ bgcolor: '#E2E8F0', color: '#334155', fontWeight: 800 }}>
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
    '& .MuiInputBase-root': { borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC' },
  };

  return (
    <PageContainer maxWidth={1800} sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ mb: 2.5, alignItems: { xs: 'stretch', md: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '1.5rem', md: '1.85rem' },
              fontWeight: 800,
              letterSpacing: '-0.03em',
              mb: 0.35,
            }}
          >
            Project Timeline
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', fontWeight: 550 }}>
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
              bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
              borderRadius: 2,
              p: 0.25,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '8px !important',
                px: 1.25,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                gap: 0.5,
                '&.Mui-selected': {
                  bgcolor: isDark ? '#1e293b' : '#fff',
                  color: '#2563EB',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
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
          <IconButton size="small" onClick={loadData} aria-label="Refresh timeline">
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
                  isDark={isDark}
                />
              );
            })}
          </Box>

          <AnalyticsPanel
            tasks={tasks}
            developers={developers}
            isDark={isDark}
            projectProgress={projectProgress}
          />

          {/* Filters toolbar */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: isDark ? 'background.paper' : '#fff',
              position: 'sticky',
              top: 0,
              zIndex: 8,
              boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
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
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
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
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, ml: { sm: 'auto' } }}
              >
                Reset Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
              </Button>
            </Stack>
            <Typography sx={{ mt: 1, fontSize: '0.72rem', color: 'text.secondary', fontWeight: 650 }}>
              Showing {filteredWorkCount} of {workTaskCount} tasks
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.25, md: 2 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: isDark ? 'background.paper' : '#fff',
              boxShadow: '0 4px 24px rgba(15,23,42,0.05)',
              width: '100%',
            }}
          >
            {!ganttReady ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={32} />
              </Box>
            ) : filteredWorkCount === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography sx={{ fontWeight: 750, mb: 1 }}>No matching tasks</Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
                  Try adjusting or resetting filters to see timeline bars.
                </Typography>
                <Button
                  variant="contained"
                  onClick={resetFilters}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
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
  );
}
