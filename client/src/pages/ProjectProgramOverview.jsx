import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  Alert,
  Skeleton,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  AccountTreeOutlined as PhasesIcon,
  AssignmentOutlined as TasksIcon,
  CheckCircleOutlined as DoneIcon,
  DonutLargeOutlined as ProgressIcon,
  WidgetsOutlined as ModulesIcon,
  ArrowForward as ArrowIcon,
  LayersOutlined as LayersIcon,
  BarChartOutlined as AnalyticsIcon,
  AccessTime as ClockIcon,
  HourglassEmpty as ProgressStatusIcon,
  CheckCircle as CompletedStatusIcon,
} from '@mui/icons-material';
import PageContainer, { PageHeader } from '../components/PageContainer';
import ProgramPhaseTimeline from '../components/ProgramPhaseTimeline';
import ProjectPlanTopbar from '../components/ProjectPlanTopbar';
import { ViewAsBanner } from '../components/ProjectWorkspaceBar';
import PaginationBar from '../components/PaginationBar';
import PhaseDetailModal from '../components/PhaseDetailModal';
import WbsTaskDetailDrawer from '../components/WbsTaskDetailDrawer';
import CommentsReviewLinksModal from '../components/CommentsReviewLinksModal';
import { ProjectWorkspaceProvider, useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import { useProjectId } from '../hooks/useProjectId';
import { useClientPagination } from '../hooks/useClientPagination';
import { tokens, planPageSx } from '../theme';
import { findNodeInTree } from '../utils/wbsUiHelpers';

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: `${tokens.radius.button}px`,
};

function phaseStatus(p) {
  const prog = Number(p.progress) || 0;
  const done = p.doneCount ?? 0;
  const total = p.taskCount ?? 0;
  if (total > 0 && done >= total) {
    return {
      label: 'Completed',
      color: tokens.colors.success,
      bg: tokens.colors.successBg,
      icon: <CompletedStatusIcon sx={{ fontSize: 14 }} />,
    };
  }
  if (prog > 0 || (p.inProgressCount ?? 0) > 0) {
    return {
      label: 'In progress',
      color: tokens.colors.primary,
      bg: tokens.colors.primarySoft,
      icon: <ProgressStatusIcon sx={{ fontSize: 14 }} />,
    };
  }
  return {
    label: 'Not started',
    color: tokens.colors.textSecondary,
    bg: '#F1F5F9',
    icon: <ClockIcon sx={{ fontSize: 14 }} />,
  };
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function OverviewBody() {
  const navigate = useNavigate();
  const { projectId, wbs, loading, error, refresh, loadWbs, canEdit } = useProjectWorkspace();
  const tree = wbs?.tree || [];
  const phases = tree.filter((n) => n.type === 'phase' || !n.parentId);
  const metrics = wbs?.metrics || {};

  const [phaseId, setPhaseId] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const selectedPhase = useMemo(
    () => (phaseId != null ? findNodeInTree(tree, phaseId) : null),
    [tree, phaseId]
  );
  const selectedTask = useMemo(
    () => (taskId != null ? findNodeInTree(tree, taskId) : null),
    [tree, taskId]
  );

  const openPhase = useCallback((id) => {
    setPhaseId(id);
    setTaskId(null);
    setCommentsOpen(false);
  }, []);

  const closePhase = useCallback(() => {
    setPhaseId(null);
    setTaskId(null);
    setCommentsOpen(false);
  }, []);

  const openTask = useCallback((task) => {
    setTaskId(task.id);
    setCommentsOpen(false);
  }, []);

  const closeTask = useCallback(() => {
    setTaskId(null);
    setCommentsOpen(false);
  }, []);

  const openComments = useCallback(() => {
    setCommentsOpen(true);
  }, []);

  const closeComments = useCallback(() => {
    setCommentsOpen(false);
  }, []);

  const reloadTree = useCallback(async () => {
    try {
      await loadWbs();
    } catch {
      /* keep current tree */
    }
  }, [loadWbs]);

  const openDependency = useCallback((depId) => {
    if (depId != null) setTaskId(depId);
  }, []);

  const {
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    pageCount,
    totalCount,
    pagedItems: pagedPhases,
  } = useClientPagination(phases, {
    initialRows: 6,
    resetKey: `${projectId}-${phases.length}`,
  });

  const quickStats = [
    {
      label: 'Phases',
      value: metrics.phases ?? 0,
      icon: <PhasesIcon sx={{ fontSize: 18 }} />,
    },
    {
      label: 'Tasks',
      value: metrics.tasks ?? 0,
      icon: <TasksIcon sx={{ fontSize: 18 }} />,
    },
    {
      label: 'Done',
      value: metrics.done ?? 0,
      icon: <DoneIcon sx={{ fontSize: 18 }} />,
    },
    {
      label: 'Progress',
      value: `${metrics.overall ?? 0}%`,
      icon: <ProgressIcon sx={{ fontSize: 18 }} />,
      progress: metrics.overall ?? 0,
    },
    {
      label: 'Modules',
      value: metrics.modules ?? 0,
      icon: <ModulesIcon sx={{ fontSize: 18 }} />,
    },
  ];

  return (
    <PageContainer maxWidth={false} sx={planPageSx}>
      <PageHeader
        title={wbs?.project?.name || 'Overview'}
        subtitle="Program health and phase progress"
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refresh()}
              sx={{ ...btnSx, bgcolor: 'background.paper' }}
            >
              Sync
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AnalyticsIcon />}
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

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {loading && !wbs ? (
        <Skeleton variant="rounded" height={200} sx={{ mb: 1.5, borderRadius: 2 }} />
      ) : (
        <ProgramPhaseTimeline phases={phases} metrics={metrics} />
      )}

      {/* Quick stats */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: 'text.primary' }}>
          Quick Stats
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 1.25,
          mb: 2,
        }}
      >
        {quickStats.map((k) => (
          <Paper
            key={k.label}
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: `${tokens.radius.card}px`,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: tokens.shadow.card,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: `${tokens.radius.button}px`,
                  bgcolor: tokens.colors.primarySoft,
                  color: 'primary.main',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {k.icon}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 500 }}>
                  {k.label}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
                  {k.value}
                </Typography>
                {k.progress != null && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Number(k.progress) || 0)}
                    sx={{
                      mt: 0.5,
                      height: 3,
                      borderRadius: 2,
                    bgcolor: tokens.colors.progressTrack,
                    '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                    }}
                  />
                )}
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      {/* Phases */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <LayersIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: 'text.primary' }}>
            Phases
          </Typography>
        </Stack>
        <Button
          size="small"
          endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate(`/projects/${projectId}/hierarchy`)}
          sx={{ ...btnSx, color: 'primary.main' }}
        >
          View all phases
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 1.25,
        }}
      >
        {pagedPhases.map((p, idx) => {
          const status = phaseStatus(p);
          const phaseNum = phases.findIndex((x) => x.id === p.id) + 1 || idx + 1;
          const modules =
            (p.children || []).filter((c) => c.type === 'module' || c.type === 'category').length ||
            0;
          return (
            <Paper
              key={p.id}
              elevation={0}
              onClick={() => openPhase(p.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openPhase(p.id);
                }
              }}
              sx={{
                p: 1.75,
                borderRadius: `${tokens.radius.card}px`,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: tokens.shadow.card,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                transition: tokens.motion.fast,
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.light',
                  boxShadow: tokens.shadow.hover,
                },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: status.label === 'Completed' ? tokens.colors.success : 'primary.main',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  {phaseNum}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 650,
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={p.name}
                  >
                    {p.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                    {p.rangeStart && p.rangeEnd
                      ? `${fmtDate(p.rangeStart)} – ${fmtDate(p.rangeEnd)}`
                      : 'No dated tasks'}
                  </Typography>
                </Box>
              </Stack>

              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                <Box component="span" sx={{ fontWeight: 650, color: 'text.primary' }}>
                  {p.taskCount ?? 0}
                </Box>{' '}
                tasks ·{' '}
                <Box component="span" sx={{ fontWeight: 650, color: 'text.primary' }}>
                  {p.doneCount ?? 0}
                </Box>{' '}
                done
              </Typography>

              <Stack direction="row" alignItems="center" spacing={1}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Number(p.progress) || 0)}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: tokens.colors.progressTrack,
                    '& .MuiLinearProgress-bar': {
                      bgcolor:
                        status.label === 'Completed' ? tokens.colors.success : tokens.colors.primary,
                      borderRadius: 3,
                    },
                  }}
                />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 32 }}>
                  {p.progress ?? 0}%
                </Typography>
              </Stack>

              <Box
                sx={{
                  px: 1.25,
                  py: 1,
                  borderRadius: `${tokens.radius.sm}px`,
                  bgcolor: tokens.colors.primarySoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 0.75,
                }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <ModulesIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    Modules{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {modules}
                    </Box>
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openPhase(p.id);
                  }}
                  sx={{ ...btnSx, color: 'primary.main', px: 0.5, minWidth: 0 }}
                >
                  View details
                </Button>
              </Box>

              <Chip
                size="small"
                icon={status.icon}
                label={status.label}
                sx={{
                  alignSelf: 'flex-start',
                  height: 24,
                  fontWeight: 650,
                  fontSize: '0.7rem',
                  bgcolor: status.bg,
                  color: status.color,
                  borderRadius: '6px',
                  '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
                }}
              />
            </Paper>
          );
        })}
      </Box>

      {!loading && !phases.length && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          No phases yet. Add tasks with a Phase, then click Sync.
        </Alert>
      )}

      <PaginationBar
        page={page}
        pageCount={pageCount}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        rowsPerPageOptions={[6, 9, 12, 24]}
        itemLabel="phases"
      />

      <PhaseDetailModal
        open={Boolean(selectedPhase)}
        phase={selectedPhase}
        projectId={projectId}
        onClose={closePhase}
        onOpenTask={openTask}
        lockWhileNested={Boolean(selectedTask) || commentsOpen}
      />

      <WbsTaskDetailDrawer
        open={Boolean(selectedTask)}
        node={selectedTask}
        tree={tree}
        projectId={projectId}
        canEdit={canEdit}
        onClose={closeTask}
        onOpenComments={openComments}
        onOpenDependency={openDependency}
        onSaved={reloadTree}
        commentsBlockingEscape={commentsOpen}
      />

      <CommentsReviewLinksModal
        open={commentsOpen && Boolean(selectedTask)}
        node={selectedTask}
        projectId={projectId}
        canManage
        onClose={closeComments}
        onChanged={reloadTree}
      />
    </PageContainer>
  );
}

export default function ProjectProgramOverview() {
  const projectId = useProjectId();
  if (!projectId) return null;
  return (
    <ProjectWorkspaceProvider projectId={projectId}>
      <OverviewBody />
    </ProjectWorkspaceProvider>
  );
}
