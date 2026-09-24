import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  ResponsiveContainer,
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
  FileDownload as ExportIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  ChevronRight as ChevronIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PageContainer, { MetricCard } from '../components/PageContainer';
import ShareProjectDialog from '../components/ShareProjectDialog';
import TaskDetailsDrawer, { splitTitleAndDescription } from '../components/TaskDetailsDrawer';
import Can from '../components/Can';
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
import {
  exportTasksExcel,
  exportTasksPdf,
  buildProjectExportSummary,
} from '../utils/projectExport';
import PerformanceDonutChart, {
  STATUS_CHART_COLORS,
  PRIORITY_CHART_COLORS,
} from '../components/ProjectDashboard/PerformanceDonutChart';
import { DelayAnalysisDrawer, ProjectHealthBadge } from '../components/DeliveryHealth';
import { deliveryStatusLabel, DELIVERY_STATUS_COLORS } from '../utils/deliveryHealth';
import { tokens } from '../theme';
import { useProjectId } from '../hooks/useProjectId';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
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
    <Paper elevation={0} sx={{ ...glassSx, p: { xs: 2, md: 2.5 }, height: '100%', ...sx }}>
      {(title || action) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} mb={2}>
          {title ? (
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.01em', color: 'text.primary' }}>
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

function DetailRow({ label, children }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
      gap={2}
      sx={{
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography
        sx={{
          fontSize: '0.8125rem',
          color: 'text.secondary',
          fontWeight: 600,
          flex: '0 0 46%',
          maxWidth: '46%',
          lineHeight: 1.4,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', textAlign: 'right' }}>
        {children}
      </Box>
    </Stack>
  );
}

function MetaStat({ label, value, icon }) {
  return (
    <Stack direction="row" alignItems="flex-start" gap={1.25} sx={{ minWidth: 0 }}>
      {icon ? (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: `${tokens.radius.button}px`,
            bgcolor: '#F1F5F9',
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      ) : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 0.35 }}>
          {label}
        </Typography>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.35, wordBreak: 'break-word' }}>
            {value}
          </Typography>
        ) : (
          value
        )}
      </Box>
    </Stack>
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
  const [snackSeverity, setSnackSeverity] = useState('info');

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
          color = '#2563EB';
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

  const exportSummary = useMemo(
    () =>
      buildProjectExportSummary(project, metrics, {
        deliveryStatus: project?.deliveryStatus || dashboardData?.deliveryStatus,
      }),
    [project, metrics, dashboardData?.deliveryStatus]
  );

  const handleProjectExport = async (format) => {
    setExportMenuAnchor(null);
    if (tasksError) {
      setSnackSeverity('error');
      setSnack('Cannot export — tasks failed to load.');
      return;
    }
    if (!tasks.length) {
      setSnackSeverity('warning');
      setSnack('No tasks to export.');
      return;
    }
    const name = project?.name || 'project';
    try {
      if (format === 'csv') {
        exportTasksCsv(tasks, name);
      } else if (format === 'xlsx') {
        await exportTasksExcel(tasks, name, exportSummary);
      } else if (format === 'pdf') {
        await exportTasksPdf(tasks, name, exportSummary);
      }
      setSnackSeverity('success');
      setSnack(`${format.toUpperCase()} export downloaded`);
    } catch (err) {
      console.error('Export failed:', err);
      setSnackSeverity('error');
      setSnack('Export failed. Please try again.');
    }
  };

  const handleCopyClientLink = async () => {
    setShareMenuAnchor(null);
    try {
      const records = await api.listClientAccess({ projectId: project?.id });
      const record = (records || []).find((r) => Number(r.projectId) === Number(project?.id));
      if (!record?.shareUrl) {
        setSnackSeverity('warning');
        setSnack('Generate a share link first via Share Client Portal');
        setShareOpen(true);
        return;
      }
      await navigator.clipboard.writeText(record.shareUrl);
      setSnackSeverity('success');
      setSnack('Client link copied');
    } catch {
      setSnackSeverity('error');
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
      trend: 'All tasks',
      trendVariant: 'neutral',
      onClick: () => goTasks(),
    },
    {
      label: 'Completed',
      value: metrics.completed,
      pct: pctOf(metrics.completed, metrics.total),
      icon: <CheckIcon />,
      tint: '#ECFDF5',
      iconColor: '#059669',
      trend: `${pctOf(metrics.completed, metrics.total)}% of total`,
      trendUp: true,
      onClick: () => goTasks('Completed'),
    },
    {
      label: 'In Development',
      value: metrics.inDevelopment,
      pct: pctOf(metrics.inDevelopment, metrics.total),
      icon: <DevIcon />,
      tint: '#EFF6FF',
      iconColor: '#2563EB',
      trend: `${pctOf(metrics.inDevelopment, metrics.total)}% of total`,
      trendVariant: 'neutral',
      onClick: () => goTasks('In Development'),
    },
    {
      label: 'Testing',
      value: metrics.testing,
      pct: pctOf(metrics.testing, metrics.total),
      icon: <TestingIcon />,
      tint: '#FAF5FF',
      iconColor: '#2563EB',
      trend: `${pctOf(metrics.testing, metrics.total)}% of total`,
      trendVariant: 'neutral',
      onClick: () => goTasks('Testing'),
    },
    {
      label: 'On Hold',
      value: metrics.onHold,
      pct: pctOf(metrics.onHold, metrics.total),
      icon: <HoldIcon />,
      tint: '#FFF7ED',
      iconColor: '#EA580C',
      trend: `${pctOf(metrics.onHold, metrics.total)}% of total`,
      trendVariant: metrics.onHold > 0 ? 'warning' : 'neutral',
      onClick: () => goTasks('On Hold'),
    },
    {
      label: 'Blocked',
      value: metrics.blocked,
      pct: pctOf(metrics.blocked, metrics.total),
      icon: <BlockedIcon />,
      tint: '#FEF2F2',
      iconColor: '#DC2626',
      trend: `${pctOf(metrics.blocked, metrics.total)}% of total`,
      trendUp: metrics.blocked === 0,
      onClick: () => goTasks('Blocked'),
    },
  ];

  const openTask = (task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <PageContainer maxWidth="100%" sx={{ maxWidth: '100%', px: { xs: 1.5, sm: 2, md: 2 }, py: { xs: 1.5, md: 2 } }}>
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
    <PageContainer maxWidth="100%" sx={{ maxWidth: '100%', px: { xs: 1.5, sm: 2, md: 2 }, py: { xs: 1.5, md: 2 } }}>
      {snack && (
        <Alert severity={snackSeverity} onClose={() => setSnack('')} sx={{ mb: 2 }}>
          {snack}
        </Alert>
      )}

      {/* Breadcrumb */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5, minWidth: 0 }}>
        <Link component={RouterLink} to="/projects" underline="hover" sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary', flexShrink: 0 }}>
          Projects
        </Link>
        <ChevronIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
        <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.primary', minWidth: 0 }}>
          {project?.name}
        </Typography>
      </Stack>

      {/* Header */}
      <Paper elevation={0} sx={{ ...glassSx, overflow: 'hidden', mb: 2 }}>
        <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} gap={2}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                <Typography
                  component="h1"
                  noWrap
                  sx={{
                    fontSize: { xs: '1.35rem', md: '1.65rem' },
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    maxWidth: { xs: '100%', md: '520px' },
                  }}
                >
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
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 600 }}>
                {projectCode}
              </Typography>
            </Box>

            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ flexShrink: 0 }}>
              <Can permission="project.share">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ShareIcon />}
                  endIcon={<ChevronIcon sx={{ fontSize: 16, transform: 'rotate(90deg)' }} />}
                  onClick={(e) => setShareMenuAnchor(e.currentTarget)}
                  sx={{ bgcolor: 'background.paper', height: 38, textTransform: 'none', fontWeight: 600, px: 1.5 }}
                >
                  Share Project
                </Button>
              </Can>
              <Can permission="report.export">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExportIcon />}
                endIcon={<ChevronIcon sx={{ fontSize: 16, transform: 'rotate(90deg)' }} />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                disabled={Boolean(tasksError) || tasks.length === 0}
                sx={{ bgcolor: 'background.paper', height: 38, textTransform: 'none', fontWeight: 600, px: 1.5 }}
              >
                Export Report
              </Button>
              </Can>
              <Button
                variant="contained"
                size="small"
                startIcon={<BoardIcon />}
                onClick={() => goTasks()}
                sx={{ height: 38, textTransform: 'none', fontWeight: 600, px: 2, boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }}
              >
                Open Task Board
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            px: { xs: 2, md: 2.5 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: '#FAFBFC',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: { xs: 2, sm: 3 },
          }}
        >
          <MetaStat label="Start Date" value={formatShortDate(project?.startDate)} icon={<EventIcon sx={{ fontSize: 18 }} />} />
          <MetaStat label="Target Date" value={formatShortDate(project?.activeDeliveryDate || project?.dueDate)} icon={<EventIcon sx={{ fontSize: 18 }} />} />
          <MetaStat
            label="Project Owner"
            value={
              <Stack direction="row" alignItems="center" gap={1}>
                <Avatar sx={{ width: 26, height: 26, fontSize: '0.7rem', bgcolor: tokens.colors.primary }}>
                  {initials(ownerLabel)}
                </Avatar>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>{ownerLabel}</Typography>
              </Stack>
            }
            icon={<Avatar sx={{ width: 18, height: 18, fontSize: '0.55rem', bgcolor: tokens.colors.primary }}>{initials(ownerLabel)}</Avatar>}
          />
        </Box>
      </Paper>

      {/* KPI cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)', xl: 'repeat(6,1fr)' },
          gap: 2,
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
            trend={k.trend}
            trendUp={k.trendUp}
            trendVariant={k.trendVariant}
            onClick={k.onClick}
            sx={{
              minHeight: 132,
              '& .MuiCardContent-root': { p: 2.5, '&:last-child': { pb: 2.5 } },
              '& h1': { fontSize: { xs: '1.35rem', md: '1.5rem' } },
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
        <SectionCard title="Delivery Health" sx={{ p: 2.5, display: 'flex', flexDirection: 'column' }}>
          {tasksError ? (
            <WidgetError message={tasksError} onRetry={loadTasks} />
          ) : (
            <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, alignItems: 'center' }}>
              <Box sx={{ position: 'relative', width: 112, height: 112, flexShrink: 0, mt: 0.5 }}>
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
                  <Typography sx={{ fontWeight: 650, fontSize: '1.5rem', lineHeight: 1 }}>{healthScore}</Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700 }}>Score /100</Typography>
                </Box>
              </Box>

              <Box sx={{ width: '100%', mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(() => {
                  const deliveryStatus = project?.deliveryStatus || delayAnalysis?.deliveryStatus || 'ON_TRACK';
                  const statusStyle = DELIVERY_STATUS_COLORS[deliveryStatus] || DELIVERY_STATUS_COLORS.ON_TRACK;
                  return (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: `${tokens.radius.button}px`,
                        bgcolor: statusStyle.bg,
                        border: '1px solid',
                        borderColor: statusStyle.border,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: statusStyle.color, mb: 0.35 }}>
                        {deliveryStatusLabel(deliveryStatus)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5 }}>
                        {deliveryStatusMessage(deliveryStatus)}
                      </Typography>
                    </Box>
                  );
                })()}
                {delayAnalysis && (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setDelayDrawerOpen(true)}
                    sx={{ fontWeight: 700, textTransform: 'none', py: 1, borderRadius: `${tokens.radius.button}px` }}
                  >
                    View Delay Analysis
                  </Button>
                )}
              </Box>
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
                  <Line type="monotone" dataKey="actualPct" name="Actual Progress" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="plannedPct" name="Baseline" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </SectionCard>

        <SectionCard title="Project Details" sx={{ display: { xs: 'none', xl: 'flex' }, flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Box>
              <DetailRow label="Project ID">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{projectCode}</Typography>
              </DetailRow>
              <DetailRow label="Owner">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{ownerLabel}</Typography>
              </DetailRow>
              <DetailRow label="Project Manager">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{project?.manager?.name || '—'}</Typography>
              </DetailRow>
              <DetailRow label="Priority">
                <Chip size="small" label={project?.priority || 'Medium'} sx={{ fontWeight: 700, height: 24, bgcolor: '#FEE2E2', color: '#B91C1C' }} />
              </DetailRow>
              <DetailRow label="Status">
                <Chip size="small" label={project?.status || 'Active'} sx={{ fontWeight: 700, height: 24, ...statusChip }} />
              </DetailRow>
              <DetailRow label="Target Date">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{formatShortDate(project?.activeDeliveryDate || project?.dueDate)}</Typography>
              </DetailRow>
              <DetailRow label="Team Size">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{teamSize} Members</Typography>
              </DetailRow>
            </Box>
            {project?.description && (
              <Box
                sx={{
                  mt: 'auto',
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 0.75 }}>
                  Description
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
                  {project.description}
                </Typography>
              </Box>
            )}
          </Box>
        </SectionCard>
      </Box>

      <Stack spacing={2} sx={{ minWidth: 0 }}>
          {/* Mobile / tablet project details */}
          <SectionCard title="Project Details" sx={{ display: { xs: 'block', xl: 'none' } }}>
            <Box>
              <DetailRow label="Project ID">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{projectCode}</Typography>
              </DetailRow>
              <DetailRow label="Owner">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{ownerLabel}</Typography>
              </DetailRow>
              <DetailRow label="Project Manager">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{project?.manager?.name || '—'}</Typography>
              </DetailRow>
              <DetailRow label="Team Size">
                <Typography sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>{teamSize} Members</Typography>
              </DetailRow>
            </Box>
          </SectionCard>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, alignItems: 'stretch' }}>
            <PerformanceDonutChart
              title="Status Distribution"
              data={statusDonut}
              colorMap={STATUS_CHART_COLORS}
              emptyMessage="No tasks yet."
            />
            <PerformanceDonutChart
              title="Priority Distribution"
              data={priorityDonut}
              colorMap={PRIORITY_CHART_COLORS}
              emptyMessage="No priority data."
            />
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
        <MenuItem onClick={() => handleProjectExport('csv')}>
          Export CSV (tasks)
        </MenuItem>
        <MenuItem onClick={() => handleProjectExport('xlsx')}>
          Export Excel (.xlsx)
        </MenuItem>
        <Can permission="report.export.pdf">
          <MenuItem onClick={() => handleProjectExport('pdf')}>
            Export PDF (summary + tasks)
          </MenuItem>
        </Can>
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
