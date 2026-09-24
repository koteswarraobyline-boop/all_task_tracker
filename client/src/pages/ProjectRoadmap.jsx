import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BarChartOutlined as AnalyticsIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  ArrowForward as ArrowIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material';
import PageContainer, { PageHeader } from '../components/PageContainer';
import ProjectPlanTopbar from '../components/ProjectPlanTopbar';
import { ViewAsBanner } from '../components/ProjectWorkspaceBar';
import PaginationBar from '../components/PaginationBar';
import { ProjectWorkspaceProvider, useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import { useProjectId } from '../hooks/useProjectId';
import { useClientPagination } from '../hooks/useClientPagination';
import { tokens, planPageSx } from '../theme';
import { getStatusDisplayLabel, getStatusChipSx } from '../utils/taskManagementConstants';

const TASKS_PER_COLUMN = 8;
const TASKS_PER_COLUMN_WIDE = 12;
const STEPS_PER_PAGE = 4;

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: `${tokens.radius.button}px`,
};

const PRIORITY_SX = {
  Critical: { color: '#DC2626', bgcolor: '#FEF2F2' },
  High: { color: '#DC2626', bgcolor: '#FEF2F2' },
  Medium: { color: '#2563EB', bgcolor: '#EFF6FF' },
  Low: { color: '#64748B', bgcolor: '#F1F5F9' },
};

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function collectTaskIds(node, set = new Set()) {
  if (!node) return set;
  if (node.type === 'task') set.add(node.id);
  (node.children || []).forEach((c) => collectTaskIds(c, set));
  return set;
}

function statusChipProps(task) {
  const waiting = (task.waitingOn || []).length > 0;
  if (waiting && task.status !== 'Completed') {
    return {
      label: task.status === 'Blocked' ? 'Blocked' : 'Waiting on',
      sx: {
        height: 22,
        fontWeight: 600,
        fontSize: '0.7rem',
        borderRadius: '999px',
        bgcolor: tokens.colors.warningBg,
        color: tokens.colors.warning,
      },
    };
  }
  if (!task.status) {
    return {
      label: 'Not Started',
      sx: {
        height: 22,
        fontWeight: 600,
        fontSize: '0.7rem',
        borderRadius: '999px',
        bgcolor: '#F1F5F9',
        color: tokens.colors.textSecondary,
      },
    };
  }
  return {
    label: getStatusDisplayLabel(task.status),
    sx: {
      height: 22,
      fontWeight: 600,
      fontSize: '0.7rem',
      borderRadius: '999px',
      ...getStatusChipSx(task.status),
    },
  };
}

function TaskCard({ task, teamById }) {
  const owner = task.ownerId ? teamById.get(task.ownerId) : null;
  const priorityKey = String(task.priority || '').replace(/^P[01]$/i, 'High').replace(/^P2$/i, 'Medium').replace(/^P3$/i, 'Low');
  const pStyle = PRIORITY_SX[priorityKey] || PRIORITY_SX.Medium;
  const status = statusChipProps(task);
  const waiting = task.waitingOn || [];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: tokens.colors.border,
        bgcolor: tokens.colors.card,
        boxShadow: tokens.shadow.card,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.5} mb={1}>
        <Typography
          sx={{
            fontWeight: 650,
            fontSize: '0.8125rem',
            color: tokens.colors.text,
            lineHeight: 1.35,
            flex: 1,
            minWidth: 0,
          }}
        >
          {task.name}
        </Typography>
        <IconButton size="small" sx={{ color: tokens.colors.textMuted, mt: -0.5, mr: -0.5 }}>
          <MoreIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      {owner ? (
        <Stack direction="row" spacing={1} alignItems="center" mb={1.25}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: tokens.colors.primarySoft,
              color: tokens.colors.primary,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: '0.65rem',
              flexShrink: 0,
            }}
          >
            {initials(owner.name)}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                color: tokens.colors.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {owner.name}
            </Typography>
            {owner.role && (
              <Typography sx={{ fontSize: '0.65rem', color: tokens.colors.textSecondary }}>
                {owner.role}
              </Typography>
            )}
          </Box>
        </Stack>
      ) : (
        <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.textMuted, mb: 1.25 }}>
          Unassigned
        </Typography>
      )}

      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {task.priority && (
          <Chip
            size="small"
            label={task.priority}
            sx={{
              height: 22,
              fontWeight: 600,
              fontSize: '0.7rem',
              borderRadius: '999px',
              color: pStyle.color,
              bgcolor: pStyle.bgcolor,
            }}
          />
        )}
        <Chip size="small" label={status.label} sx={status.sx} />
      </Stack>

      {waiting.length > 0 && (
        <Typography
          sx={{
            mt: 1,
            fontSize: '0.7rem',
            color: tokens.colors.warning,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={waiting.join(', ')}
        >
          Waiting on: {waiting.join(', ')}
        </Typography>
      )}
    </Paper>
  );
}

function SequenceColumn({ layer, teamById, fill }) {
  const [page, setPage] = useState(1);
  const tasks = layer.tasks || [];
  const perPage = fill ? TASKS_PER_COLUMN_WIDE : TASKS_PER_COLUMN;
  const pageCount = Math.max(1, Math.ceil(tasks.length / perPage) || 1);
  const safePage = Math.min(page, pageCount);
  const slice = tasks.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <Box
      sx={{
        flex: fill ? '1 1 0' : '1 1 260px',
        minWidth: fill ? 0 : 260,
        width: fill ? '100%' : undefined,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: tokens.colors.primarySofter,
        borderRadius: `${tokens.radius.card}px`,
        border: `1px solid ${tokens.colors.border}`,
        p: 1.5,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={0.35}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: tokens.colors.primary,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: '0.75rem',
            flexShrink: 0,
          }}
        >
          {layer.step}
        </Box>
        <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: tokens.colors.text }}>
          Sequence Step {layer.step}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.7rem', color: tokens.colors.textSecondary, mb: 1.25, ml: 4.5 }}>
        {tasks.length} task{tasks.length === 1 ? '' : 's'}
      </Typography>

      <Box
        sx={{
          flex: 1,
          minHeight: 120,
          display: 'grid',
          gridTemplateColumns: fill
            ? {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              }
            : '1fr',
          gap: 1,
          alignContent: 'start',
        }}
      >
        {slice.map((t) => (
          <TaskCard key={t.id} task={t} teamById={teamById} />
        ))}
        {!tasks.length && (
          <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.textMuted, py: 2, textAlign: 'center', gridColumn: '1 / -1' }}>
            No tasks in this step
          </Typography>
        )}
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={0.5}
        sx={{ mt: 1.25, pt: 1, borderTop: `1px solid ${tokens.colors.border}` }}
      >
        <IconButton
          size="small"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => p - 1)}
          sx={{ color: tokens.colors.textSecondary }}
        >
          <PrevIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: tokens.colors.textSecondary, minWidth: 40, textAlign: 'center' }}>
          {safePage}/{pageCount}
        </Typography>
        <IconButton
          size="small"
          disabled={safePage >= pageCount}
          onClick={() => setPage((p) => p + 1)}
          sx={{ color: tokens.colors.textSecondary }}
        >
          <NextIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}

function RoadmapBody() {
  const navigate = useNavigate();
  const { projectId, wbs, loading, error, refresh } = useProjectWorkspace();
  const layers = wbs?.roadmap || [];
  const phases = useMemo(
    () => (wbs?.tree || []).filter((n) => n.type === 'phase' || !n.parentId),
    [wbs]
  );
  const teamById = useMemo(() => new Map((wbs?.team || []).map((t) => [t.id, t])), [wbs]);

  const [phaseId, setPhaseId] = useState('all');
  const [menuEl, setMenuEl] = useState(null);

  const phaseTaskIds = useMemo(() => {
    if (phaseId === 'all') return null;
    const phase = phases.find((p) => String(p.id) === String(phaseId));
    return phase ? collectTaskIds(phase) : null;
  }, [phaseId, phases]);

  const filteredLayers = useMemo(() => {
    if (!phaseTaskIds) return layers;
    return layers
      .map((layer) => ({
        ...layer,
        tasks: (layer.tasks || []).filter((t) => phaseTaskIds.has(t.id)),
      }))
      .filter((layer) => (layer.tasks || []).length > 0);
  }, [layers, phaseTaskIds]);

  const {
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    pageCount,
    totalCount,
    pagedItems: pagedLayers,
  } = useClientPagination(filteredLayers, {
    initialRows: STEPS_PER_PAGE,
    resetKey: `${projectId}-${filteredLayers.length}-${phaseId}`,
  });

  const projectName = wbs?.project?.name || 'Roadmap';
  const visibleCount = pagedLayers.length;
  const fillWide = visibleCount <= 2;

  return (
    <PageContainer maxWidth={false} sx={planPageSx}>
      <PageHeader
        title={projectName}
        subtitle="Program health and phase progress"
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refresh?.()}
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

      <Box sx={{ mb: 1.5 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '1.125rem',
            color: tokens.colors.text,
            letterSpacing: '-0.01em',
          }}
        >
          Project Roadmap
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, mt: 0.25 }}>
          Dependency sequence (not status Kanban)
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: `${tokens.radius.card}px`,
          border: '1px solid',
          borderColor: tokens.colors.border,
          bgcolor: tokens.colors.card,
          boxShadow: tokens.shadow.card,
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1}
          sx={{
            px: 1.75,
            py: 1.25,
            borderBottom: `1px solid ${tokens.colors.border}`,
          }}
        >
          <Select
            size="small"
            value={phaseId}
            displayEmpty
            onChange={(e) => setPhaseId(e.target.value)}
            sx={{
              minWidth: 180,
              height: 36,
              fontSize: '0.8125rem',
              fontWeight: 600,
              bgcolor: '#fff',
              borderRadius: `${tokens.radius.button}px`,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.colors.border },
            }}
          >
            <MenuItem value="all">All phases</MenuItem>
            {phases.map((p, i) => (
              <MenuItem key={p.id} value={String(p.id)}>
                Phase {i + 1}
                {p.name ? ` — ${String(p.name).slice(0, 36)}` : ''}
              </MenuItem>
            ))}
          </Select>

          <Stack direction="row" spacing={0.75} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<FilterIcon sx={{ fontSize: 16 }} />}
              onClick={() => setPhaseId('all')}
              sx={{ ...btnSx, bgcolor: '#fff', color: tokens.colors.text }}
            >
              Show all ({phases.length || 0} phase{phases.length === 1 ? '' : 's'})
            </Button>
            <IconButton
              size="small"
              onClick={(e) => setMenuEl(e.currentTarget)}
              sx={{
                color: tokens.colors.textSecondary,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: `${tokens.radius.button}px`,
              }}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
              <MenuItem
                onClick={() => {
                  refresh?.();
                  setMenuEl(null);
                }}
              >
                Sync WBS
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setPhaseId('all');
                  setMenuEl(null);
                }}
              >
                Clear phase filter
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        {loading && !layers.length && (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={320} />
          </Box>
        )}

        {!loading && !filteredLayers.length && (
          <Alert severity="info" sx={{ m: 2 }}>
            No tasks to sequence. Add tasks or resync the WBS.
          </Alert>
        )}

        {!!pagedLayers.length && (
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: visibleCount === 1 ? '1fr' : 'repeat(2, 1fr)',
                  md:
                    visibleCount === 1
                      ? '1fr'
                      : visibleCount === 2
                        ? 'repeat(2, 1fr)'
                        : visibleCount === 3
                          ? 'repeat(3, 1fr)'
                          : 'repeat(4, 1fr)',
                },
                gap: 1.5,
                alignItems: 'stretch',
                width: '100%',
              }}
            >
              {pagedLayers.map((layer, idx) => (
                <Box
                  key={layer.step}
                  sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 0.75,
                    minWidth: 0,
                  }}
                >
                  {idx > 0 && visibleCount > 1 && (
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'flex' },
                        alignItems: 'center',
                        color: tokens.colors.primary,
                        flexShrink: 0,
                        ml: -0.5,
                        mr: -0.25,
                      }}
                    >
                      <ArrowIcon sx={{ fontSize: 20 }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <SequenceColumn layer={layer} teamById={teamById} fill={fillWide} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {pageCount > 1 && (
          <Box sx={{ borderTop: `1px solid ${tokens.colors.border}`, px: 1.5, py: 0.5 }}>
            <PaginationBar
              page={page}
              pageCount={pageCount}
              totalCount={totalCount}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              rowsPerPageOptions={[2, 3, 4, 6]}
              itemLabel="sequence steps"
              embedded
            />
          </Box>
        )}
      </Paper>
    </PageContainer>
  );
}

export default function ProjectRoadmap() {
  const projectId = useProjectId();
  if (!projectId) return null;
  return (
    <ProjectWorkspaceProvider projectId={projectId}>
      <RoadmapBody />
    </ProjectWorkspaceProvider>
  );
}
