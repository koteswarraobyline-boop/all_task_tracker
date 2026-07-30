import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Assignment as TasksIcon,
  CheckCircle as CheckIcon,
  AccessTime as ProgressIcon,
  WarningAmber as OverdueIcon,
  InfoOutlined as InfoIcon,
  ArrowForward as ArrowIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PageContainer from '../components/PageContainer';
import { tokens } from '../theme';
import { useRole } from '../context/RoleContext';
import { splitTitleAndDescription } from '../components/TaskDetailsDrawer';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { getTaskProgressPercent } from '../utils/taskProgress';
import { initials, formatDate, timeAgo } from '../utils/formatters';

const ACCENT = '#3B82F6';

const STATUS_CHIP = {
  Upcoming: { bgcolor: '#F1F5F9', color: '#475569' },
  Assigned: { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  'In Development': { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  'Code Review': { bgcolor: '#FFEDD5', color: '#C2410C' },
  Testing: { bgcolor: '#FEF3C7', color: '#B45309' },
  Completed: { bgcolor: '#DCFCE7', color: '#166534' },
  Blocked: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  'On Hold': { bgcolor: '#F1F5F9', color: '#64748B' },
};

const PRIORITY_SX = {
  High: { bgcolor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' },
  P0: { bgcolor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' },
  P1: { bgcolor: '#FFEDD5', color: '#C2410C', border: '1px solid #FED7AA' },
  Medium: { bgcolor: '#FFEDD5', color: '#C2410C', border: '1px solid #FED7AA' },
  P2: { bgcolor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' },
  Low: { bgcolor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' },
  P3: { bgcolor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' },
};

const glass = {
  bgcolor: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
  borderRadius: `${tokens.radius.card}px`,
};

function workTasks(list) {
  return (list || []).filter((t) => t.recordType !== 'module');
}

function priorityStyle(p) {
  const key = Object.keys(PRIORITY_SX).find((k) => k.toLowerCase() === String(p || '').toLowerCase());
  return PRIORITY_SX[key] || PRIORITY_SX.Medium;
}

function SectionCard({ title, action, children, id, sx = {} }) {
  return (
    <Paper id={id} elevation={0} sx={{ ...glass, p: { xs: 2.5, md: 3 }, height: '100%', ...sx }}>
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
            <Typography sx={{ fontWeight: 750, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#0F172A' }}>
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

function MiniStat({ label, value, color }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        py: 0.35
      }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1
        }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
        <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 650 }}>{label}</Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0F172A' }}>{value}</Typography>
    </Stack>
  );
}

export default function ClientOverview() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { clientMeta, project: clientProject } = useRole();
  const token = clientMeta?.token;
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [project, setProject] = useState(clientProject);
  const [recentTasksPage, setRecentTasksPage] = useState(0);
  const [recentTasksRowsPerPage, setRecentTasksRowsPerPage] = useState(8);

  const tasksPath = `/client/${token}/tasks`;

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const password = sessionStorage.getItem(`share-password:${token}`) || undefined;
        const data = await api.getClientTasks(token, password);
        setProject(data.project || clientProject);
        setTasks(workTasks(data.tasks));
        setDevelopers(data.developers || []);
      } catch (err) {
        console.error('Client overview load failed:', err);
        setTasks([]);
        setDevelopers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, clientProject]);

  useEffect(() => {
    if (loading) return;
    if (window.location.hash === '#timeline') {
      setTimeout(() => {
        document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [loading]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) =>
      ['Assigned', 'In Development', 'Code Review', 'Testing'].includes(t.status)
    ).length;
    const pending = tasks.filter((t) => ['Upcoming', 'Assigned'].includes(t.status)).length;
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'Completed') return false;
      return new Date(t.dueDate) < today;
    }).length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    const startDates = tasks.map((t) => t.startDate).filter(Boolean).sort();
    const dueDates = tasks.map((t) => t.dueDate).filter(Boolean).sort();
    const members = new Set(tasks.map((t) => t.developerId).filter(Boolean)).size;
    const modules = new Set(tasks.map((t) => t.module).filter(Boolean));
    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      progress,
      startDate: startDates[0] || null,
      dueDate: dueDates.length ? dueDates[dueDates.length - 1] : null,
      members,
      moduleCount: modules.size,
    };
  }, [tasks, today]);

  const projectDateMetrics = useMemo(() => {
    const originalDeliveryDate = project?.originalDeliveryDate || metrics.dueDate;
    const revisedDeliveryDate = project?.revisedDeliveryDate || null;
    const effectiveDueDate = revisedDeliveryDate || originalDeliveryDate;

    let isProjectOverdue = false;
    let projectOverdueDays = 0;
    const isExtended = Boolean(revisedDeliveryDate);

    if (effectiveDueDate && metrics.completed < metrics.total) {
      const dueTime = new Date(effectiveDueDate).setHours(0, 0, 0, 0);
      const nowTime = today.getTime();
      if (!isNaN(dueTime) && dueTime < nowTime) {
        isProjectOverdue = true;
        projectOverdueDays = Math.ceil((nowTime - dueTime) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      originalDeliveryDate,
      revisedDeliveryDate,
      effectiveDueDate,
      deliveryNotes: project?.deliveryNotes || null,
      isProjectOverdue,
      projectOverdueDays,
      isExtended,
    };
  }, [project, metrics, today]);

  const milestones = useMemo(() => {
    const names = [...new Set(tasks.map((t) => t.phase).filter(Boolean))].slice(0, 8);
    if (!names.length) return [];

    const mapped = names.map((name) => {
      const related = tasks.filter((t) => t.phase === name);
      const done =
        related.length > 0
          ? related.every((t) => t.status === 'Completed')
          : false;
      const date =
        related.find((t) => t.dueDate)?.dueDate ||
        related.find((t) => t.startDate)?.startDate ||
        null;
      const pct = related.length
        ? Math.round(
            (related.filter((t) => t.status === 'Completed').length / related.length) * 100
          )
        : 0;
      return {
        name,
        done,
        active: false,
        status: done ? 'Completed' : 'Upcoming',
        date,
        pct,
      };
    });
    const currentIdx = mapped.findIndex((m) => !m.done);
    if (currentIdx >= 0) {
      mapped[currentIdx].active = true;
      mapped[currentIdx].status = 'In Progress';
    }
    return mapped;
  }, [tasks]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
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
    const STATUS_COLOR = {
      'Completed':        '#22C55E',
      'In Development':   '#4F46E5',
      'Assigned':         '#3B82F6',
      'Code Review':      '#6366F1',
      'Testing':          '#06B6D4',
      'Blocked':          '#EF4444',
      'On Hold':          '#F59E0B',
      'Upcoming':         '#64748B',
    };
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 6)
      .map((t) => {
        const { title } = splitTitleAndDescription(t.taskName, t.description);
        let action = 'was updated';
        if (t.status === 'Completed')           action = 'was completed';
        else if (t.status === 'In Development') action = 'is in development';
        else if (t.status === 'Code Review')    action = 'is in code review';
        else if (t.status === 'Testing')        action = 'is being tested';
        else if (t.status === 'Assigned')       action = 'was assigned';
        else if (t.status === 'Blocked')        action = 'is blocked';
        else if (t.status === 'On Hold')        action = 'is on hold';
        else if (t.status === 'Upcoming')       action = 'is upcoming';
        return {
          id: t.id,
          title,
          action,
          status: t.status,
          color: STATUS_COLOR[t.status] || ACCENT,
          when: timeAgo(t.updatedAt),
        };
      });
  }, [tasks]);

  const moduleProgress = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      const key = t.module || 'Unassigned';
      if (!map[key]) map[key] = { total: 0, completed: 0 };
      map[key].total += 1;
      if (t.status === 'Completed') map[key].completed += 1;
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        pct: v.total ? Math.round((v.completed / v.total) * 100) : 0,
        total: v.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [tasks]);

  const clientName = clientMeta?.clientName || clientMeta?.company || 'Client';
  const projectName = project?.name || clientProject?.name || 'Project';

  const linkBtn = (label, path) => (
    <Button
      size="small"
      endIcon={<ArrowIcon sx={{ fontSize: 16 }} />}
      onClick={() => navigate(path)}
      sx={{ fontWeight: 700, color: ACCENT, textTransform: 'none' }}
    >
      {label}
    </Button>
  );

  if (loading) {
    return (
      <PageContainer maxWidth={1600}>
        <Skeleton variant="rounded" height={72} sx={{ mb: 3, borderRadius: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={1600}>
      {/* Ambient wash */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background:
            'radial-gradient(ellipse 70% 45% at 0% 0%, rgba(59,130,246,0.08), transparent 50%), radial-gradient(ellipse 50% 40% at 100% 10%, rgba(99,102,241,0.06), transparent 45%)',
        }}
      />
      {/* Header */}
      <Paper
        component={motion.div}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        elevation={0}
        sx={{
          ...glass,
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 2.5,
            position: 'relative'
          }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                gap: 1,
                mb: 1
              }}>
              <Chip
                size="small"
                label="Read Only"
                sx={{
                  height: 24,
                  fontWeight: 750,
                  fontSize: '0.7rem',
                  bgcolor: '#DBEAFE',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                }}
              />
              <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }} noWrap>
                {projectName}
              </Typography>
            </Stack>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: '1.65rem', md: '2rem' },
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                color: '#0F172A',
                mb: 0.75,
              }}
            >
              Welcome, {clientName}!
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.5 }}>
              Here&apos;s the latest update on your project.
            </Typography>
          </Box>

          <Stack
            sx={{
              gap: 1,
              alignItems: { xs: 'flex-start', md: 'flex-end' }
            }}>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0'
              }}>
              <CalendarIcon sx={{ fontSize: 18, color: ACCENT }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 650, color: '#334155' }}>
                {formatDate(metrics.startDate)} – {formatDate(metrics.dueDate)}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
              Last updated {timeAgo(tasks[0]?.updatedAt)}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
      {/* Overdue alert banner if project is overdue */}
      {projectDateMetrics.isProjectOverdue && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: `${tokens.radius.card}px`,
            bgcolor: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <OverdueIcon sx={{ color: '#DC2626', fontSize: 32 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#991B1B' }}>
              ⚠️ Project Delivery is Overdue by {projectDateMetrics.projectOverdueDays} Day{projectDateMetrics.projectOverdueDays > 1 ? 's' : ''}
            </Typography>
            <Typography sx={{ fontSize: '0.825rem', color: '#7F1D1D', mt: 0.25 }}>
              Original Target Delivery Date: <strong>{formatDate(projectDateMetrics.originalDeliveryDate)}</strong>
              {projectDateMetrics.revisedDeliveryDate && (
                <> (Revised: <strong>{formatDate(projectDateMetrics.revisedDeliveryDate)}</strong>)</>
              )}
            </Typography>
            {projectDateMetrics.deliveryNotes && (
              <Typography sx={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 650, mt: 0.75, fontStyle: 'italic' }}>
                Note from Admin: &ldquo;{projectDateMetrics.deliveryNotes}&rdquo;
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* Read-only notice */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          borderRadius: `${tokens.radius.card}px`,
          bgcolor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-start',
        }}
      >
        <InfoIcon sx={{ color: ACCENT, mt: 0.15 }} />
        <Box>
          <Typography sx={{ fontWeight: 750, fontSize: '0.875rem', color: '#1E40AF', mb: 0.35 }}>
            Read-only project view
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: '#1E3A8A', lineHeight: 1.5 }}>
            You are viewing a read-only version of this project. Contact your project manager if changes are required.
          </Typography>
        </Box>
      </Paper>
      {/* Hero metrics */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: '1.4fr repeat(4, 1fr)',
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={{ ...glass, p: 3 }}>
          <Typography sx={{ fontWeight: 750, fontSize: '0.875rem', mb: 2, color: '#0F172A' }}>
            Overall Progress
          </Typography>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 3
            }}>
            <Box sx={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
              <CircularProgress
                variant="determinate"
                value={100}
                size={112}
                thickness={4.5}
                sx={{ color: '#E2E8F0', position: 'absolute' }}
              />
              <CircularProgress
                variant="determinate"
                value={metrics.progress}
                size={112}
                thickness={4.5}
                sx={{
                  color: ACCENT,
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
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1, color: '#0F172A' }}>
                  {metrics.progress}%
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 650 }}>Complete</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <MiniStat label="Completed" value={metrics.completed} color="#22C55E" />
              <MiniStat label="In Progress" value={metrics.inProgress} color={ACCENT} />
              <MiniStat label="Pending" value={metrics.pending} color="#F59E0B" />
              <MiniStat label="Overdue" value={metrics.overdue} color="#EF4444" />
            </Box>
          </Stack>
        </Paper>

        {[
          {
            label: 'Total Tasks',
            value: metrics.total,
            icon: <TasksIcon />,
            tint: '#EFF6FF',
            color: ACCENT,
            sub: 'View all tasks →',
            onClick: () => navigate(tasksPath),
          },
          {
            label: 'Completed',
            value: metrics.completed,
            icon: <CheckIcon />,
            tint: '#ECFDF5',
            color: '#059669',
            sub: `${metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0}% of total tasks`,
          },
          {
            label: 'In Progress',
            value: metrics.inProgress,
            icon: <ProgressIcon />,
            tint: '#EFF6FF',
            color: ACCENT,
            sub: `${metrics.total ? Math.round((metrics.inProgress / metrics.total) * 100) : 0}% of total tasks`,
          },
          {
            label: 'Overdue',
            value: metrics.overdue,
            icon: <OverdueIcon />,
            tint: '#FEF2F2',
            color: '#DC2626',
            sub: `${metrics.total ? Math.round((metrics.overdue / metrics.total) * 100) : 0}% of total tasks`,
          },
        ].map((card) => (
          <Paper
            key={card.label}
            elevation={0}
            component={motion.div}
            whileHover={{ y: -3 }}
            onClick={card.onClick}
            sx={{
              ...glass,
              p: 2.5,
              cursor: card.onClick ? 'pointer' : 'default',
              transition: tokens.motion.fast,
              '&:hover': card.onClick ? { boxShadow: tokens.shadow.hover } : undefined,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: card.tint,
                color: card.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              {card.icon}
            </Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', mb: 0.5 }}>
              {card.label}
            </Typography>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, mb: 1 }}>
              {card.value}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 650,
                color: card.onClick ? ACCENT : '#94A3B8',
              }}
            >
              {card.sub}
            </Typography>
          </Paper>
        ))}
      </Box>
      {/* Progress widgets + Activity + Info */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        <SectionCard title="Progress">
          <Stack spacing={2.5}>
            {[
              { label: 'Overall completion', value: metrics.progress, color: ACCENT },
              ...(milestones.length
                ? [
                    {
                      label: 'Phase completion',
                      value: Math.round(
                        (milestones.filter((m) => m.done).length / milestones.length) * 100
                      ),
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
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 650, color: '#475569' }}>
                    {row.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 800 }}>{row.value}%</Typography>
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
            {moduleProgress.length > 0 && (
              <>
                <Typography sx={{ fontWeight: 750, fontSize: '0.8rem', pt: 1 }}>Modules</Typography>
                {moduleProgress.map((m) => (
                  <Box key={m.name}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        mb: 0.5
                      }}>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 650 }} noWrap>
                        {m.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 750 }}>{m.pct}%</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={m.pct}
                      sx={{
                        height: 6,
                        borderRadius: 99,
                        bgcolor: '#E2E8F0',
                        '& .MuiLinearProgress-bar': { bgcolor: '#0EA5E9', borderRadius: 99 },
                      }}
                    />
                  </Box>
                ))}
              </>
            )}
          </Stack>
        </SectionCard>

        <SectionCard title="Recently Updated">
          {activity.length === 0 ? (
            <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem', py: 3, textAlign: 'center' }}>
              No recently updated tasks.
            </Typography>
          ) : (
            <Stack spacing={0}>
              {activity.map((a, idx) => (
                <Stack
                  key={a.id}
                  direction="row"
                  sx={{ gap: 1.5, position: 'relative', py: 1.25 }}
                >
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
                  {/* Status dot instead of developer avatar */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: `${a.color}20`,
                      border: `2px solid ${a.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  >
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: a.color }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.45 }}>
                      <Box component="span" sx={{ fontWeight: 750 }}>
                        {`"${a.title}"`}
                      </Box>
                      {' '}
                      <Box component="span" sx={{ color: '#64748B' }}>{a.action}</Box>
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 0.25 }}>{a.when}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard title="Project Information">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
            {/* Row 1: Client & Company */}
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                CLIENT
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }} noWrap>
                {clientName || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                COMPANY
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }} noWrap>
                {clientMeta?.company || '—'}
              </Typography>
            </Box>

            {/* Row 2: Start Date & Delivery Date */}
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                START DATE
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }} noWrap>
                {formatDate(metrics.startDate)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                DELIVERY DATE
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }} noWrap>
                {formatDate(projectDateMetrics.originalDeliveryDate)}
              </Typography>
            </Box>

            {/* Row 3: Revised Date & Project Overdue */}
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                REVISED DATE
              </Typography>
              {projectDateMetrics.revisedDeliveryDate ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 750, color: '#6B21A8' }} noWrap>
                    {formatDate(projectDateMetrics.revisedDeliveryDate)}
                  </Typography>
                  <Chip
                    label="Extended"
                    size="small"
                    sx={{ bgcolor: '#F3E8FF', color: '#6B21A8', fontWeight: 750, height: 20, fontSize: '0.65rem' }}
                  />
                </Stack>
              ) : (
                <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>—</Typography>
              )}
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                PROJECT OVERDUE
              </Typography>
              {projectDateMetrics.isProjectOverdue ? (
                <Chip
                  icon={<OverdueIcon sx={{ fontSize: '14px !important', color: '#DC2626 !important' }} />}
                  label={`${projectDateMetrics.projectOverdueDays} Days Overdue`}
                  size="small"
                  sx={{
                    bgcolor: '#FEF2F2',
                    color: '#B91C1C',
                    fontWeight: 800,
                    border: '1px solid #FCA5A5',
                    height: 22,
                    fontSize: '0.725rem',
                  }}
                />
              ) : (
                <Chip
                  label="On Track"
                  size="small"
                  sx={{
                    bgcolor: '#F0FDF4',
                    color: '#15803D',
                    fontWeight: 700,
                    border: '1px solid #86EFAC',
                    height: 22,
                    fontSize: '0.725rem',
                  }}
                />
              )}
            </Box>

            {/* Row 4: Team Size & Modules */}
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                TEAM SIZE
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }} noWrap>
                {metrics.members || 0}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                MODULES
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }} noWrap>
                {metrics.moduleCount || 0}
              </Typography>
            </Box>

            {/* Row 5: Current Phase & Overdue Tasks */}
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                CURRENT PHASE
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }} noWrap>
                {milestones.find((m) => m.active)?.name || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                OVERDUE TASKS
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 750,
                  color: metrics.overdue > 0 ? '#DC2626' : '#0F172A',
                }}
                noWrap
              >
                {metrics.overdue || 0} task{metrics.overdue === 1 ? '' : 's'}
              </Typography>
            </Box>

            {/* Row 6: Revision / Extension Note (Full Width if present) */}
            {projectDateMetrics.deliveryNotes && (
              <Box sx={{ gridColumn: '1 / -1', pt: 1, borderTop: '1px dashed #E2E8F0' }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#64748B', mb: 0.35, letterSpacing: '0.04em' }}>
                  REVISION / EXTENSION NOTE
                </Typography>
                <Typography sx={{ fontSize: '0.825rem', fontWeight: 650, color: '#334155', fontStyle: 'italic', bgcolor: '#F8FAFC', p: 1.5, borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                  &ldquo;{projectDateMetrics.deliveryNotes}&rdquo;
                </Typography>
              </Box>
            )}
          </Box>
        </SectionCard>
      </Box>
      {/* Recent tasks table */}
      <SectionCard title="Recent Tasks" action={linkBtn('View all tasks', tasksPath)} sx={{ mb: 2 }}>
        {recentTasks.length === 0 ? (
          <Typography sx={{ color: '#94A3B8', textAlign: 'center', py: 4 }}>No tasks to show yet.</Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  {['#', 'Task', 'Module', 'Status', 'Progress', 'Due Date', 'Priority'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontWeight: 750,
                        fontSize: '0.7rem',
                        color: '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        bgcolor: '#F8FAFC',
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedRecentTasks.map((t, idx) => {
                  const chip = STATUS_CHIP[t.status] || STATUS_CHIP.Upcoming;
                  const rowNum = recentTasksPage * recentTasksRowsPerPage + idx + 1;
                  const pct = t.progress ?? 0;
                  const barColor =
                    pct >= 100 ? '#22C55E' :
                    pct >= 60  ? '#0EA5E9' :
                    pct >= 40  ? '#8B5CF6' :
                    pct > 0    ? '#F59E0B' : '#CBD5E1';
                  return (
                    <TableRow
                      key={t.id}
                      hover
                      sx={{
                        bgcolor: idx % 2 === 1 ? 'rgba(248,250,252,0.8)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(59,130,246,0.04)' },
                      }}
                    >
                      <TableCell sx={{ color: '#94A3B8', fontWeight: 650 }}>{rowNum}</TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem' }} noWrap>
                          {t.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem' }} noWrap>
                          {t.module || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={t.status}
                          sx={{ height: 22, fontWeight: 750, fontSize: '0.65rem', ...chip }}
                        />
                      </TableCell>
                      {/* Progress bar — replaces Assigned To */}
                      <TableCell sx={{ minWidth: 140 }}>
                        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 80 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, Math.max(0, pct))}
                              sx={{
                                height: 7,
                                borderRadius: 99,
                                bgcolor: 'rgba(148,163,184,0.2)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: barColor,
                                  borderRadius: 99,
                                  transition: 'transform 0.45s ease',
                                },
                              }}
                            />
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#64748B',
                              minWidth: 28,
                              textAlign: 'right',
                            }}
                          >
                            {pct}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem' }}>{formatDate(t.dueDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={t.priority || 'Medium'}
                          sx={{
                            height: 22,
                            fontWeight: 750,
                            fontSize: '0.65rem',
                            ...priorityStyle(t.priority),
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
    </PageContainer>
  );
}
