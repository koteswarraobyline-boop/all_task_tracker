import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  Box,
  Typography,
  Button,
  Stack,
  Avatar,
  CircularProgress,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Skeleton,
  Alert,
  Link,
} from '@mui/material';
import {
  Assignment as TasksIcon,
  CheckCircle as CheckIcon,
  Code as DevIcon,
  Science as TestingIcon,
  PauseCircle as HoldIcon,
  Block as BlockedIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Share as ShareIcon,
  MoreVert as MoreIcon,
  ViewKanban as BoardIcon,
  CalendarMonth as CalendarIcon,
  Timeline as TimelineIcon,
  FileDownload as ExportIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  ChevronRight as ChevronIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PageContainer, { MetricCard } from '../components/PageContainer';
import ShareProjectDialog from '../components/ShareProjectDialog';
import TaskDetailsDrawer, { splitTitleAndDescription } from '../components/TaskDetailsDrawer';
import Can from '../components/Can';
import { ProjectNavTabs } from '../components/ProjectDashboard';
import {
  formatProjectId,
  formatShortDate,
  timeAgo,
  pctOf,
  computeKpiMetrics,
  computeScheduleBuckets,
  buildProgressTimelinePercent,
  buildStatusDonutData,
  buildPriorityDonutData,
  exportTasksCsv,
  relativeDeadlineLabel,
  deadlinePillSx,
  computeHealthScore,
  deliveryStatusMessage,
  isOverdue,
  getOverdueDays,
  isWorkTask,
} from '../components/ProjectDashboard/dashboardHelpers';
import { DelayAnalysisDrawer, ProjectHealthBadge } from '../components/DeliveryHealth';
import { deliveryStatusLabel } from '../utils/deliveryHealth';
import { tokens } from '../theme';
import { useProjectId } from '../hooks/useProjectId';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { PRIORITY_COLORS } from '../utils/taskManagementConstants';
import { startOfDay } from '../utils/taskManagementConstants';

const glassSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: tokens.shadow.card,
  borderRadius: `${tokens.radius.card}px`,
};

function SectionCard({ title, action, children, sx = {} }) {
  return (
    <Paper elevation={0} sx={{ ...glassSx, p: 3, height: '100%', ...sx }}>
      {(title || action) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} mb={2.5}>
          {title ? (
            <Typography sx={{ fontWeight: 750, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
              {title}
            </Typography>
          ) : (
            <span />
          )}
          {action}
        </Stack>
      )}
      {children}
    </Paper>
  );
}

function WidgetError({ message, onRetry }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
            Retry
          </Button>
        ) : null
      }
      sx={{ borderRadius: 2 }}
    >
      {message}
    </Alert>
  );
}

function initials(name = '') {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function EmptyWidget({ title, cta, onClick }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 650, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: cta ? 2 : 0 }}>
        Nothing to show here yet.
      </Typography>
      {cta && (
        <Button size="small" variant="outlined" onClick={onClick}>
          {cta}
        </Button>
      )}
    </Box>
  );
}

const STATUS_CHIP = {
  Active: { bgcolor: '#D1FAE5', color: '#047857' },
  Completed: { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  'On Hold': { bgcolor: '#FFEDD5', color: '#C2410C' },
  Delayed: { bgcolor: '#FEE2E2', color: '#B91C1C' },
};

export default function Dashboard() {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const basePath = `/projects/${projectId}`;

  const [project, setProject] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [tasksError, setTasksError] = useState(null);
  const [delayAnalysis, setDelayAnalysis] = useState(null);
  const [delayDrawerOpen, setDelayDrawerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMenuAnchor, setShareMenuAnchor] = useState(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snack, setSnack] = useState('');

  const favKey = `tt_fav_project_${projectId}`;
  const today = useMemo(() => startOfDay(), []);

  useEffect(() => {
    setFavorite(localStorage.getItem(favKey) === '1');
  }, [favKey]);

  const toggleFavorite = () => {
    const next = !favorite;
    setFavorite(next);
    localStorage.setItem(favKey, next ? '1' : '0');
  };

  const loadDashboard = useCallback(async () => {
    if (!projectId) return;
    try {
      setDashboardError(null);
      const metrics = await api.getProjectDashboard(projectId);
      setDashboardData(metrics);
    } catch (e) {
      console.error(e);
      setDashboardError('Failed to load dashboard metrics');
      setDashboardData(null);
    }
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setTasksError(null);
      const tasksResponse = await api.getProjectTasks(projectId, { limit: -1 });
      setTasks((tasksResponse?.tasks || []).filter(isWorkTask));
    } catch (e) {
      console.error(e);
      setTasksError('Failed to load tasks');
      setTasks([]);
    }
  }, [projectId]);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const allProjects = await api.getProjects();
      const found = (allProjects || []).find((p) => p.id === parseInt(projectId, 10));
      setProject(found || { name: `Project #${projectId}`, id: projectId });
    } catch (e) {
      console.error(e);
      setProject({ name: `Project #${projectId}`, id: projectId });
    }
  }, [projectId]);

  const loadDelayAnalysis = useCallback(async () => {
    if (!projectId) return;
    try {
      const analysis = await api.getProjectDelayAnalysis(projectId);
      setDelayAnalysis(analysis);
    } catch {
      setDelayAnalysis(null);
    }
  }, [projectId]);

  const loadDevelopers = useCallback(async () => {
    try {
      const devs = await api.getDevelopers();
      setDevelopers(devs || []);
    } catch {
      setDevelopers([]);
    }
  }, []);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    await Promise.all([
      loadProject(),
      loadDashboard(),
      loadTasks(),
      loadDelayAnalysis(),
      loadDevelopers(),
    ]);
    setLoading(false);
  }, [projectId, loadProject, loadDashboard, loadTasks, loadDelayAnalysis, loadDevelopers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const metrics = useMemo(() => computeKpiMetrics(tasks), [tasks]);
  const scheduleBuckets = useMemo(() => computeScheduleBuckets(tasks, today), [tasks, today]);
  const statusDonut = useMemo(() => buildStatusDonutData(tasks), [tasks]);
  const priorityDonut = useMemo(() => buildPriorityDonutData(tasks), [tasks]);
  const timelineData = useMemo(
    () => buildProgressTimelinePercent(dashboardData?.taskProgressTimeline, metrics.total),
    [dashboardData, metrics.total]
  );

  const healthScore = useMemo(
    () =>
      computeHealthScore(
        delayAnalysis?.completionPercent ?? pctOf(metrics.completed, metrics.total),
        scheduleBuckets,
        project?.deliveryStatus || delayAnalysis?.deliveryStatus
      ),
    [delayAnalysis, metrics, scheduleBuckets, project?.deliveryStatus]
  );

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate && t.status !== 'Completed' && !isOverdue(t, today))
      .map((t) => {
        const { title } = splitTitleAndDescription(t.taskName, t.description);
        return { ...t, title };
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 8);
  }, [tasks, today]);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter((t) => isOverdue(t, today))
      .map((t) => {
        const { title } = splitTitleAndDescription(t.taskName, t.description);
        return { ...t, title, lateDays: getOverdueDays(t, today) };
      })
      .sort((a, b) => b.lateDays - a.lateDays)
      .slice(0, 8);
  }, [tasks, today]);

  const recentActivity = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 10)
      .map((t) => {
        const { title } = splitTitleAndDescription(t.taskName, t.description);
        const who = getDeveloperDisplayName(t.developer) || 'Team member';
        let action = 'updated';
        let color = '#F59E0B';
        if (t.status === 'Completed') {
          action = 'completed';
          color = '#22C55E';
        } else if (t.status === 'Blocked') {
          action = 'flagged blocked';
          color = '#EF4444';
        } else if (t.status === 'In Development') {
          action = 'started';
          color = '#4F46E5';
        }
        return { id: t.id, who, action, title, when: timeAgo(t.updatedAt), color: t.developer?.color || color };
      });
  }, [tasks]);

  const teamSize = project?.members?.length ?? new Set(tasks.map((t) => t.developerId).filter(Boolean)).size;
  const statusChip = STATUS_CHIP[project?.status] || STATUS_CHIP.Active;
  const projectCode = formatProjectId(project?.id || projectId);
  const ownerLabel = project?.clientName || project?.manager?.name || '—';

  const goTasks = (status) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    navigate(`${basePath}/tasks${q}`);
  };

  const handleCopyClientLink = async () => {
    setShareMenuAnchor(null);
    try {
      const records = await api.listClientAccess({ projectId: project?.id });
      const record = (records || []).find((r) => Number(r.projectId) === Number(project?.id));
      if (!record?.shareUrl) {
        setSnack('Generate a share link first via Share Client Portal');
        setShareOpen(true);
        return;
      }
      await navigator.clipboard.writeText(record.shareUrl);
      setSnack('Client link copied');
    } catch {
      setSnack('Could not copy link');
    }
  };

  const kpis = [
    {
      label: 'Total Tasks',
      value: metrics.total,
      pct: 100,
      icon: <TasksIcon />,
      tint: '#EFF6FF',
      iconColor: '#2563EB',
      onClick: () => goTasks(),
    },
    {
      label: 'Completed',
      value: metrics.completed,
      pct: pctOf(metrics.completed, metrics.total),
      icon: <CheckIcon />,
      tint: '#ECFDF5',
      iconColor: '#059669',
      onClick: () => goTasks('Completed'),
    },
    {
      label: 'In Development',
      value: metrics.inDevelopment,
      pct: pctOf(metrics.inDevelopment, metrics.total),
      icon: <DevIcon />,
      tint: '#EFF6FF',
      iconColor: '#2563EB',
      onClick: () => goTasks('In Development'),
    },
    {
      label: 'Testing',
      value: metrics.testing,
      pct: pctOf(metrics.testing, metrics.total),
      icon: <TestingIcon />,
      tint: '#FAF5FF',
      iconColor: '#9333EA',
      onClick: () => goTasks('Testing'),
    },
    {
      label: 'On Hold',
      value: metrics.onHold,
      pct: pctOf(metrics.onHold, metrics.total),
      icon: <HoldIcon />,
      tint: '#FFF7ED',
      iconColor: '#EA580C',
      onClick: () => goTasks('On Hold'),
    },
    {
      label: 'Blocked',
      value: metrics.blocked,
      pct: pctOf(metrics.blocked, metrics.total),
      icon: <BlockedIcon />,
      tint: '#FEF2F2',
      iconColor: '#DC2626',
      onClick: () => goTasks('Blocked'),
    },
  ];

  const openTask = (task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <PageContainer maxWidth={tokens.layout.maxWidth}>
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={160} sx={{ mb: 3, borderRadius: 3 }} />
        <Skeleton variant="rounded" height={48} sx={{ mb: 3, borderRadius: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2, mb: 3 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={tokens.layout.maxWidth} sx={{ py: { xs: 2, md: 2.5 } }}>
      {snack && (
        <Alert severity="info" onClose={() => setSnack('')} sx={{ mb: 2 }}>
          {snack}
        </Alert>
      )}

      {/* Breadcrumb */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/projects" underline="hover" sx={{ fontWeight: 650, fontSize: '0.875rem', color: 'text.secondary' }}>
          Projects
        </Link>
        <ChevronIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{project?.name}</Typography>
      </Stack>

      {/* Header */}
      <Paper elevation={0} sx={{ ...glassSx, p: { xs: 2.5, md: 3 }, mb: 2 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ lg: 'flex-start' }} gap={2}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} mb={0.75}>
              <Typography component="h1" sx={{ fontSize: { xs: '1.5rem', md: '1.85rem' }, fontWeight: 800, letterSpacing: '-0.025em' }}>
                {project?.name}
              </Typography>
              {project?.deliveryStatus && <ProjectHealthBadge status={project.deliveryStatus} />}
              <Tooltip title={favorite ? 'Unfavorite' : 'Favorite'}>
                <IconButton onClick={toggleFavorite} size="small" sx={{ color: favorite ? '#F59E0B' : 'text.secondary' }}>
                  {favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={(e) => setMoreMenuAnchor(e.currentTarget)}>
                <MoreIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', fontWeight: 600 }}>
              {projectCode}
              {project?.description ? ` · ${project.description}` : ''}
            </Typography>
          </Box>

          <Stack spacing={1.5} alignItems={{ xs: 'stretch', lg: 'flex-end' }} sx={{ flexShrink: 0 }}>
            <Stack direction="row" flexWrap="wrap" gap={1} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
              <Can permission="project.share">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ShareIcon />}
                  endIcon={<ChevronIcon sx={{ fontSize: 16, transform: 'rotate(90deg)' }} />}
                  onClick={(e) => setShareMenuAnchor(e.currentTarget)}
                  sx={{ bgcolor: 'background.paper', height: 36, textTransform: 'none', fontWeight: 600 }}
                >
                  Share Project
                </Button>
              </Can>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExportIcon />}
                endIcon={<ChevronIcon sx={{ fontSize: 16, transform: 'rotate(90deg)' }} />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                sx={{ bgcolor: 'background.paper', height: 36, textTransform: 'none', fontWeight: 600 }}
              >
                Export Report
              </Button>
              <Button variant="contained" size="small" startIcon={<BoardIcon />} onClick={() => goTasks()} sx={{ height: 36, textTransform: 'none', fontWeight: 600 }}>
                Open Task Board
              </Button>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={2.5} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
              {[
                ['Start Date', formatShortDate(project?.startDate)],
                ['Target Date', formatShortDate(project?.activeDeliveryDate || project?.dueDate)],
              ].map(([label, value]) => (
                <Box key={label} sx={{ textAlign: { lg: 'right' } }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em' }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{value}</Typography>
                </Box>
              ))}
              <Box sx={{ textAlign: { lg: 'right' } }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', mb: 0.25 }}>
                  Project Owner
                </Typography>
                <Stack direction="row" alignItems="center" gap={0.75} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: tokens.colors.primary }}>
                    {initials(ownerLabel)}
                  </Avatar>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{ownerLabel}</Typography>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <ProjectNavTabs projectId={projectId} />

      {/* KPI cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)', xl: 'repeat(6,1fr)' },
          gap: 1.5,
          mb: 2.5,
        }}
      >
        {kpis.map((k) => (
          <MetricCard
            key={k.label}
            label={k.label}
            value={k.value}
            icon={k.icon}
            tint={k.tint}
            iconColor={k.iconColor}
            trend={k.label === 'Total Tasks' ? 'All tasks' : `${k.pct}%`}
            trendUp={k.label === 'Completed' || k.label === 'Total Tasks'}
            onClick={k.onClick}
            sx={{
              '& .MuiCardContent-root': { p: 2.25, '&:last-child': { pb: 2.25 } },
              '& h1': { fontSize: { xs: '1.65rem', md: '1.85rem' } },
            }}
          />
        ))}
      </Box>

      {/* Analytics row — delivery | progress | details */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr', xl: '1.2fr 1.2fr 0.85fr' },
          gap: 2,
          mb: 2.5,
          alignItems: 'stretch',
        }}
      >
        <SectionCard title="Delivery Health" sx={{ p: 2.5 }}>
          {tasksError ? (
            <WidgetError message={tasksError} onRetry={loadTasks} />
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" gap={2.5}>
                <Box sx={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
                  <CircularProgress variant="determinate" value={100} size={112} thickness={3.5} sx={{ color: '#E2E8F0', position: 'absolute' }} />
                  <CircularProgress
                    variant="determinate"
                    value={healthScore}
                    size={112}
                    thickness={3.5}
                    sx={{
                      color: healthScore >= 70 ? '#22C55E' : healthScore >= 45 ? '#F59E0B' : '#EF4444',
                      position: 'absolute',
                      '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                    }}
                  />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1 }}>{healthScore}</Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700 }}>Score /100</Typography>
                  </Box>
                </Box>
                <Stack spacing={1} sx={{ flex: 1 }}>
                  {[
                    { label: 'Ahead of Schedule', count: scheduleBuckets.ahead, color: '#22C55E' },
                    { label: 'On Schedule', count: scheduleBuckets.onSchedule, color: '#2563EB' },
                    { label: 'At Risk', count: scheduleBuckets.atRisk, color: '#F59E0B' },
                    { label: 'Overdue', count: scheduleBuckets.overdue, color: '#EF4444' },
                  ].map((b) => (
                    <Stack key={b.label} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 600 }}>{b.label}</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: b.color }}>{b.count}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: `${tokens.radius.button}px`,
                  bgcolor: project?.deliveryStatus === 'OVERDUE' ? '#FEF2F2' : '#ECFDF5',
                  border: '1px solid',
                  borderColor: project?.deliveryStatus === 'OVERDUE' ? '#FECACA' : '#A7F3D0',
                }}
              >
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: project?.deliveryStatus === 'OVERDUE' ? '#B91C1C' : '#047857', mb: 0.25 }}>
                  {deliveryStatusLabel(project?.deliveryStatus || delayAnalysis?.deliveryStatus || 'ON_TRACK')}
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.45 }}>
                  {deliveryStatusMessage(project?.deliveryStatus || delayAnalysis?.deliveryStatus)}
                </Typography>
              </Box>
              {delayAnalysis && (
                <Button size="small" variant="outlined" onClick={() => setDelayDrawerOpen(true)} sx={{ alignSelf: 'flex-start', fontWeight: 700, textTransform: 'none' }}>
                  View Delay Analysis
                </Button>
              )}
            </Stack>
          )}
        </SectionCard>

        <SectionCard title="Progress Over Time" sx={{ p: 2.5 }}>
          {dashboardError ? (
            <WidgetError message={dashboardError} onRetry={loadDashboard} />
          ) : timelineData.length === 0 ? (
            <EmptyWidget title="Progress history will appear as project activity is recorded." cta="Open Task Board" onClick={() => goTasks()} />
          ) : (
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <RechartsTooltip formatter={(v, name) => [`${v}%`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="actualPct" name="Actual Progress" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="plannedPct" name="Baseline" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </SectionCard>

        <SectionCard title="Project Details" sx={{ p: 2.5, display: { xs: 'none', xl: 'block' } }}>
          <Stack spacing={1.75}>
            {[
              ['Project ID', projectCode],
              ['Owner', ownerLabel],
              ['Project Manager', project?.manager?.name || '—'],
              ['Priority', project?.priority || 'Medium'],
              ['Status', project?.status || 'Active'],
              ['Target Date', formatShortDate(project?.activeDeliveryDate || project?.dueDate)],
              ['Team Size', `${teamSize} Members`],
            ].map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
                {label === 'Status' ? (
                  <Chip size="small" label={value} sx={{ fontWeight: 700, height: 24, ...statusChip }} />
                ) : label === 'Priority' ? (
                  <Chip size="small" label={value} sx={{ fontWeight: 700, height: 24, bgcolor: '#FEE2E2', color: '#B91C1C' }} />
                ) : (
                  <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem', textAlign: 'right' }}>{value}</Typography>
                )}
              </Stack>
            ))}
            {project?.tags?.length > 0 && (
              <Box sx={{ pt: 0.5 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 0.75 }}>Tags</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {project.tags.slice(0, 3).map((tag) => (
                    <Chip key={tag} size="small" label={tag} sx={{ height: 24, fontWeight: 650, bgcolor: '#EEF2FF', color: '#4338CA' }} />
                  ))}
                  {project.tags.length > 3 && (
                    <Chip size="small" label={`+${project.tags.length - 3}`} sx={{ height: 24, fontWeight: 650 }} />
                  )}
                </Stack>
              </Box>
            )}
            {project?.description && (
              <Box sx={{ pt: 0.5 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>Description</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {project.description}
                </Typography>
              </Box>
            )}
          </Stack>
        </SectionCard>
      </Box>

      <Stack spacing={2} sx={{ minWidth: 0 }}>
          {/* Mobile / tablet project details */}
          <SectionCard title="Project Details" sx={{ p: 2.5, display: { xs: 'block', xl: 'none' } }}>
            <Stack spacing={1.75}>
              {[
                ['Project ID', projectCode],
                ['Owner', ownerLabel],
                ['Project Manager', project?.manager?.name || '—'],
                ['Team Size', `${teamSize} Members`],
              ].map(([label, value]) => (
                <Stack key={label} direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{value}</Typography>
                </Stack>
              ))}
            </Stack>
          </SectionCard>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <SectionCard title="Tasks by Status">
              {statusDonut.length === 0 ? (
                <EmptyWidget title="No tasks yet" />
              ) : (
                <>
                  <Box sx={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                          {statusDonut.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={0.75} justifyContent="center" sx={{ mt: 1 }}>
                    {statusDonut.map((s) => (
                      <Chip key={s.name} size="small" label={`${s.name} (${s.value})`} sx={{ height: 24, fontWeight: 650, bgcolor: `${s.color}18`, color: s.color }} />
                    ))}
                  </Stack>
                </>
              )}
            </SectionCard>

            <SectionCard title="Tasks by Priority">
              {priorityDonut.length === 0 ? (
                <EmptyWidget title="No priority data" />
              ) : (
                <>
                  <Box sx={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={priorityDonut} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                          {priorityDonut.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={0.75} justifyContent="center" sx={{ mt: 1 }}>
                    {priorityDonut.map((s) => (
                      <Chip
                        key={s.name}
                        size="small"
                        label={`${s.name} (${s.value})`}
                        sx={{
                          height: 24,
                          fontWeight: 650,
                          bgcolor: PRIORITY_COLORS[s.name]?.bgcolor || '#F1F5F9',
                          color: PRIORITY_COLORS[s.name]?.color || '#64748B',
                        }}
                      />
                    ))}
                  </Stack>
                </>
              )}
            </SectionCard>
          </Box>

          {/* Bottom lists — 3 columns on large screens */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            <SectionCard
              title="Upcoming Deadlines"
              sx={{ p: 2.5 }}
              action={
                <Button size="small" onClick={() => navigate(`${basePath}/tasks`)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  View all
                </Button>
              }
            >
              {upcomingDeadlines.length === 0 ? (
                <EmptyWidget title="No upcoming deadlines." />
              ) : (
                <Stack spacing={0.5}>
                  {upcomingDeadlines.slice(0, 5).map((t) => (
                    <Stack
                      key={t.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1}
                      onClick={() => openTask(t)}
                      sx={{ py: 1, px: 0.5, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 650, fontSize: '0.85rem' }} noWrap>
                          {t.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{formatShortDate(t.dueDate)}</Typography>
                      </Box>
                      <Chip size="small" label={relativeDeadlineLabel(t.dueDate, today)} sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', flexShrink: 0, ...deadlinePillSx(t.dueDate, today) }} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>

            <SectionCard
              title="Overdue Tasks"
              sx={{ p: 2.5 }}
              action={
                <Button size="small" onClick={() => navigate(`${basePath}/tasks?overdueOnly=1`)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  View all
                </Button>
              }
            >
              {overdueTasks.length === 0 ? (
                <EmptyWidget title="No overdue tasks" />
              ) : (
                <Stack spacing={0.5}>
                  {overdueTasks.slice(0, 5).map((t) => (
                    <Stack
                      key={t.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1}
                      onClick={() => openTask(t)}
                      sx={{ py: 1, px: 0.5, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 650, fontSize: '0.85rem' }} noWrap>
                          {t.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{formatShortDate(t.dueDate)}</Typography>
                      </Box>
                      <Chip size="small" label={`${t.lateDays}d late`} sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', flexShrink: 0, bgcolor: '#FEE2E2', color: '#B91C1C' }} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>

            <SectionCard title="Recent Activity" sx={{ p: 2.5 }}>
              {recentActivity.length === 0 ? (
                <EmptyWidget title="No recent activity." />
              ) : (
                <Stack spacing={0}>
                  {recentActivity.slice(0, 5).map((a) => (
                    <Stack key={a.id} direction="row" gap={1.25} sx={{ py: 1.1 }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: '0.65rem', bgcolor: a.color }}>
                        {(a.who || '?').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                          <Box component="span" sx={{ fontWeight: 750 }}>{a.who}</Box>
                          {' '}
                          {a.action}
                          {' '}
                          <Box component="span" sx={{ fontWeight: 600 }}>&ldquo;{a.title}&rdquo;</Box>
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{a.when}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Box>

          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Button variant="outlined" size="small" startIcon={<BoardIcon />} onClick={() => goTasks()} sx={{ textTransform: 'none' }}>
              View Task Board
            </Button>
            <Button variant="outlined" size="small" startIcon={<TimelineIcon />} onClick={() => navigate(`${basePath}/timeline`)} sx={{ textTransform: 'none' }}>
              View Timeline
            </Button>
            <Button variant="outlined" size="small" startIcon={<CalendarIcon />} onClick={() => navigate(`${basePath}/calendar`)} sx={{ textTransform: 'none' }}>
              Open Calendar
            </Button>
          </Stack>
        </Stack>

      {/* Menus */}
      <Menu anchorEl={shareMenuAnchor} open={Boolean(shareMenuAnchor)} onClose={() => setShareMenuAnchor(null)}>
        <MenuItem onClick={handleCopyClientLink}>
          <CopyIcon fontSize="small" sx={{ mr: 1.5 }} /> Copy Client Link
        </MenuItem>
        <MenuItem
          onClick={() => {
            setShareMenuAnchor(null);
            setShareOpen(true);
          }}
        >
          <ShareIcon fontSize="small" sx={{ mr: 1.5 }} /> Share Client Portal
        </MenuItem>
        <MenuItem
          onClick={() => {
            setShareMenuAnchor(null);
            setShareOpen(true);
          }}
        >
          <LinkIcon fontSize="small" sx={{ mr: 1.5 }} /> Manage Share Link
        </MenuItem>
      </Menu>

      <Menu anchorEl={exportMenuAnchor} open={Boolean(exportMenuAnchor)} onClose={() => setExportMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setExportMenuAnchor(null);
            window.alert('PDF export coming soon');
          }}
        >
          Export PDF
        </MenuItem>
        <MenuItem
          onClick={() => {
            setExportMenuAnchor(null);
            window.alert('Excel export coming soon');
          }}
        >
          Export Excel
        </MenuItem>
        <MenuItem
          onClick={() => {
            setExportMenuAnchor(null);
            exportTasksCsv(tasks, project?.name || 'project');
          }}
        >
          Export CSV (tasks)
        </MenuItem>
      </Menu>

      <Menu anchorEl={moreMenuAnchor} open={Boolean(moreMenuAnchor)} onClose={() => setMoreMenuAnchor(null)}>
        <MenuItem onClick={() => { navigate(`${basePath}/settings`); setMoreMenuAnchor(null); }}>
          <OpenIcon fontSize="small" sx={{ mr: 1.5 }} /> Project Settings
        </MenuItem>
        <Can permission="csv.upload">
          <MenuItem onClick={() => { navigate(`/projects/upload?projectId=${projectId}`); setMoreMenuAnchor(null); }}>
            Import CSV
          </MenuItem>
        </Can>
        <MenuItem onClick={() => { loadAll(); setMoreMenuAnchor(null); }}>
          <RefreshIcon fontSize="small" sx={{ mr: 1.5 }} /> Refresh
        </MenuItem>
      </Menu>

      <ShareProjectDialog open={shareOpen} onClose={() => setShareOpen(false)} project={project} />
      <DelayAnalysisDrawer open={delayDrawerOpen} onClose={() => setDelayDrawerOpen(false)} analysis={delayAnalysis} />
      <TaskDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        task={selectedTask}
        developers={developers}
        onTaskUpdated={loadTasks}
      />
    </PageContainer>
  );
}
