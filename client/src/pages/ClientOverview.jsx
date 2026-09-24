import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
} from '@mui/material';
import PaginationBar from '../components/PaginationBar';
import {
  Assignment as TasksIcon,
  CheckCircle as CheckIcon,
  AccessTime as ProgressIcon,
  WarningAmber as OverdueIcon,
  ArrowForward as ArrowIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PageContainer from '../components/PageContainer';
import { tokens } from '../theme';
import { useRole } from '../context/RoleContext';
import { splitTitleAndDescription } from '../components/TaskDetailsDrawer';
import { getTaskProgressPercent } from '../utils/taskProgress';
import { DeliveryHealthCard } from '../components/DeliveryHealth';
import { formatDate, timeAgo } from '../utils/formatters';
import { comparePhaseNames } from '../utils/phaseSort';

const ACCENT = '#2563EB';

const STATUS_CHIP = {
  Upcoming: { bgcolor: '#F1F5F9', color: '#64748B' },
  Assigned: { bgcolor: '#EFF6FF', color: '#2563EB' },
  'In Development': { bgcolor: '#EFF6FF', color: '#2563EB' },
  Testing: { bgcolor: '#EFF6FF', color: '#2563EB' },
  Completed: { bgcolor: '#ECFDF5', color: '#15803D' },
  Blocked: { bgcolor: '#FFFBEB', color: '#D97706' },
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
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: tokens.shadow.card,
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
            <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.01em', color: 'text.primary' }}>
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
  const { clientMeta, project: clientProject } = useRole();
  const token = clientMeta?.token;
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(clientProject);
  const [delayAnalysis, setDelayAnalysis] = useState(null);
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
        setDelayAnalysis(data.delayAnalysis || null);
        setTasks(workTasks(data.tasks));
      } catch (err) {
        console.error('Client overview load failed:', err);
        setTasks([]);
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
      ['Assigned', 'In Development', 'Testing'].includes(t.status) || t.status === 'Code Review'
    ).length;
    const pending = tasks.filter((t) => ['Upcoming', 'Assigned'].includes(t.status)).length;
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'Completed') return false;
      return new Date(t.dueDate) < today;
    }).length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    const startDates = tasks.map((t) => t.startDate).filter(Boolean).sort();
    const dueDates = tasks.map((t) => t.dueDate).filter(Boolean).sort();
    const members = 0;
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
    const effectiveDueDate =
      project?.activeDeliveryDate || project?.effectiveDueDate || revisedDeliveryDate || originalDeliveryDate;

    return {
      originalDeliveryDate,
      revisedDeliveryDate,
      effectiveDueDate,
      deliveryNotes: project?.deliveryNotes || null,
      isProjectOverdue:
        project?.isBehindSchedule ||
        delayAnalysis?.deliveryStatus === 'OVERDUE' ||
        (project?.daysBehindSchedule || 0) > 0,
      projectOverdueDays:
        project?.daysBehindSchedule || delayAnalysis?.daysBehindSchedule || 0,
      isExtended: Boolean(revisedDeliveryDate),
    };
  }, [project, delayAnalysis, metrics]);

  const milestones = useMemo(() => {
    const names = [...new Set(tasks.map((t) => t.phase).filter(Boolean))]
      .sort(comparePhaseNames)
      .slice(0, 8);
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
      'In Development':   '#2563EB',
      'Assigned':         '#3B82F6',
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
        else if (t.status === 'Testing' || t.status === 'Code Review') action = 'is being tested';
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
      <PageContainer maxWidth="100%">
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
    <PageContainer maxWidth="100%">
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
                fontSize: { xs: '1.35rem', md: '1.5rem' },
                fontWeight: 650,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                color: 'text.primary',
                mb: 0.75,
              }}
            >
              Welcome, {clientName}!
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', lineHeight: 1.5 }}>
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        <DeliveryHealthCard
          analysis={{
            ...(delayAnalysis || {}),
            deliveryStatus: delayAnalysis?.deliveryStatus || project?.deliveryStatus,
            daysOverdue: projectDateMetrics.projectOverdueDays,
            daysBehindSchedule: projectDateMetrics.projectOverdueDays,
            completionPercent: metrics.progress,
            deliveryDate: projectDateMetrics.effectiveDueDate,
            primaryDelayDriver: delayAnalysis?.primaryDelayedWork
              ? {
                  taskName: delayAnalysis.primaryDelayedWork.taskName,
                  overdueDays: delayAnalysis.primaryDelayedWork.daysBehindSchedule,
                  progress: delayAnalysis.primaryDelayedWork.progress,
                }
              : null,
            lateTaskCount: metrics.overdue,
            remainingTaskCount: metrics.total - metrics.completed,
            isProjectOverdue: projectDateMetrics.isProjectOverdue,
            progress: metrics.progress,
          }}
          compact
          primaryTitleOnly
        />

        <Paper elevation={0} sx={{ ...glass, p: { xs: 2.5, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography sx={{ fontWeight: 750, fontSize: '0.875rem', mb: 2, color: '#0F172A' }}>
            Overall Progress
          </Typography>
          <Stack direction="row" alignItems="center" gap={3}>
            <Box sx={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
              <CircularProgress variant="determinate" value={100} size={100} thickness={4.5} sx={{ color: '#E2E8F0', position: 'absolute' }} />
              <CircularProgress
                variant="determinate"
                value={metrics.progress}
                size={100}
                thickness={4.5}
                sx={{ color: ACCENT, position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
              />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontWeight: 650, fontSize: '1.25rem', lineHeight: 1, color: 'text.primary' }}>{metrics.progress}%</Typography>
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
      </Box>

      {/* Task summary cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          { label: 'Total Tasks', value: metrics.total, icon: <TasksIcon />, tint: '#EFF6FF', color: ACCENT, onClick: () => navigate(tasksPath) },
          { label: 'Completed', value: metrics.completed, icon: <CheckIcon />, tint: '#ECFDF5', color: '#059669' },
          { label: 'In Progress', value: metrics.inProgress, icon: <ProgressIcon />, tint: '#EFF6FF', color: ACCENT },
          { label: 'Overdue', value: metrics.overdue, icon: <OverdueIcon />, tint: '#FEF2F2', color: '#DC2626' },
        ].map((card) => (
          <Paper
            key={card.label}
            elevation={0}
            onClick={card.onClick}
            sx={{
              ...glass,
              p: 2,
              cursor: card.onClick ? 'pointer' : 'default',
              '&:hover': card.onClick ? { boxShadow: tokens.shadow.hover } : undefined,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: card.tint, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>{card.label}</Typography>
                <Typography sx={{ fontSize: '1.35rem', fontWeight: 650, color: 'text.primary', lineHeight: 1.2 }}>{card.value}</Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      {/* Activity + project info side by side */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2.5,
          mb: 3,
        }}
      >
        <SectionCard title="Recently Updated">
          {activity.length === 0 ? (
            <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem', py: 3, textAlign: 'center' }}>
              No recently updated tasks.
            </Typography>
          ) : (
            <Stack spacing={1.25} divider={<Divider flexItem />}>
              {activity.map((a) => (
                <Stack key={a.id} direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: a.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }} noWrap>
                      {a.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{a.when}</Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={a.status}
                    sx={{
                      height: 22,
                      fontWeight: 650,
                      fontSize: '0.65rem',
                      ...(STATUS_CHIP[a.status] || STATUS_CHIP.Upcoming),
                    }}
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard title="Project Information">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {[
              ['Client', clientName || '—'],
              ['Delivery', formatDate(projectDateMetrics.effectiveDueDate || projectDateMetrics.originalDeliveryDate)],
              ['Modules', metrics.moduleCount || 0],
              ['Overdue', metrics.overdue || 0],
              ['Status', projectDateMetrics.isProjectOverdue ? `${projectDateMetrics.projectOverdueDays}d late` : 'On track'],
              ['Phase', milestones.find((m) => m.active)?.name || '—'],
            ].map(([label, value]) => (
              <Box key={label}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 750, color: '#94A3B8', mb: 0.35, letterSpacing: '0.04em' }}>
                  {label.toUpperCase()}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }} noWrap>
                  {value}
                </Typography>
              </Box>
            ))}
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
            {recentTasks.length > 0 && (
              <PaginationBar
                embedded
                zeroBasedPage
                page={recentTasksPage}
                pageCount={Math.max(1, Math.ceil(recentTasks.length / recentTasksRowsPerPage))}
                totalCount={recentTasks.length}
                rowsPerPage={recentTasksRowsPerPage}
                onPageChange={setRecentTasksPage}
                onRowsPerPageChange={(n) => {
                  setRecentTasksRowsPerPage(n);
                  setRecentTasksPage(0);
                }}
                rowsPerPageOptions={[5, 8, 15, 25]}
                itemLabel="tasks"
              />
            )}
          </TableContainer>
        )}
      </SectionCard>
    </PageContainer>
  );
}
