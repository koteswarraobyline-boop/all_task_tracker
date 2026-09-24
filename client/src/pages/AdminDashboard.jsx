import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Avatar,
  Skeleton,
  Alert,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CodeIcon from '@mui/icons-material/Code';
import ScienceIcon from '@mui/icons-material/Science';
import BlockIcon from '@mui/icons-material/Block';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../services/api';
import PageContainer from '../components/PageContainer';
import EmptyState from '../components/EmptyState';
import Can from '../components/Can';
import SimpleDonutChart from '../components/SimpleDonutChart';
import { tokens } from '../theme';
import { timeAgo } from '../utils/formatters';
import { formatShortDate } from '../utils/deliveryHealth';
import { STATUS_LABELS, normalizeLegacyStatus } from '../components/TaskBoard/constants';

const TaskDetailsDrawer = React.lazy(() => import('../components/TaskDetailsDrawer'));

const TotalIcon = FolderOpenIcon;
const CompletedIcon = CheckCircleIcon;
const ProgressIcon = AccessTimeIcon;
const RiskIcon = WarningAmberIcon;
const OverdueIcon = CancelIcon;
const NotificationsIcon = NotificationsNoneIcon;
const CalendarIcon = CalendarMonthIcon;
const ScheduleLateIcon = ScheduleIcon;
const ArrowIcon = ArrowForwardIcon;
const TasksTotalIcon = AssignmentIcon;
const DevIcon = CodeIcon;
const TestingIcon = ScienceIcon;
const BlockedIcon = BlockIcon;
const OnHoldIcon = PauseCircleOutlinedIcon;
const TrendUpIcon = TrendingUpIcon;
const TrendDownIcon = TrendingDownIcon;
const TrendFlatIcon = RemoveIcon;
const ExportIcon = FileDownloadIcon;

const CARD_SX = {
  height: '100%',
  borderRadius: `${tokens.radius.card}px`,
  boxShadow: tokens.shadow.card,
  border: `1px solid ${tokens.colors.border}`,
  bgcolor: tokens.colors.card,
  transition: tokens.motion.fast,
};

const TASK_STATUS_ICONS = {
  total: { icon: TasksTotalIcon, tint: '#EEF2FF', color: tokens.colors.primary },
  completed: { icon: CompletedIcon, tint: '#DCFCE7', color: tokens.colors.success },
  inDevelopment: { icon: DevIcon, tint: '#EEF2FF', color: tokens.colors.primary },
  testing: { icon: TestingIcon, tint: '#F5F3FF', color: '#7C3AED' },
  blocked: { icon: BlockedIcon, tint: '#FEE2E2', color: tokens.colors.danger },
  onHold: { icon: OnHoldIcon, tint: '#FFFBEB', color: tokens.colors.warning },
};

const STATUS_CHIP = {
  'In Development': { bgcolor: '#EFF6FF', color: '#2563EB' },
  Testing: { bgcolor: '#EFF6FF', color: '#2563EB' },
  Completed: { bgcolor: '#ECFDF5', color: '#15803D' },
  Assigned: { bgcolor: '#EFF6FF', color: '#2563EB' },
  Blocked: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  'On Hold': { bgcolor: '#FFFBEB', color: '#D97706' },
  Upcoming: { bgcolor: '#F8FAFC', color: '#64748B' },
};

const LINK_BUTTON_SX = {
  fontWeight: 700,
  textTransform: 'none',
  color: tokens.colors.primary,
  minWidth: 'auto',
  px: 0.5,
  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
};

function getTrendDisplay(trend, variant) {
  if (!trend) return null;
  if (trend.tone === 'neutral') {
    return { text: '— same as last month', color: tokens.colors.textSecondary, Icon: TrendFlatIcon };
  }
  const num = trend.text.match(/([+-]?\d+)/)?.[1]?.replace('+', '') || '';
  const isUp = trend.tone === 'up';
  let color = isUp ? tokens.colors.success : tokens.colors.danger;
  if (variant === 'atRisk' && isUp) color = tokens.colors.warning;
  if (variant === 'overdue' && isUp) color = tokens.colors.danger;
  return {
    text: `${isUp ? '↑' : '↓'} ${num} from last month`,
    color,
    Icon: isUp ? TrendUpIcon : TrendDownIcon,
  };
}

function KpiCard({ label, value, icon, tint, iconColor, trend, trendVariant, onClick, ariaLabel }) {
  const trendDisplay = getTrendDisplay(trend, trendVariant);
  const TrendIcon = trendDisplay?.Icon;

  return (
    <Card
      component="button"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      sx={{
        ...CARD_SX,
        width: '100%',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': { boxShadow: tokens.shadow.hover },
        '&:focus-visible': {
          outline: `3px solid rgba(79,70,229,0.35)`,
          outlineOffset: 2,
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: `${tokens.radius.button}px`,
            bgcolor: tint,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            '& .MuiSvgIcon-root': { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: tokens.colors.textSecondary, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 650, color: tokens.colors.text, lineHeight: 1.15, mb: trendDisplay ? 1.25 : 0 }}>
          {value}
        </Typography>
        {trendDisplay ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {TrendIcon ? <TrendIcon sx={{ fontSize: 14, color: trendDisplay.color }} /> : null}
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: trendDisplay.color }}>
              {trendDisplay.text}
            </Typography>
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, action, children, error, onRetry, loading, skeletonHeight = 220 }) {
  if (loading) {
    return (
      <Card sx={CARD_SX}>
        <CardContent sx={{ p: 2.5 }}>
          <Skeleton width="40%" height={28} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={skeletonHeight} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={CARD_SX}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
            {onRetry ? (
              <Button size="small" onClick={onRetry} sx={{ ml: 1, fontWeight: 700 }}>
                Retry
              </Button>
            ) : null}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={CARD_SX}>
      <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography component="h2" sx={{ fontWeight: 600, fontSize: '0.9375rem', color: tokens.colors.text }}>
            {title}
          </Typography>
          {action}
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

function dueDateLabel(dueDate, daysUntil) {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return formatShortDate(dueDate);
}

function dueDateChipColor(daysUntil) {
  if (daysUntil === 0 || daysUntil === 1) {
    return { bgcolor: '#FFEDD5', color: '#C2410C', border: '1px solid #FED7AA' };
  }
  return { bgcolor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [drawerTask, setDrawerTask] = useState(null);
  const [drawerDevelopers, setDrawerDevelopers] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [projects, setProjects] = useState([]);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [payload, projectRows] = await Promise.all([
        api.getGlobalDashboard(),
        api.getProjects().catch(() => []),
      ]);
      setData(payload);
      setProjects(payload?.hasProjects ? (projectRows || []) : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load dashboard data.');
      setData(null);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGlobalExport = async (format) => {
    setExportAnchor(null);
    setExportError('');
    setExportSuccess('');
    if (!data) {
      setExportError('Dashboard data is not ready yet.');
      return;
    }
    try {
      const exportMod = await import('../utils/projectExport');
      if (format === 'csv') exportMod.exportGlobalDashboardCsv(data, projects);
      else if (format === 'xlsx') await exportMod.exportGlobalDashboardExcel(data, projects);
      else if (format === 'pdf') await exportMod.exportGlobalDashboardPdf(data, projects);
      setExportSuccess(`${format.toUpperCase()} export downloaded`);
    } catch (err) {
      console.error('Dashboard export failed:', err);
      setExportError('Export failed. Please try again.');
    }
  };

  const defaultProjectId = data?.defaultProjectId;

  const projectPath = useCallback(
    (suffix) => {
      if (!defaultProjectId) return '/projects';
      return `/projects/${defaultProjectId}${suffix}`;
    },
    [defaultProjectId]
  );

  const openTaskDrawer = async (item) => {
    setDrawerLoading(true);
    setDrawerOpen(true);
    try {
      const [tasks, developers] = await Promise.all([
        api.getProjectTasks(item.projectId),
        api.getDevelopers(),
      ]);
      const found = tasks.find((t) => t.id === item.taskId);
      setDrawerTask(found || { id: item.taskId, taskName: item.title, projectId: item.projectId });
      setDrawerDevelopers(developers);
    } catch {
      setDrawerTask({ id: item.taskId, taskName: item.title, projectId: item.projectId });
      setDrawerDevelopers([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  const deliveryChart = useMemo(() => {
    if (!data?.deliveryHealth?.segments) return [];
    return data.deliveryHealth.segments.filter((s) => s.count > 0);
  }, [data]);

  const deliveryLegend = data?.deliveryHealth?.segments || [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/projects?search=${encodeURIComponent(q)}`);
    else navigate('/projects');
  };

  if (!loading && error && !data) {
    return (
      <PageContainer>
        <Alert
          severity="error"
          sx={{ borderRadius: 2, mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={load} sx={{ fontWeight: 700 }}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer sx={{ bgcolor: tokens.colors.background, minHeight: '100%' }}>
      <Stack
        component="header"
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          mb: 3.5,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={{ fontWeight: 600, fontSize: { xs: '1.35rem', md: '1.5rem' }, color: tokens.colors.text, lineHeight: 1.25 }}>
            Admin Dashboard
          </Typography>
          <Typography sx={{ color: tokens.colors.textSecondary, fontWeight: 500, mt: 0.75, fontSize: '0.9375rem' }}>
            Overview of all projects and delivery health
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            width: { xs: '100%', md: 'auto' },
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: { md: 'flex-end' },
          }}
        >
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ width: { xs: '100%', md: 380, lg: 440 } }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search projects, tasks, developers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: tokens.colors.textSecondary, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box
                        sx={{
                          px: 0.75,
                          py: 0.35,
                          borderRadius: 1,
                          border: `1px solid ${tokens.colors.border}`,
                          color: tokens.colors.textSecondary,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        /
                      </Box>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: `${tokens.radius.button}px`,
                  bgcolor: tokens.colors.card,
                  minHeight: 40,
                  boxShadow: 'none',
                },
              }}
            />
          </Box>
          <Can permission="report.export">
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
              disabled={loading || !data}
              sx={{
                height: 40,
                flexShrink: 0,
                fontWeight: 700,
                borderRadius: `${tokens.radius.button}px`,
                bgcolor: tokens.colors.card,
                textTransform: 'none',
              }}
            >
              Export
            </Button>
          </Can>
          <Tooltip title="Notifications">
            <IconButton
              aria-label="Notifications"
              sx={{
                width: 40,
                height: 40,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: `${tokens.radius.button}px`,
                bgcolor: tokens.colors.card,
                flexShrink: 0,
              }}
            >
              <Badge badgeContent={data?.overdueTasks?.length || 0} color="error" max={99}>
                <NotificationsIcon sx={{ color: tokens.colors.textSecondary }} />
              </Badge>
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {!loading && data && !data.hasProjects ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project or import a project CSV."
          actionText="Import CSV"
          actionPermission="csv.upload"
          onActionClick={() => navigate('/projects/upload')}
        />
      ) : (
        <>
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
              mb: 2.5,
            }}
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={168} sx={{ borderRadius: `${tokens.radius.card}px` }} />
                ))
              : (
                <>
                  <KpiCard
                    label="Total Projects"
                    value={data.kpi.total}
                    icon={<TotalIcon />}
                    tint="#EEF2FF"
                    iconColor={tokens.colors.primary}
                    trend={data.trends?.total}
                    trendVariant="total"
                    onClick={() => navigate('/projects')}
                    ariaLabel="View all projects"
                  />
                  <KpiCard
                    label="Completed Projects"
                    value={data.kpi.completed}
                    icon={<CompletedIcon />}
                    tint="#DCFCE7"
                    iconColor={tokens.colors.success}
                    trend={data.trends?.completed}
                    trendVariant="completed"
                    onClick={() => navigate('/projects?status=Completed')}
                  />
                  <KpiCard
                    label="In Progress Projects"
                    value={data.kpi.inProgress}
                    icon={<ProgressIcon />}
                    tint="#DBEAFE"
                    iconColor="#2563EB"
                    trend={data.trends?.inProgress}
                    trendVariant="inProgress"
                    onClick={() => navigate('/projects?status=Active')}
                  />
                  <KpiCard
                    label="At Risk Projects"
                    value={data.kpi.atRisk}
                    icon={<RiskIcon />}
                    tint="#FFEDD5"
                    iconColor={tokens.colors.warning}
                    trend={data.trends?.atRisk}
                    trendVariant="atRisk"
                    onClick={() => navigate('/projects?delivery=AT_RISK')}
                  />
                  <KpiCard
                    label="Overdue Projects"
                    value={data.kpi.overdue}
                    icon={<OverdueIcon />}
                    tint="#FEE2E2"
                    iconColor={tokens.colors.danger}
                    trend={data.trends?.overdue}
                    trendVariant="overdue"
                    onClick={() => navigate('/projects?delivery=OVERDUE')}
                  />
                </>
              )}
          </Box>

          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <SectionCard title="Delivery Health Overview" loading={loading} skeletonHeight={280}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                  <Box sx={{ position: 'relative', width: '100%', maxWidth: 220, height: 220, mx: 'auto' }}>
                    <SimpleDonutChart
                      data={deliveryChart}
                      valueKey="count"
                      innerRadius={62}
                      outerRadius={92}
                      size={220}
                      paddingAngle={2}
                      ariaLabel="Delivery health by project status"
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <Typography sx={{ fontWeight: 650, fontSize: '1.5rem', color: tokens.colors.text, lineHeight: 1 }}>
                        {data?.deliveryHealth?.total ?? 0}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, fontWeight: 600 }}>
                        Total Projects
                      </Typography>
                    </Box>
                  </Box>
                  <Stack spacing={1.5} sx={{ flex: 1, width: '100%' }}>
                    {deliveryLegend.map((seg) => (
                      <Stack key={seg.key} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
                          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: tokens.colors.text }}>
                            {seg.label}
                          </Typography>
                        </Stack>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: tokens.colors.textSecondary }}>
                          {seg.count}{' '}
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            ({seg.percent}%)
                          </Box>
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
                {(data?.deliveryHealth?.overdueCount ?? 0) > 0 ? (
                  <Box
                    sx={{
                      mt: 2.5,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#EEF2FF',
                      border: '1px solid #C7D2FE',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'stretch', sm: 'center' },
                      justifyContent: 'space-between',
                      gap: 1.5,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, color: '#3730A3', fontSize: '0.875rem' }}>
                      {data.deliveryHealth.overdueCount} project{data.deliveryHealth.overdueCount === 1 ? '' : 's'} are overdue.
                      Review them soon.
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate('/projects?delivery=OVERDUE')}
                      sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', flexShrink: 0 }}
                    >
                      View Overdue Projects
                    </Button>
                  </Box>
                ) : null}
              </SectionCard>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <SectionCard
                title="Task Status Summary (All Projects)"
                loading={loading}
                action={
                  <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate(projectPath('/tasks'))} sx={LINK_BUTTON_SX}>
                    View Task Board
                  </Button>
                }
              >
                <Grid container spacing={1.5}>
                  {(data?.taskStatus?.blocks || []).map((block) => {
                    const meta = TASK_STATUS_ICONS[block.key] || TASK_STATUS_ICONS.total;
                    const IconComp = meta.icon;
                    return (
                      <Grid key={block.key} size={{ xs: 6 }}>
                        <Box
                          sx={{
                            p: 1.75,
                            borderRadius: `${tokens.radius.button}px`,
                            border: `1px solid ${tokens.colors.border}`,
                            bgcolor: '#FAFBFC',
                            minHeight: 96,
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: 1.25,
                                bgcolor: meta.tint,
                                color: meta.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '& .MuiSvgIcon-root': { fontSize: 16 },
                              }}
                            >
                              <IconComp />
                            </Box>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: tokens.colors.textSecondary }}>
                              {block.label}
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontWeight: 650, fontSize: '1.15rem', color: tokens.colors.text, lineHeight: 1.2 }}>
                            {block.value.toLocaleString()}
                          </Typography>
                          {block.percent != null ? (
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: meta.color, mt: 0.35 }}>
                              {block.percent}%
                            </Typography>
                          ) : null}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </SectionCard>
            </Grid>
          </Grid>

          <Grid
            container
            spacing={2.5}
            sx={{ mb: 2.5, contentVisibility: 'auto', containIntrinsicSize: '0 520px' }}
          >
            <Grid size={{ xs: 12, md: 4 }}>
              <SectionCard
                title="Upcoming Deadlines"
                loading={loading}
                action={
                  <Button size="small" onClick={() => navigate(projectPath('/calendar'))} sx={LINK_BUTTON_SX}>
                    View Calendar
                  </Button>
                }
              >
                {!loading && (data?.upcomingDeadlines?.length ?? 0) === 0 ? (
                  <Typography sx={{ color: tokens.colors.textSecondary, fontWeight: 500, py: 2 }}>
                    No upcoming deadlines
                  </Typography>
                ) : (
                  <Stack spacing={1.25} divider={<Box sx={{ borderBottom: `1px solid ${tokens.colors.border}` }} />}>
                    {(data?.upcomingDeadlines || []).map((item) => {
                      const chip = dueDateChipColor(item.daysUntil);
                      return (
                        <Box
                          key={`${item.projectId}-${item.taskId}`}
                          component="button"
                          type="button"
                          onClick={() => openTaskDrawer(item)}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.25,
                            width: '100%',
                            textAlign: 'left',
                            border: 'none',
                            bgcolor: 'transparent',
                            cursor: 'pointer',
                            py: 0.75,
                            borderRadius: 1,
                            '&:focus-visible': { outline: `2px solid ${tokens.colors.primary}`, outlineOffset: 2 },
                            '&:hover': { bgcolor: 'rgba(79,70,229,0.04)' },
                          }}
                        >
                          <CalendarIcon sx={{ color: tokens.colors.warning, fontSize: 20, mt: 0.25 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: tokens.colors.text }} noWrap>
                              {item.title}
                            </Typography>
                            <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary }} noWrap>
                              {item.projectName}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={dueDateLabel(item.dueDate, item.daysUntil)}
                            sx={{ fontWeight: 700, fontSize: '0.7rem', ...chip }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </SectionCard>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <SectionCard
                title="Overdue Tasks (Top 5)"
                loading={loading}
                action={
                  <Button size="small" onClick={() => navigate(`${projectPath('/tasks')}?overdueOnly=1`)} sx={LINK_BUTTON_SX}>
                    View All
                  </Button>
                }
              >
                {!loading && (data?.overdueTasks?.length ?? 0) === 0 ? (
                  <Box sx={{ py: 2 }}>
                    <Typography sx={{ fontWeight: 700, color: tokens.colors.text, mb: 0.5 }}>No overdue tasks</Typography>
                    <Typography sx={{ color: tokens.colors.textSecondary, fontWeight: 500 }}>
                      Great! Everything is on schedule.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.25} divider={<Box sx={{ borderBottom: `1px solid ${tokens.colors.border}` }} />}>
                    {(data?.overdueTasks || []).map((item) => (
                      <Box
                        key={`${item.projectId}-${item.taskId}`}
                        component="button"
                        type="button"
                        onClick={() => openTaskDrawer(item)}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.25,
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          bgcolor: 'transparent',
                          cursor: 'pointer',
                          py: 0.75,
                          borderRadius: 1,
                          '&:focus-visible': { outline: `2px solid ${tokens.colors.primary}`, outlineOffset: 2 },
                          '&:hover': { bgcolor: 'rgba(239,68,68,0.04)' },
                        }}
                      >
                        <ScheduleLateIcon sx={{ color: tokens.colors.danger, fontSize: 20, mt: 0.25 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }} noWrap>
                            {item.title}
                          </Typography>
                          <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary }} noWrap>
                            {item.projectName}
                            {item.module ? ` • Module: ${item.module}` : ''}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${item.daysLate} day${item.daysLate === 1 ? '' : 's'} late`}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            bgcolor: '#FEE2E2',
                            color: '#B91C1C',
                            border: '1px solid #FECACA',
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </SectionCard>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <SectionCard title="Recent Activity" loading={loading}>
                {!loading && (data?.recentActivity?.length ?? 0) === 0 ? (
                  <Typography sx={{ color: tokens.colors.textSecondary, fontWeight: 500, py: 2 }}>
                    No recent activity
                  </Typography>
                ) : (
                  <Stack spacing={1.5} divider={<Box sx={{ borderBottom: `1px solid ${tokens.colors.border}` }} />}>
                    {(data?.recentActivity || []).map((item) => {
                      const status = normalizeLegacyStatus(item.status);
                      const chip = STATUS_CHIP[status] || STATUS_CHIP.Upcoming;
                      return (
                        <Stack key={item.id} direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
                          <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: item.avatarColor, fontSize: '0.85rem', fontWeight: 700 }}>
                              {(item.userName || '?').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.45, color: tokens.colors.text }}>
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                  {item.userName}
                                </Box>{' '}
                                {item.action}{' '}
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                  &quot;{item.taskTitle}&quot;
                                </Box>
                              </Typography>
                              <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, mt: 0.35 }}>
                                {item.projectName} • {timeAgo(item.updatedAt)}
                              </Typography>
                            </Box>
                          </Stack>
                          {status ? (
                            <Chip
                              size="small"
                              label={STATUS_LABELS[status] || status}
                              sx={{ height: 24, fontWeight: 700, fontSize: '0.65rem', flexShrink: 0, ...chip }}
                            />
                          ) : null}
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </SectionCard>
            </Grid>
          </Grid>
        </>
      )}

      {exportSuccess ? (
        <Alert severity="success" onClose={() => setExportSuccess('')} sx={{ mb: 2 }}>
          {exportSuccess}
        </Alert>
      ) : null}

      {exportError ? (
        <Alert severity="error" onClose={() => setExportError('')} sx={{ mb: 2 }}>
          {exportError}
        </Alert>
      ) : null}

      <Suspense fallback={null}>
        <TaskDetailsDrawer
          open={drawerOpen && !drawerLoading}
          onClose={() => {
            setDrawerOpen(false);
            setDrawerTask(null);
          }}
          task={drawerTask}
          developers={drawerDevelopers}
          onTaskUpdated={load}
        />
      </Suspense>

      <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
        <MenuItem onClick={() => handleGlobalExport('csv')}>Export CSV</MenuItem>
        <MenuItem onClick={() => handleGlobalExport('xlsx')}>Export Excel (.xlsx)</MenuItem>
        <Can permission="report.export.pdf">
          <MenuItem onClick={() => handleGlobalExport('pdf')}>Export PDF</MenuItem>
        </Can>
      </Menu>
    </PageContainer>
  );
}
