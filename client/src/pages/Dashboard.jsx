import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Area,
  AreaChart,
} from 'recharts';
import {
  Box,
  Typography,
  Button,
  Stack,
  Avatar,
  AvatarGroup,
  LinearProgress,
  CircularProgress,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Skeleton,
  Fab,
  Collapse,
  useTheme,
} from '@mui/material';
import {
  Assignment as TasksIcon,
  CheckCircle as CheckIcon,
  AccessTime as ProgressIcon,
  WarningAmber as OverdueIcon,
  HourglassEmpty as PendingIcon,
  Groups as TeamIcon,
  AccountTree as ModulesIcon,
  BugReport as IssuesIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  MoreVert as MoreIcon,
  Dashboard as BoardIcon,
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Schedule as ScheduleIcon,
  CloudUpload as UploadIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PageContainer, { MetricCard } from '../components/PageContainer';
import ShareProjectDialog from '../components/ShareProjectDialog';
import OverviewProjectTimeline from '../components/OverviewProjectTimeline';
import Can from '../components/Can';
import { tokens } from '../theme';
import { useProjectId } from '../hooks/useProjectId';
import { useRole } from '../context/RoleContext';
import { splitTitleAndDescription } from '../components/TaskDetailsDrawer';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { getTaskProgressPercent } from '../utils/taskProgress';

const STATUS_COLORS = {
  Upcoming: '#3B82F6',
  Assigned: '#6366F1',
  'In Development': '#F97316',
  'Code Review': '#EAB308',
  Testing: '#06B6D4',
  Completed: '#22C55E',
  Blocked: '#EF4444',
  'On Hold': '#94A3B8',
};

const STATUS_CHIP = {
  Active: { bgcolor: '#D1FAE5', color: '#047857' },
  Completed: { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  'On Hold': { bgcolor: '#FFEDD5', color: '#C2410C' },
  Delayed: { bgcolor: '#FEE2E2', color: '#B91C1C' },
};

const PRIORITY_SX = {
  High: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  P0: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  P1: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  Medium: { bgcolor: '#FFEDD5', color: '#C2410C' },
  P2: { bgcolor: '#FFEDD5', color: '#C2410C' },
  Low: { bgcolor: '#DCFCE7', color: '#15803D' },
  P3: { bgcolor: '#DCFCE7', color: '#15803D' },
};

const glassSx = {
  bgcolor: 'rgba(255,255,255,0.78)',
  backdropFilter: 'blur(14px)',
  border: '1px solid',
  borderColor: 'rgba(226,232,240,0.95)',
  boxShadow: tokens.shadow.card,
  borderRadius: `${tokens.radius.card}px`,
};

function timeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatShortDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function pctOf(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function workTasks(list) {
  return (list || []).filter((t) => t.recordType !== 'module');
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

function priorityStyle(priority) {
  const key = Object.keys(PRIORITY_SX).find(
    (k) => k.toLowerCase() === String(priority || '').toLowerCase()
  );
  return PRIORITY_SX[key] || PRIORITY_SX.Medium;
}

function SectionCard({ title, action, children, sx = {} }) {
  return (
    <Paper elevation={0} sx={{ ...glassSx, p: 3, height: '100%', ...sx }}>
      {(title || action) && (
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            mb: 2.5
          }}>
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

function EmptyBlock({ title, cta, onClick }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 650, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
        Nothing to show here yet.
      </Typography>
      {cta && (
        <Button size="small" variant="contained" onClick={onClick}>
          {cta}
        </Button>
      )}
    </Box>
  );
}

export default function Dashboard() {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { role, project: clientProject, clientMeta } = useRole();
  const isClient = role === 'client';

  const tasksPath = isClient
    ? `/client/${clientMeta?.token}/tasks`
    : `/projects/${projectId}/tasks`;
  const calendarPath = isClient
    ? `/client/${clientMeta?.token}/calendar`
    : `/projects/${projectId}/calendar`;
  const timelinePath = isClient
    ? `/client/${clientMeta?.token}/timeline`
    : `/projects/${projectId}/timeline`;

  const [project, setProject] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [modules, setModules] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [recentTasksPage, setRecentTasksPage] = useState(0);
  const [recentTasksRowsPerPage, setRecentTasksRowsPerPage] = useState(8);
  const [mobileOpen, setMobileOpen] = useState({
    team: true,
    tasks: true,
    activity: true,
    charts: true,
  });

  const favKey = `tt_fav_project_${projectId}`;

  useEffect(() => {
    setFavorite(localStorage.getItem(favKey) === '1');
  }, [favKey]);

  const toggleFavorite = () => {
    const next = !favorite;
    setFavorite(next);
    localStorage.setItem(favKey, next ? '1' : '0');
  };

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [devs, metrics, tasksResponse] = await Promise.all([
        api.getDevelopers().catch(() => []),
        api.getProjectDashboard(projectId),
        api.getProjectTasks(projectId, { limit: -1 }),
      ]);

      if (isClient && clientProject) {
        setProject(clientProject);
      } else {
        const allProjects = await api.getProjects();
        const found = (allProjects || []).find((p) => p.id === parseInt(projectId, 10));
        setProject(found || { name: `Project #${projectId}`, id: projectId });
      }

      const all = tasksResponse?.tasks || [];
      setModules(all.filter((t) => t.recordType === 'module'));
      setTasks(workTasks(all));
      setDevelopers(devs || []);
      setDashboardData(metrics);
    } catch (error) {
      console.error('Failed to load project overview:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, isClient, clientProject]);

  useEffect(() => {
    load();
  }, [load]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const metrics = useMemo(() => {
    const list = tasks;
    const total = list.length;
    const completed = list.filter((t) => t.status === 'Completed').length;
    const inProgress = list.filter((t) =>
      ['Assigned', 'In Development', 'Code Review', 'Testing'].includes(t.status)
    ).length;
    const pending = list.filter((t) => ['Upcoming', 'Assigned'].includes(t.status)).length;
    const overdue = list.filter((t) => {
      if (!t.dueDate || t.status === 'Completed') return false;
      return new Date(t.dueDate) < today;
    }).length;
    const blocked = list.filter((t) => t.status === 'Blocked').length;
    const moduleCount = modules.length || project?.moduleCount || new Set(list.map((t) => t.module).filter(Boolean)).size;
    const members = new Set(list.map((t) => t.developerId).filter(Boolean)).size;
    const progress = total ? Math.round((completed / total) * 100) : project?.progress || 0;
    const estimated = list.reduce((s, t) => s + (Number(t.estimatedHours) || 0), 0);
    const actual = list.reduce((s, t) => s + (Number(t.actualHours) || 0), 0);
    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      blocked,
      moduleCount,
      members,
      progress,
      remaining: Math.max(0, total - completed),
      estimated,
      actual,
    };
  }, [tasks, modules, project, today]);

  const daysRemaining = useMemo(() => {
    const due = project?.dueDate;
    if (!due) return null;
    const diff = Math.ceil((new Date(due) - today) / 86400000);
    return diff;
  }, [project, today]);

  const statusLegend = useMemo(() => {
    if (!dashboardData?.statusDistribution) return [];
    const total = metrics.total || 1;
    return dashboardData.statusDistribution.map((row) => ({
      ...row,
      color: STATUS_COLORS[row.name] || '#64748B',
      pct: pctOf(row.value, total),
    }));
  }, [dashboardData, metrics.total]);

  const timelineData = useMemo(() => {
    const raw = dashboardData?.taskProgressTimeline || [];
    return raw.slice(-14).map((row) => ({
      ...row,
      label: String(row.date).slice(5),
    }));
  }, [dashboardData]);

  const phases = useMemo(() => {
    const names = [
      ...new Set(tasks.map((t) => t.phase).filter((p) => p && String(p).trim())),
    ].slice(0, 8);
    if (!names.length) return [];

    const built = names.map((name) => {
      const related = tasks.filter((t) => t.phase === name);
      const doneCount = related.filter((t) => t.status === 'Completed').length;
      const pct = related.length ? Math.round((doneCount / related.length) * 100) : 0;
      return {
        name,
        pct,
        done: pct >= 100,
      };
    });
    const currentIdx = built.findIndex((p) => p.pct < 100);
    return built.map((p, idx) => ({
      ...p,
      current: currentIdx >= 0 && idx === currentIdx,
    }));
  }, [tasks]);

  const teamCards = useMemo(() => {
    return developers
      .map((dev) => {
        const mine = tasks.filter((t) => t.developerId === dev.id);
        if (!mine.length) return null;
        const completed = mine.filter((t) => t.status === 'Completed').length;
        const active = mine.filter((t) =>
          ['Assigned', 'In Development', 'Code Review', 'Testing'].includes(t.status)
        ).length;
        const workload = mine.length ? Math.round((active / mine.length) * 100) : 0;
        const isManager = project?.manager?.id === dev.id;
        return {
          id: dev.id,
          name: getDeveloperDisplayName(dev) || dev.name,
          color: dev.color || '#4F46E5',
          role: isManager ? 'Project Manager' : 'Developer',
          currentTasks: active,
          total: mine.length,
          completed,
          workload,
          isManager,
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.isManager) - Number(a.isManager) || b.total - a.total)
      .slice(0, 8);
  }, [developers, tasks, project]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((t) => {
        const { title } = splitTitleAndDescription(t.taskName, t.description);
        return { ...t, title, progress: getTaskProgressPercent(t) };
      });
  }, [tasks]);

  const pagedRecentTasks = useMemo(() => {
    const start = recentTasksPage * recentTasksRowsPerPage;
    return recentTasks.slice(start, start + recentTasksRowsPerPage);
  }, [recentTasks, recentTasksPage, recentTasksRowsPerPage]);

  useEffect(() => {
    setRecentTasksPage(0);
  }, [tasks.length, recentTasksRowsPerPage]);

  const activity = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 10)
      .map((t) => {
        const { title } = splitTitleAndDescription(t.taskName, t.description);
        const who = getDeveloperDisplayName(t.developer) || 'Unassigned';
        let action = 'updated';
        let color = '#F59E0B';
        if (t.status === 'Completed') {
          action = 'completed';
          color = '#22C55E';
        } else if (t.status === 'Blocked') {
          action = 'flagged blocked';
          color = '#EF4444';
        } else if (t.status === 'In Development') {
          action = 'started working on';
          color = '#4F46E5';
        } else if (t.status === 'Assigned') {
          action = 'was assigned';
          color = '#6366F1';
        } else if (t.status === 'Upcoming') {
          action = 'was created';
          color = '#3B82F6';
        }
        return {
          id: t.id,
          who,
          color: t.developer?.color || color,
          action,
          title,
          when: timeAgo(t.updatedAt),
          eventColor: color,
        };
      });
  }, [tasks]);

  const workloadBars = useMemo(() => {
    return (dashboardData?.developerWorkload || [])
      .filter((d) => d.developerName !== 'Unassigned')
      .map((d) => ({
        name: String(d.developerName || '').split(' ')[0] || d.developerName,
        fullName: d.developerName,
        completed: d.completed || 0,
        inProgress: d.inProgress || 0,
        upcoming: d.upcoming || 0,
        total: (d.completed || 0) + (d.inProgress || 0) + (d.upcoming || 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [dashboardData]);

  const deadlines = useMemo(() => {
    const buckets = { today: [], tomorrow: [], week: [], overdue: [] };
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const week = new Date(today);
    week.setDate(today.getDate() + 7);

    tasks.forEach((t) => {
      if (!t.dueDate || t.status === 'Completed') return;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      const { title } = splitTitleAndDescription(t.taskName, t.description);
      const item = { ...t, title };
      if (due < today) buckets.overdue.push(item);
      else if (due.getTime() === today.getTime()) buckets.today.push(item);
      else if (due.getTime() === tomorrow.getTime()) buckets.tomorrow.push(item);
      else if (due <= week) buckets.week.push(item);
    });
    return buckets;
  }, [tasks, today]);

  const timeUsage =
    metrics.estimated > 0
      ? Math.min(100, Math.round((metrics.actual / metrics.estimated) * 100))
      : 0;

  const tags = project?.tags || [];
  const statusChip = STATUS_CHIP[project?.status] || STATUS_CHIP.Active;
  const nextMilestone = phases.find((p) => !p.done) || phases[phases.length - 1];

  const kpis = [
    {
      label: 'Total Tasks',
      value: metrics.total,
      icon: <TasksIcon />,
      tint: '#EFF6FF',
      iconColor: '#2563EB',
      trend: `• ${metrics.remaining} remaining`,
      trendUp: true,
    },
    {
      label: 'Completed',
      value: metrics.completed,
      icon: <CheckIcon />,
      tint: '#ECFDF5',
      iconColor: '#059669',
      trend: `• ${metrics.progress}% done`,
      trendUp: true,
    },
    {
      label: 'In Progress',
      value: metrics.inProgress,
      icon: <ProgressIcon />,
      tint: '#FFF7ED',
      iconColor: '#EA580C',
    },
    {
      label: 'Pending',
      value: metrics.pending,
      icon: <PendingIcon />,
      tint: '#F8FAFC',
      iconColor: '#64748B',
    },
    {
      label: 'Overdue',
      value: metrics.overdue,
      icon: <OverdueIcon />,
      tint: '#FEF2F2',
      iconColor: '#DC2626',
      ...(metrics.overdue > 0
        ? { trend: `• ${metrics.overdue} overdue`, trendUp: false }
        : {}),
    },
    {
      label: 'Team Members',
      value: metrics.members || teamCards.length,
      icon: <TeamIcon />,
      tint: '#EEF2FF',
      iconColor: '#6366F1',
    },
    {
      label: 'Modules',
      value: metrics.moduleCount,
      icon: <ModulesIcon />,
      tint: '#F5F3FF',
      iconColor: '#7C3AED',
    },
    {
      label: 'Blocked',
      value: metrics.blocked,
      icon: <IssuesIcon />,
      tint: '#FFF1F2',
      iconColor: '#E11D48',
      ...(metrics.blocked > 0
        ? { trend: `• ${metrics.blocked} blocked`, trendUp: false }
        : {}),
    },
  ];

  const toggleSection = (key) =>
    setMobileOpen((s) => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return (
      <PageContainer maxWidth={1800}>
        <Skeleton variant="rounded" height={140} sx={{ mb: 3, borderRadius: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={1800}>
      {/* Ambient background wash */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background:
            'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(79,70,229,0.08), transparent 50%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(14,165,233,0.06), transparent 45%)',
        }}
      />
      {/* HEADER */}
      <Paper
        component={motion.div}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        elevation={0}
        sx={{ ...glassSx, p: { xs: 2.5, md: 3.5 }, mb: 4, position: 'relative', overflow: 'hidden' }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: 'stretch', lg: 'center' },
            gap: 3,
            position: 'relative'
          }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              sx={{
                alignItems: "flex-start",
                gap: 1.5,
                mb: 1
              }}>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: '1.65rem', md: '2.15rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.2,
                  flex: 1,
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                {project?.name || 'Project'}
              </Typography>
              <Stack
                direction="row"
                sx={{
                  gap: 0.5,
                  flexShrink: 0
                }}>
                <Tooltip title={favorite ? 'Unfavorite' : 'Favorite'}>
                  <IconButton onClick={toggleFavorite} size="small" sx={{ color: favorite ? '#F59E0B' : 'text.secondary' }}>
                    {favorite ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                </Tooltip>
                {!isClient && (
                  <Can permission="project.share">
                    <Tooltip title="Share">
                      <IconButton size="small" onClick={() => setShareOpen(true)}>
                        <ShareIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Can>
                )}
                {!isClient && (
                  <Can permission="csv.upload">
                    <Tooltip title="Import / Update">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/projects/upload?projectId=${projectId}`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Can>
                )}
                <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            {project?.clientName && (
              <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                {project.clientName}
              </Typography>
            )}
            {project?.description && (
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                  lineHeight: 1.55,
                  mb: 2,
                  maxWidth: 640,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {project.description}
              </Typography>
            )}

            <Stack
              direction="row"
              useFlexGap
              sx={{
                gap: 1,
                flexWrap: "wrap"
              }}>
              <Chip
                size="small"
                label={project?.status || 'Active'}
                sx={{ fontWeight: 700, height: 26, ...statusChip }}
              />
              <Chip
                size="small"
                label={project?.priority || 'Medium'}
                sx={{ fontWeight: 700, height: 26, ...priorityStyle(project?.priority) }}
              />
              {tags.slice(0, 4).map((tag) => (
                <Chip
                  key={tag}
                  size="small"
                  label={tag}
                  sx={{ height: 26, fontWeight: 650, bgcolor: '#EEF2FF', color: '#4338CA' }}
                />
              ))}
            </Stack>
          </Box>

          {/* Progress ring + countdown */}
          <Stack
            direction="row"
            sx={{
              gap: 3,
              alignItems: "center",
              justifyContent: { xs: 'flex-start', lg: 'flex-end' },
              flexShrink: 0
            }}>
            <Box sx={{ position: 'relative', width: 108, height: 108 }}>
              <CircularProgress
                variant="determinate"
                value={100}
                size={108}
                thickness={4}
                sx={{ color: '#E2E8F0', position: 'absolute' }}
              />
              <CircularProgress
                variant="determinate"
                value={metrics.progress}
                size={108}
                thickness={4}
                sx={{
                  color: metrics.progress >= 100 ? '#22C55E' : '#4F46E5',
                  position: 'absolute',
                  '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', lineHeight: 1 }}>
                  {metrics.progress}%
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600 }}>
                  Complete
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                DUE DATE
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                {daysRemaining == null
                  ? '—'
                  : daysRemaining < 0
                    ? `${Math.abs(daysRemaining)}d overdue`
                    : `${daysRemaining} Days`}
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.5 }}>
                {daysRemaining == null
                  ? 'No due date set'
                  : daysRemaining < 0
                    ? `Was due ${formatShortDate(project?.dueDate)}`
                    : `Remaining · ${formatShortDate(project?.dueDate)}`}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Quick actions */}
        <Stack
          direction="row"
          useFlexGap
          sx={{
            gap: 1.25,
            flexWrap: "wrap",
            mt: 3,
            position: 'relative'
          }}>
          {!isClient && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(tasksPath)}>
              Create Task
            </Button>
          )}
          <Button variant="outlined" startIcon={<BoardIcon />} onClick={() => navigate(tasksPath)} sx={{ bgcolor: '#fff' }}>
            Open Board
          </Button>
          <Button variant="outlined" startIcon={<CalendarIcon />} onClick={() => navigate(calendarPath)} sx={{ bgcolor: '#fff' }}>
            Calendar
          </Button>
          {!isClient && (
            <Can permission="project.share">
              <Button variant="outlined" startIcon={<ShareIcon />} onClick={() => setShareOpen(true)} sx={{ bgcolor: '#fff' }}>
                Share Project
              </Button>
            </Can>
          )}
          {!isClient && (
            <Button
              variant="outlined"
              startIcon={<TeamIcon />}
              onClick={() => navigate('/developers')}
              sx={{ bgcolor: '#fff' }}
            >
              Team
            </Button>
          )}
        </Stack>
      </Paper>
      {/* KPI GRID */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2.5,
          mb: 4,
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
          />
        ))}
      </Box>
      {/* MAIN + SIDEBAR */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 320px' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          {/* Overall progress */}
          <SectionCard title="Overall Progress">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '140px 1fr' },
                gap: 3,
                alignItems: 'center',
              }}
            >
              <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto' }}>
                <CircularProgress variant="determinate" value={100} size={120} thickness={5} sx={{ color: '#E2E8F0', position: 'absolute' }} />
                <CircularProgress
                  variant="determinate"
                  value={metrics.progress}
                  size={120}
                  thickness={5}
                  sx={{ color: '#4F46E5', position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
                />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.5rem' }}>{metrics.progress}%</Typography>
                </Box>
              </Box>
              <Stack spacing={2}>
                {[
                  { label: 'Task Completion', value: metrics.progress, color: '#4F46E5' },
                  {
                    label: 'Module Completion',
                    value: modules.length
                      ? pctOf(
                          modules.filter((m) => m.status === 'Completed').length,
                          modules.length
                        )
                      : 0,
                    color: '#7C3AED',
                  },
                  ...(phases.length
                    ? [
                        {
                          label: 'Phase Completion',
                          value: pctOf(phases.filter((p) => p.done).length, phases.length),
                          color: '#22C55E',
                        },
                      ]
                    : []),
                ].map((row) => (
                  <Box key={row.label}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        mb: 0.75
                      }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 650 }}>{row.label}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 750 }}>{row.value}%</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={row.value}
                      sx={{
                        height: 8,
                        borderRadius: 99,
                        bgcolor: '#E2E8F0',
                        '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 99 },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          </SectionCard>

          {/* Project Timeline — Gantt with filters */}
          <OverviewProjectTimeline
            tasks={tasks}
            developers={developers}
            projectName={project?.name || ''}
            loading={loading}
            readonly={isClient}
            dark={isDark}
            height={400}
            onOpenFull={() => navigate(timelinePath)}
            onTaskClick={() => navigate(tasksPath)}
            onDatesChange={
              isClient
                ? undefined
                : async (taskId, dates) => {
                    const updated = await api.updateTask(taskId, dates);
                    setTasks((prev) =>
                      prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t))
                    );
                    return updated;
                  }
            }
          />

          {/* Team */}
          <Box>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
                display: { md: 'none' }
              }}>
              <Typography sx={{ fontWeight: 750 }}>Team Members</Typography>
              <IconButton size="small" onClick={() => toggleSection('team')}>
                {mobileOpen.team ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Stack>
            <Collapse in={mobileOpen.team} sx={{ display: { xs: 'block', md: 'block' } }}>
              <Typography sx={{ fontWeight: 750, fontSize: '0.95rem', mb: 2, display: { xs: 'none', md: 'block' } }}>
                Team Members
              </Typography>
              {teamCards.length === 0 ? (
                <SectionCard>
                  <EmptyBlock title="No team assigned" cta="Open Board" onClick={() => navigate(tasksPath)} />
                </SectionCard>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                    gap: 2,
                  }}
                >
                  {teamCards.map((m) => (
                    <Paper
                      key={m.id}
                      component={motion.div}
                      whileHover={{ y: -3 }}
                      elevation={0}
                      sx={{
                        ...glassSx,
                        p: 2.5,
                        borderColor: m.isManager ? 'primary.main' : 'rgba(226,232,240,0.95)',
                        boxShadow: m.isManager ? '0 8px 24px rgba(79,70,229,0.12)' : tokens.shadow.card,
                      }}
                    >
                      <Stack
                        direction="row"
                        sx={{
                          gap: 1.5,
                          alignItems: "center",
                          mb: 1.5
                        }}>
                        <Avatar sx={{ bgcolor: m.color, width: 44, height: 44, fontWeight: 700 }}>
                          {initials(m.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 750, fontSize: '0.875rem' }} noWrap>
                            {m.name}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{m.role}</Typography>
                        </Box>
                      </Stack>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
                        {m.currentTasks} active · {m.completed} done
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 650, mb: 0.5 }}>
                        Workload {m.workload}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={m.workload}
                        sx={{
                          height: 6,
                          borderRadius: 99,
                          mb: 1.5,
                          bgcolor: '#E2E8F0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: m.workload > 80 ? '#EF4444' : '#4F46E5',
                            borderRadius: 99,
                          },
                        }}
                      />
                      <Button size="small" variant="contained" fullWidth onClick={() => navigate(tasksPath)}>
                        Tasks
                      </Button>
                    </Paper>
                  ))}
                </Box>
              )}
            </Collapse>
          </Box>

          {/* Recent tasks table */}
          <SectionCard
            title="Recent Tasks"
            action={
              <Button size="small" endIcon={<OpenIcon sx={{ fontSize: 14 }} />} onClick={() => navigate(tasksPath)}>
                Open Board
              </Button>
            }
          >
            {recentTasks.length === 0 ? (
              <EmptyBlock title="No Tasks" cta="Open Board" onClick={() => navigate(tasksPath)} />
            ) : (
              <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                <Table stickyHeader size="small" sx={{ minWidth: 820 }}>
                  <TableHead>
                    <TableRow>
                      {['Task Name', 'Module', 'Priority', 'Status', 'Assignee', 'Progress', 'Due Date', ''].map((c) => (
                        <TableCell key={c || 'a'}>{c}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedRecentTasks.map((t) => (
                      <TableRow key={t.id} hover sx={{ '&:hover': { bgcolor: 'rgba(79,70,229,0.03)' } }}>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }} noWrap>
                            {t.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8rem' }}>{t.module || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t.priority || 'Medium'}
                            sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', ...priorityStyle(t.priority) }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t.status}
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              bgcolor: `${STATUS_COLORS[t.status] || '#94A3B8'}22`,
                              color: STATUS_COLORS[t.status] || '#64748B',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {t.developer ? (
                            <Stack
                              direction="row"
                              sx={{
                                alignItems: "center",
                                gap: 1
                              }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: t.developer.color }}>
                                {initials(getDeveloperDisplayName(t.developer))}
                              </Avatar>
                              <Typography sx={{ fontSize: '0.8rem' }} noWrap>
                                {getDeveloperDisplayName(t.developer)}
                              </Typography>
                            </Stack>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={t.progress}
                            sx={{
                              height: 6,
                              borderRadius: 99,
                              bgcolor: '#E2E8F0',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: t.progress >= 100 ? '#22C55E' : '#4F46E5',
                                borderRadius: 99,
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8rem' }}>{formatShortDate(t.dueDate)}</Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => navigate(tasksPath)}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recentTasks.length > recentTasksRowsPerPage && (
                  <TablePagination
                    component="div"
                    count={recentTasks.length}
                    page={recentTasksPage}
                    onPageChange={(_e, p) => setRecentTasksPage(p)}
                    rowsPerPage={recentTasksRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRecentTasksRowsPerPage(parseInt(e.target.value, 10));
                      setRecentTasksPage(0);
                    }}
                    rowsPerPageOptions={[5, 8, 15, 25]}
                    sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                  />
                )}
              </TableContainer>
            )}
          </SectionCard>

          {/* Charts row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 3,
            }}
          >
            <SectionCard title="Task Status">
              {statusLegend.length === 0 ? (
                <EmptyBlock title="No status data" />
              ) : (
                <Box sx={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusLegend}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={84}
                        paddingAngle={3}
                      >
                        {statusLegend.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
              <Stack
                direction="row"
                useFlexGap
                sx={{
                  gap: 1,
                  flexWrap: "wrap",
                  justifyContent: "center"
                }}>
                {statusLegend.slice(0, 6).map((s) => (
                  <Chip
                    key={s.name}
                    size="small"
                    label={`${s.name} ${s.pct}%`}
                    sx={{ height: 24, fontWeight: 650, bgcolor: `${s.color}18`, color: s.color }}
                  />
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="Completion Trend">
              {timelineData.length === 0 ? (
                <EmptyBlock title="No trend data" />
              ) : (
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="ovComplete" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="completedTasks" stroke="#4F46E5" fill="url(#ovComplete)" strokeWidth={2} />
                      <Area type="monotone" dataKey="totalTasks" stroke="#94A3B8" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </SectionCard>

            <SectionCard title="Developer Workload" sx={{ gridColumn: { lg: '1 / -1' } }}>
              {workloadBars.length === 0 ? (
                <EmptyBlock title="No workload data" />
              ) : (
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadBars} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="completed" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="inProgress" stackId="a" fill="#4F46E5" />
                      <Bar dataKey="upcoming" stackId="a" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </SectionCard>
          </Box>

          {/* Activity + Info + Deadlines + Files */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' },
              gap: 3,
            }}
          >
            <SectionCard title="Recently Updated">
              {activity.length === 0 ? (
                <EmptyBlock title="No Recent Updates" />
              ) : (
                <Stack spacing={0} sx={{ position: 'relative', pl: 1 }}>
                  {activity.map((a, idx) => (
                    <Stack
                      key={a.id}
                      direction="row"
                      sx={{
                        gap: 1.5,
                        position: 'relative',
                        py: 1.25
                      }}>
                      {idx < activity.length - 1 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 15,
                            top: 40,
                            bottom: -4,
                            width: 2,
                            bgcolor: '#E2E8F0',
                          }}
                        />
                      )}
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.7rem', bgcolor: a.color, zIndex: 1 }}>
                        {initials(a.who)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.45 }}>
                          <Box component="span" sx={{ fontWeight: 750 }}>{a.who}</Box>
                          {' '}
                          <Box component="span" sx={{ color: a.eventColor, fontWeight: 650 }}>{a.action}</Box>
                          {' '}
                          <Box component="span" sx={{ fontWeight: 600 }}>&ldquo;{a.title}&rdquo;</Box>
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.25 }}>
                          {a.when}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>

            <Stack spacing={3}>
              <SectionCard title="Project Information">
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {[
                    ['Client', project?.clientName || '—'],
                    ['Manager', project?.manager?.name || '—'],
                    ['Created', formatShortDate(project?.createdAt)],
                    ['Updated', timeAgo(project?.lastUpdated) || '—'],
                    ['Start', formatShortDate(project?.startDate)],
                    ['Due', formatShortDate(project?.dueDate)],
                    ['Est. Hours', `${metrics.estimated || 0}h`],
                    ['Actual Hours', `${metrics.actual || 0}h`],
                    ['Phase', nextMilestone?.name || '—'],
                    ['Release', tags[0] || '—'],
                  ].map(([label, value]) => (
                    <Box key={label}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', mb: 0.35 }}>
                        {label.toUpperCase()}
                      </Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {tags.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                      TECHNOLOGY / TAGS
                    </Typography>
                    <Stack
                      direction="row"
                      useFlexGap
                      sx={{
                        gap: 0.75,
                        flexWrap: "wrap"
                      }}>
                      {tags.map((t) => (
                        <Chip key={t} label={t} size="small" sx={{ fontWeight: 650, bgcolor: '#EEF2FF', color: '#4338CA' }} />
                      ))}
                    </Stack>
                  </>
                )}
              </SectionCard>

              <SectionCard title="Upcoming Deadlines">
                {[
                  { key: 'overdue', label: 'Overdue', color: '#EF4444', items: deadlines.overdue },
                  { key: 'today', label: 'Due Today', color: '#F59E0B', items: deadlines.today },
                  { key: 'tomorrow', label: 'Due Tomorrow', color: '#3B82F6', items: deadlines.tomorrow },
                  { key: 'week', label: 'Next Week', color: '#64748B', items: deadlines.week },
                ].map((bucket) =>
                  bucket.items.length === 0 ? null : (
                    <Box key={bucket.key} sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 750, color: bucket.color, mb: 0.75 }}>
                        {bucket.label} ({bucket.items.length})
                      </Typography>
                      {bucket.items.slice(0, 3).map((t) => (
                        <Stack
                          key={t.id}
                          direction="row"
                          onClick={() => navigate(tasksPath)}
                          sx={{
                            justifyContent: "space-between",
                            gap: 1,
                            py: 0.75,
                            px: 1,
                            mb: 0.5,
                            borderRadius: 1.5,
                            bgcolor: '#F8FAFC',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: '#EEF2FF' }
                          }}>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 650 }} noWrap>
                            {t.title}
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>
                            {formatShortDate(t.dueDate)}
                          </Typography>
                        </Stack>
                      ))}
                    </Box>
                  )
                )}
                {!deadlines.overdue.length &&
                  !deadlines.today.length &&
                  !deadlines.tomorrow.length &&
                  !deadlines.week.length && (
                    <EmptyBlock title="No upcoming deadlines" cta="Calendar" onClick={() => navigate(calendarPath)} />
                  )}
              </SectionCard>
            </Stack>
          </Box>

        </Stack>

        {/* RIGHT SIDEBAR */}
        <Stack
          spacing={2.5}
          sx={{
            display: { xs: 'none', xl: 'flex' },
            position: 'sticky',
            top: 88,
          }}
        >
          {phases.length > 0 && (
            <SectionCard title="Next Milestone">
              <Typography sx={{ fontWeight: 750, mb: 0.5 }}>{nextMilestone?.name || '—'}</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1.5 }}>
                {nextMilestone?.done ? 'Completed' : `${nextMilestone?.pct || 0}% complete`}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={nextMilestone?.pct || 0}
                sx={{
                  height: 8,
                  borderRadius: 99,
                  bgcolor: '#E2E8F0',
                  '& .MuiLinearProgress-bar': { bgcolor: '#4F46E5', borderRadius: 99 },
                }}
              />
            </SectionCard>
          )}

          <SectionCard title="Time Tracking">
            {metrics.estimated === 0 && metrics.actual === 0 ? (
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                No hours logged
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                <Stack direction="row" sx={{
                  justifyContent: "space-between"
                }}>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Estimated</Typography>
                  <Typography sx={{ fontWeight: 750, fontSize: '0.85rem' }}>{metrics.estimated || 0}h</Typography>
                </Stack>
                <Stack direction="row" sx={{
                  justifyContent: "space-between"
                }}>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Actual</Typography>
                  <Typography sx={{ fontWeight: 750, fontSize: '0.85rem' }}>{metrics.actual || 0}h</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={timeUsage}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    bgcolor: '#E2E8F0',
                    '& .MuiLinearProgress-bar': { bgcolor: '#0EA5E9', borderRadius: 99 },
                  }}
                />
              </Stack>
            )}
          </SectionCard>

          <SectionCard title="Recent Contributors">
            {teamCards.length === 0 ? (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No contributors yet</Typography>
            ) : (
              <>
                <AvatarGroup max={6} sx={{ mb: 1.5, justifyContent: 'flex-start', '& .MuiAvatar-root': { width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700 } }}>
                  {teamCards.map((m) => (
                    <Tooltip key={m.id} title={m.name}>
                      <Avatar sx={{ bgcolor: m.color }}>{initials(m.name)}</Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {teamCards.length} active on this project
                </Typography>
              </>
            )}
          </SectionCard>

          <SectionCard title="Notifications">
            <Stack spacing={1}>
              {metrics.overdue > 0 && (
                <Stack
                  direction="row"
                  sx={{
                    gap: 1,
                    alignItems: "flex-start"
                  }}>
                  <OverdueIcon sx={{ fontSize: 16, color: '#EF4444', mt: 0.25 }} />
                  <Typography sx={{ fontSize: '0.8rem' }}>{metrics.overdue} overdue task(s)</Typography>
                </Stack>
              )}
              {metrics.blocked > 0 && (
                <Stack
                  direction="row"
                  sx={{
                    gap: 1,
                    alignItems: "flex-start"
                  }}>
                  <IssuesIcon sx={{ fontSize: 16, color: '#E11D48', mt: 0.25 }} />
                  <Typography sx={{ fontSize: '0.8rem' }}>{metrics.blocked} open issue(s)</Typography>
                </Stack>
              )}
              {daysRemaining != null && daysRemaining <= 14 && daysRemaining >= 0 && (
                <Stack
                  direction="row"
                  sx={{
                    gap: 1,
                    alignItems: "flex-start"
                  }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: '#F59E0B', mt: 0.25 }} />
                  <Typography sx={{ fontSize: '0.8rem' }}>Due in {daysRemaining} day(s)</Typography>
                </Stack>
              )}
              {metrics.overdue === 0 && metrics.blocked === 0 && (
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>You&apos;re all caught up.</Typography>
              )}
            </Stack>
          </SectionCard>
        </Stack>
      </Box>
      {!isClient && (
        <Fab
          color="primary"
          aria-label="Create task"
          onClick={() => navigate(tasksPath)}
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          }}
        >
          <AddIcon />
        </Fab>
      )}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            navigate(tasksPath);
            setMenuAnchor(null);
          }}
        >
          <BoardIcon fontSize="small" sx={{ mr: 1.5 }} /> Open Board
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(calendarPath);
            setMenuAnchor(null);
          }}
        >
          <CalendarIcon fontSize="small" sx={{ mr: 1.5 }} /> Calendar
        </MenuItem>
        {!isClient && (
          <Can permission="csv.upload">
            <MenuItem
              onClick={() => {
                navigate(`/projects/upload?projectId=${projectId}`);
                setMenuAnchor(null);
              }}
            >
              <UploadIcon fontSize="small" sx={{ mr: 1.5 }} /> Import CSV
            </MenuItem>
          </Can>
        )}
        <MenuItem
          onClick={() => {
            load();
            setMenuAnchor(null);
          }}
        >
          Refresh
        </MenuItem>
      </Menu>
      <ShareProjectDialog open={shareOpen} onClose={() => setShareOpen(false)} project={project} />
    </PageContainer>
  );
}
