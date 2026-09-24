import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BarChartOutlined as AnalyticsIcon,
  ExpandMore as ExpandIcon,
  ChevronRight as CollapseIcon,
  ChevronRight as OpenIcon,
  Link as LinkIcon,
  MoreVert as MoreIcon,
  FilterList as FilterIcon,
  WidgetsOutlined as PhaseIcon,
  CategoryOutlined as ModuleIcon,
  DescriptionOutlined as TaskIcon,
  ChatBubbleOutlined as CommentIcon,
} from '@mui/icons-material';
import PageContainer, { PageHeader } from '../components/PageContainer';
import ProjectPlanTopbar from '../components/ProjectPlanTopbar';
import { ViewAsBanner } from '../components/ProjectWorkspaceBar';
import PaginationBar from '../components/PaginationBar';
import { ProjectWorkspaceProvider, useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import { useProjectId } from '../hooks/useProjectId';
import { tokens, planPageSx } from '../theme';
import { getStatusDisplayLabel, getStatusChipSx } from '../utils/taskManagementConstants';

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: `${tokens.radius.button}px`,
};

const TYPE_STYLES = {
  phase: { color: tokens.colors.primary, bgcolor: tokens.colors.primarySoft, label: 'Phase' },
  stage: { color: tokens.colors.textSecondary, bgcolor: '#F1F5F9', label: 'Stage' },
  function: { color: tokens.colors.textSecondary, bgcolor: '#F1F5F9', label: 'Function' },
  module: { color: tokens.colors.primary, bgcolor: tokens.colors.primarySoft, label: 'Module' },
  category: { color: tokens.colors.textBody, bgcolor: '#F1F5F9', label: 'Category' },
  task: { color: tokens.colors.textSecondary, bgcolor: '#F1F5F9', label: 'Task' },
};

const COLS = [
  { key: 'name', label: 'Name / Type', width: '32%' },
  { key: 'owner', label: 'Owner', width: '16%' },
  { key: 'progress', label: 'Progress', width: '14%' },
  { key: 'status', label: 'Status', width: '12%' },
  { key: 'deps', label: 'Dependency / Waiting on', width: '18%' },
  { key: 'actions', label: 'Actions', width: '8%', align: 'right' },
];

function TypeBadge({ type }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.task;
  return (
    <Chip
      label={style.label}
      size="small"
      sx={{
        height: 20,
        fontWeight: 600,
        fontSize: '0.65rem',
        letterSpacing: '0.01em',
        bgcolor: style.bgcolor,
        color: style.color,
        borderRadius: '6px',
      }}
    />
  );
}

function TypeGlyph({ type }) {
  const sx = { fontSize: 16, color: tokens.colors.primary, flexShrink: 0 };
  if (type === 'phase' || type === 'stage') return <PhaseIcon sx={sx} />;
  if (type === 'module' || type === 'category' || type === 'function') {
    return <ModuleIcon sx={{ ...sx, color: tokens.colors.textSecondary }} />;
  }
  return <TaskIcon sx={{ ...sx, color: tokens.colors.textMuted }} />;
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function OwnerCell({ owner }) {
  if (!owner) {
    return (
      <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textMuted }}>—</Typography>
    );
  }
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
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
            fontSize: '0.8125rem',
            color: tokens.colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {owner.name}
        </Typography>
        {owner.role && (
          <Typography
            sx={{
              fontSize: '0.7rem',
              color: tokens.colors.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {owner.role}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function ProgressCell({ value }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const done = pct >= 100;
  return (
    <Stack spacing={0.35} sx={{ minWidth: 88, maxWidth: 120 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: tokens.colors.text }}>
        {pct}%
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 5,
          borderRadius: 999,
          bgcolor: tokens.colors.progressTrack,
          '& .MuiLinearProgress-bar': {
            bgcolor: done ? tokens.colors.success : tokens.colors.primary,
            borderRadius: 999,
          },
        }}
      />
    </Stack>
  );
}

function StatusCell({ node }) {
  if (node.type !== 'task' && !node.status) {
    const prog = Number(node.progress) || 0;
    const done = (node.doneCount ?? 0) > 0 && (node.doneCount ?? 0) >= (node.taskCount ?? 0);
    if (done || prog >= 100) {
      return (
        <Chip
          size="small"
          label="Completed"
          sx={{ height: 22, fontWeight: 600, fontSize: '0.7rem', bgcolor: tokens.colors.successBg, color: tokens.colors.success, borderRadius: '999px' }}
        />
      );
    }
    if (prog > 0 || (node.inProgressCount ?? 0) > 0) {
      return (
        <Chip
          size="small"
          label="In Progress"
          sx={{ height: 22, fontWeight: 600, fontSize: '0.7rem', bgcolor: tokens.colors.primarySoft, color: tokens.colors.primary, borderRadius: '999px' }}
        />
      );
    }
    return (
      <Chip
        size="small"
        label="Not Started"
        sx={{ height: 22, fontWeight: 600, fontSize: '0.7rem', bgcolor: '#F1F5F9', color: tokens.colors.textSecondary, borderRadius: '999px' }}
      />
    );
  }

  const waiting = (node.waitingOn || []).length > 0;
  if (waiting && node.status !== 'Completed') {
    return (
      <Chip
        size="small"
        label={node.status === 'Blocked' ? 'Blocked' : 'Waiting on'}
        sx={{
          height: 22,
          fontWeight: 600,
          fontSize: '0.7rem',
          bgcolor: tokens.colors.warningBg,
          color: tokens.colors.warning,
          borderRadius: '999px',
        }}
      />
    );
  }

  if (!node.status) {
    return (
      <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textMuted }}>—</Typography>
    );
  }

  return (
    <Chip
      size="small"
      label={getStatusDisplayLabel(node.status)}
      sx={{
        height: 22,
        fontWeight: 600,
        fontSize: '0.7rem',
        borderRadius: '999px',
        ...getStatusChipSx(node.status),
      }}
    />
  );
}

function DepsCell({ node }) {
  const waiting = node.waitingOn || [];
  const deps = node.dependsOnNames || [];
  if (!waiting.length && !deps.length) {
    return (
      <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textMuted }}>—</Typography>
    );
  }
  const label = waiting.length ? waiting.join(', ') : deps.join(', ');
  return (
    <Typography
      sx={{
        fontSize: '0.75rem',
        color: waiting.length ? tokens.colors.warning : tokens.colors.textSecondary,
        fontWeight: waiting.length ? 600 : 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 160,
      }}
      title={label}
    >
      {label}
    </Typography>
  );
}

function flattenVisible(node, collapsed, depth = 0, rows = []) {
  if (!node) return rows;
  rows.push({ node, depth });
  const kids = node.children || [];
  if (kids.length && !collapsed.has(node.id)) {
    kids.forEach((c) => flattenVisible(c, collapsed, depth + 1, rows));
  }
  return rows;
}

function HierarchyRow({ node, depth, collapsed, toggle, teamById, onOpenComments }) {
  const hasKids = (node.children || []).length > 0;
  const isCollapsed = collapsed.has(node.id);
  const owner = node.ownerId ? teamById.get(node.ownerId) : null;
  const indent = 8 + depth * 20;

  return (
    <TableRow
      id={`node-${node.id}`}
      hover
      sx={{
        '& td': {
          borderBottom: `1px solid ${tokens.colors.borderLight}`,
          py: 1.25,
          px: 1.5,
          verticalAlign: 'middle',
        },
        '&:hover': { bgcolor: tokens.colors.primarySofter },
      }}
    >
      <TableCell>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ pl: `${indent}px`, minWidth: 0 }}>
          {hasKids ? (
            <IconButton
              size="small"
              onClick={() => toggle(node.id)}
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
              sx={{
                width: 24,
                height: 24,
                color: tokens.colors.textMuted,
                flexShrink: 0,
              }}
            >
              {isCollapsed ? <CollapseIcon sx={{ fontSize: 18 }} /> : <ExpandIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          ) : (
            <Box sx={{ width: 24, flexShrink: 0 }} />
          )}
          <TypeGlyph type={node.type} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography
                sx={{
                  fontWeight: depth === 0 ? 650 : 600,
                  fontSize: '0.8125rem',
                  color: tokens.colors.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                }}
                title={node.name}
              >
                {node.name}
              </Typography>
              <TypeBadge type={node.type} />
              {(node.commentCount || 0) > 0 && (
                <Chip
                  icon={<CommentIcon sx={{ fontSize: '12px !important' }} />}
                  label={node.commentCount}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
            </Stack>
            {node.description && depth === 0 && (
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: tokens.colors.textSecondary,
                  mt: 0.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 280,
                }}
              >
                {node.description}
              </Typography>
            )}
          </Box>
        </Stack>
      </TableCell>
      <TableCell>
        <OwnerCell owner={owner} />
      </TableCell>
      <TableCell>
        <ProgressCell value={node.progress} />
      </TableCell>
      <TableCell>
        <StatusCell node={node} />
      </TableCell>
      <TableCell>
        <DepsCell node={node} />
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
          <Tooltip title="Open">
            <IconButton
              size="small"
              sx={{ color: tokens.colors.textSecondary }}
              onClick={() => {
                if (hasKids) toggle(node.id);
              }}
            >
              <OpenIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={(node.dependsOnNames || []).join(', ') || 'Dependencies'}>
            <IconButton size="small" sx={{ color: tokens.colors.textSecondary }}>
              <LinkIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {(node.commentCount || 0) > 0 || node.type === 'task' ? (
            <Tooltip title="Comments">
              <IconButton
                size="small"
                sx={{ color: tokens.colors.textSecondary }}
                onClick={() => onOpenComments?.(node)}
              >
                <MoreIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <IconButton size="small" sx={{ color: tokens.colors.textMuted }} disabled>
              <MoreIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function HierarchyBody() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { projectId, wbs, loading, error, refresh } = useProjectWorkspace();
  const phases = useMemo(
    () => (wbs?.tree || []).filter((n) => n.type === 'phase' || !n.parentId),
    [wbs]
  );
  const phaseParam = params.get('phase');
  const initialIdx = Math.max(
    0,
    phases.findIndex((p) => String(p.id) === String(phaseParam))
  );
  const [page, setPage] = useState(initialIdx >= 0 ? initialIdx + 1 : 1);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const [menuEl, setMenuEl] = useState(null);

  useEffect(() => {
    if (phaseParam && phases.length) {
      const idx = phases.findIndex((p) => String(p.id) === String(phaseParam));
      if (idx >= 0) setPage(idx + 1);
    }
  }, [phaseParam, phases]);

  const total = phases.length || 1;
  const current = showAll ? null : phases[page - 1] || null;
  const teamById = useMemo(() => {
    const m = new Map();
    (wbs?.team || []).forEach((t) => m.set(t.id, t));
    return m;
  }, [wbs]);

  const rows = useMemo(() => {
    if (showAll) {
      const all = [];
      phases.forEach((p) => flattenVisible(p, collapsed, 0, all));
      return all;
    }
    if (!current) return [];
    return flattenVisible(current, collapsed, 0, []);
  }, [current, phases, collapsed, showAll]);

  const toggle = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const ids = new Set();
    const walk = (n) => {
      if ((n.children || []).length) {
        ids.add(n.id);
        n.children.forEach(walk);
      }
    };
    (showAll ? phases : current ? [current] : []).forEach(walk);
    setCollapsed(ids);
  };

  const goPhase = (next) => {
    setShowAll(false);
    setPage(next);
    const p = phases[next - 1];
    if (p) navigate(`/projects/${projectId}/hierarchy?phase=${p.id}`, { replace: true });
  };

  const projectName = wbs?.project?.name || 'Hierarchy';

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
          Work Breakdown Structure
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, mt: 0.25 }}>
          Phase → Module → Task
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
            value={showAll ? 'all' : String(current?.id || '')}
            displayEmpty
            disabled={!phases.length}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'all') {
                setShowAll(true);
                return;
              }
              setShowAll(false);
              const idx = phases.findIndex((p) => String(p.id) === String(v));
              if (idx >= 0) goPhase(idx + 1);
            }}
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
            {phases.map((p, i) => (
              <MenuItem key={p.id} value={String(p.id)}>
                Phase {i + 1}
                {p.name ? ` — ${String(p.name).slice(0, 40)}` : ''}
              </MenuItem>
            ))}
            {phases.length > 1 && <MenuItem value="all">All phases</MenuItem>}
          </Select>

          <Stack direction="row" spacing={0.75} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<FilterIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                if (showAll) {
                  setShowAll(false);
                  if (phases[0]) goPhase(1);
                } else {
                  setShowAll(true);
                }
              }}
              sx={{ ...btnSx, bgcolor: '#fff', color: tokens.colors.text }}
            >
              {showAll ? `Show all (${phases.length} phases)` : `Show all (${phases.length} phase${phases.length === 1 ? '' : 's'})`}
            </Button>
            <IconButton
              size="small"
              onClick={(e) => setMenuEl(e.currentTarget)}
              sx={{ color: tokens.colors.textSecondary, border: `1px solid ${tokens.colors.border}`, borderRadius: `${tokens.radius.button}px` }}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
              <MenuItem
                onClick={() => {
                  expandAll();
                  setMenuEl(null);
                }}
              >
                Expand all
              </MenuItem>
              <MenuItem
                onClick={() => {
                  collapseAll();
                  setMenuEl(null);
                }}
              >
                Collapse all
              </MenuItem>
              <MenuItem
                onClick={() => {
                  refresh?.();
                  setMenuEl(null);
                }}
              >
                Sync WBS
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        {loading && !rows.length && (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={280} />
          </Box>
        )}

        {!loading && !phases.length && (
          <Alert severity="info" sx={{ m: 2 }}>
            No phases yet. Add tasks with a Phase, then click Sync.
          </Alert>
        )}

        {!!rows.length && (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: tokens.colors.primarySofter,
                    '& th': {
                      borderBottom: `1px solid ${tokens.colors.border}`,
                      color: tokens.colors.textSecondary,
                      fontWeight: 650,
                      fontSize: '0.7rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      py: 1.25,
                      px: 1.5,
                      whiteSpace: 'nowrap',
                    },
                  }}
                >
                  {COLS.map((c) => (
                    <TableCell key={c.key} align={c.align || 'left'} sx={{ width: c.width }}>
                      {c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ node, depth }) => (
                  <HierarchyRow
                    key={node.id}
                    node={node}
                    depth={depth}
                    collapsed={collapsed}
                    toggle={toggle}
                    teamById={teamById}
                    onOpenComments={() => navigate(`/projects/${projectId}/comments`)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!showAll && (
          <Box
            sx={{
              borderTop: `1px solid ${tokens.colors.border}`,
              px: 1.5,
              py: 0.5,
            }}
          >
            <PaginationBar
              page={page}
              pageCount={Math.max(1, total)}
              totalCount={total}
              rowsPerPage={1}
              onPageChange={goPhase}
              showRowsPerPage={false}
              itemLabel="phases"
              hideWhenEmpty={false}
              embedded
            />
          </Box>
        )}
      </Paper>
    </PageContainer>
  );
}

export default function ProjectHierarchy() {
  const projectId = useProjectId();
  if (!projectId) return null;
  return (
    <ProjectWorkspaceProvider projectId={projectId}>
      <HierarchyBody />
    </ProjectWorkspaceProvider>
  );
}
