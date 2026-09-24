import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BarChartOutlined as AnalyticsIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  GroupsOutlined as TeamIcon,
  TrendingUp as AllocIcon,
  AssignmentOutlined as TasksIcon,
  CheckCircleOutlined as DoneIcon,
  WarningAmberOutlined as BlockedIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import PageContainer, { PageHeader } from '../components/PageContainer';
import ProjectPlanTopbar from '../components/ProjectPlanTopbar';
import { ViewAsBanner } from '../components/ProjectWorkspaceBar';
import PaginationBar from '../components/PaginationBar';
import { ProjectWorkspaceProvider, useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import { useProjectId } from '../hooks/useProjectId';
import { useClientPagination } from '../hooks/useClientPagination';
import { tokens, planPageSx } from '../theme';

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: `${tokens.radius.button}px`,
};

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function memberProgress(m) {
  const total = m.taskCount ?? 0;
  const done = m.doneCount ?? 0;
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function KpiCard({ label, value, icon, tint, iconColor, valueColor }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: `${tokens.radius.card}px`,
        border: '1px solid',
        borderColor: tokens.colors.border,
        bgcolor: tokens.colors.card,
        boxShadow: tokens.shadow.card,
        height: '100%',
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: `${tokens.radius.button}px`,
            bgcolor: tint,
            color: iconColor,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.7rem', color: tokens.colors.textSecondary, fontWeight: 500 }}>
            {label}
          </Typography>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '1.35rem',
              color: valueColor || tokens.colors.text,
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function MemberCard({ m, active, onViewAs, onProfile }) {
  const alloc = Math.min(100, Number(m.allocation) ?? 100);
  const progress = memberProgress(m);
  const blocked = m.blockedCount ?? 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: `${tokens.radius.card}px`,
        border: '1px solid',
        borderColor: active ? tokens.colors.primary : tokens.colors.border,
        bgcolor: tokens.colors.card,
        boxShadow: tokens.shadow.card,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        transition: tokens.motion.fast,
        '&:hover': {
          borderColor: tokens.colors.primary,
          boxShadow: tokens.shadow.hover,
        },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: tokens.colors.primarySoft,
              color: tokens.colors.primary,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            {initials(m.name)}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography
                sx={{
                  fontWeight: 650,
                  fontSize: '0.875rem',
                  color: tokens.colors.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.name}
              </Typography>
              <Chip
                size="small"
                label="Active"
                sx={{
                  height: 20,
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  bgcolor: tokens.colors.successBg,
                  color: tokens.colors.success,
                  borderRadius: '999px',
                }}
              />
            </Stack>
            <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.textSecondary, mt: 0.15 }}>
              {m.role || 'Team member'}
            </Typography>
          </Box>
        </Stack>
        <IconButton size="small" sx={{ color: tokens.colors.textMuted, mt: -0.5, mr: -0.5 }}>
          <MoreIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: tokens.colors.textSecondary }}>
            Allocation
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: tokens.colors.text }}>
            {alloc}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={alloc}
          sx={{
            height: 6,
            borderRadius: 999,
            bgcolor: tokens.colors.progressTrack,
            '& .MuiLinearProgress-bar': { bgcolor: tokens.colors.primary, borderRadius: 999 },
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
        }}
      >
        {[
          { label: 'Tasks', value: m.taskCount ?? 0, color: tokens.colors.text },
          { label: 'Done', value: m.doneCount ?? 0, color: tokens.colors.success },
          {
            label: 'Blocked',
            value: blocked,
            color: blocked > 0 ? tokens.colors.warning : tokens.colors.text,
          },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              px: 1,
              py: 0.85,
              borderRadius: `${tokens.radius.sm}px`,
              bgcolor: tokens.colors.primarySofter,
              border: `1px solid ${tokens.colors.borderLight}`,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: '0.65rem', color: tokens.colors.textSecondary, fontWeight: 500 }}>
              {stat.label}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: stat.color, lineHeight: 1.2 }}>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: tokens.colors.textSecondary }}>
            Project contribution
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: tokens.colors.text }}>
            {progress}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 5,
            borderRadius: 999,
            bgcolor: tokens.colors.progressTrack,
            '& .MuiLinearProgress-bar': {
              bgcolor: progress >= 100 ? tokens.colors.success : tokens.colors.primary,
              borderRadius: 999,
            },
          }}
        />
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 'auto', pt: 0.25 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={onViewAs}
          sx={{
            ...btnSx,
            fontSize: '0.75rem',
            color: active ? '#fff' : tokens.colors.primary,
            bgcolor: active ? tokens.colors.primary : '#fff',
            borderColor: active ? tokens.colors.primary : tokens.colors.border,
            '&:hover': {
              bgcolor: active ? tokens.colors.primaryHover : tokens.colors.primarySoft,
              borderColor: tokens.colors.primary,
            },
          }}
        >
          {active ? 'Clear view' : 'View as'}
        </Button>
        <Button
          size="small"
          endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
          onClick={onProfile}
          sx={{
            ...btnSx,
            fontSize: '0.75rem',
            color: tokens.colors.primary,
            px: 0.5,
          }}
        >
          View profile
        </Button>
      </Stack>
    </Paper>
  );
}

function TeamBody() {
  const navigate = useNavigate();
  const { projectId, wbs, loading, error, setViewAs, viewAs, refresh } = useProjectWorkspace();
  const team = wbs?.team || [];

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [menuEl, setMenuEl] = useState(null);

  const roles = useMemo(() => {
    const set = new Set();
    team.forEach((m) => {
      if (m.role) set.add(m.role);
    });
    return Array.from(set).sort();
  }, [team]);

  const filtered = useMemo(() => {
    let list = [...team];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          String(m.name || '')
            .toLowerCase()
            .includes(q) ||
          String(m.role || '')
            .toLowerCase()
            .includes(q)
      );
    }
    if (roleFilter !== 'all') {
      list = list.filter((m) => m.role === roleFilter);
    }
    list.sort((a, b) => {
      if (sortBy === 'allocation') return (b.allocation ?? 0) - (a.allocation ?? 0);
      if (sortBy === 'tasks') return (b.taskCount ?? 0) - (a.taskCount ?? 0);
      if (sortBy === 'blocked') return (b.blockedCount ?? 0) - (a.blockedCount ?? 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return list;
  }, [team, query, roleFilter, sortBy]);

  const {
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    pageCount,
    totalCount,
    pagedItems,
  } = useClientPagination(filtered, {
    initialRows: 6,
    resetKey: `${projectId}-${filtered.length}-${query}-${roleFilter}-${sortBy}`,
  });

  const metrics = useMemo(() => {
    const members = team.length;
    const allocAvg =
      members === 0
        ? 0
        : Math.round(team.reduce((s, m) => s + (Number(m.allocation) ?? 100), 0) / members);
    const tasks = team.reduce((s, m) => s + (m.taskCount ?? 0), 0);
    const done = team.reduce((s, m) => s + (m.doneCount ?? 0), 0);
    const blocked = team.reduce((s, m) => s + (m.blockedCount ?? 0), 0);
    const inProgress = team.reduce((s, m) => s + (m.inProgressCount ?? 0), 0);
    return {
      members,
      allocAvg,
      available: Math.max(0, 100 - allocAvg),
      tasks,
      active: inProgress || Math.max(0, tasks - done),
      done,
      blocked,
    };
  }, [team]);

  const projectName = wbs?.project?.name || 'Team';

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
          Project Team
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, mt: 0.25 }}>
          Capacity and ownership for this project
        </Typography>
      </Box>

      {/* KPI row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 1.25,
          mb: 1.5,
        }}
      >
        <KpiCard
          label="Team members"
          value={metrics.members}
          icon={<TeamIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.primarySoft}
          iconColor={tokens.colors.primary}
        />
        <KpiCard
          label="Allocated"
          value={`${metrics.allocAvg}%`}
          icon={<AllocIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.primarySoft}
          iconColor={tokens.colors.primary}
        />
        <KpiCard
          label="Active tasks"
          value={metrics.active}
          icon={<TasksIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.primarySoft}
          iconColor={tokens.colors.primary}
        />
        <KpiCard
          label="Completed"
          value={metrics.done}
          icon={<DoneIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.successBg}
          iconColor={tokens.colors.success}
        />
        <KpiCard
          label="Blocked"
          value={metrics.blocked}
          icon={<BlockedIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.warningBg}
          iconColor={tokens.colors.warning}
          valueColor={metrics.blocked > 0 ? tokens.colors.warning : undefined}
        />
      </Box>

      {/* Capacity */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          mb: 1.5,
          borderRadius: `${tokens.radius.card}px`,
          border: '1px solid',
          borderColor: tokens.colors.border,
          bgcolor: tokens.colors.card,
          boxShadow: tokens.shadow.card,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1.5}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: tokens.colors.text, mb: 1 }}>
              Team Capacity
            </Typography>
            <Box
              sx={{
                display: 'flex',
                height: 10,
                borderRadius: 999,
                overflow: 'hidden',
                bgcolor: tokens.colors.progressTrack,
              }}
            >
              <Box sx={{ width: `${metrics.allocAvg}%`, bgcolor: tokens.colors.primary }} />
              <Box sx={{ width: `${metrics.available}%`, bgcolor: tokens.colors.progressTrack }} />
            </Box>
          </Box>
          <Stack direction="row" spacing={2.5} sx={{ flexShrink: 0 }}>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: tokens.colors.textSecondary }}>Allocated</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: tokens.colors.primary }}>
                {metrics.allocAvg}%
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: tokens.colors.textSecondary }}>Available</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: tokens.colors.text }}>
                {metrics.available}%
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {/* Main workspace */}
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
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1}
          sx={{
            px: 1.75,
            py: 1.25,
            borderBottom: `1px solid ${tokens.colors.border}`,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="Search team members..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: tokens.colors.textMuted }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: { sm: 220 },
                maxWidth: 320,
                '& .MuiOutlinedInput-root': {
                  height: 36,
                  bgcolor: '#fff',
                  borderRadius: `${tokens.radius.button}px`,
                  fontSize: '0.8125rem',
                },
              }}
            />
            <Select
              size="small"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              displayEmpty
              startAdornment={<FilterIcon sx={{ fontSize: 16, color: tokens.colors.textMuted, mr: 0.75 }} />}
              sx={{
                height: 36,
                minWidth: 140,
                fontSize: '0.8125rem',
                fontWeight: 600,
                bgcolor: '#fff',
                borderRadius: `${tokens.radius.button}px`,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.colors.border },
              }}
            >
              <MenuItem value="all">All members</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              sx={{
                height: 36,
                minWidth: 130,
                fontSize: '0.8125rem',
                fontWeight: 600,
                bgcolor: '#fff',
                borderRadius: `${tokens.radius.button}px`,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.colors.border },
              }}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="allocation">Allocation</MenuItem>
              <MenuItem value="tasks">Task load</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
            </Select>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center">
            <Select
              size="small"
              value={viewAs || ''}
              displayEmpty
              onChange={(e) => setViewAs(e.target.value || null)}
              sx={{
                height: 36,
                minWidth: 160,
                fontSize: '0.8125rem',
                fontWeight: 500,
                bgcolor: '#fff',
                borderRadius: `${tokens.radius.button}px`,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.colors.border },
              }}
            >
              <MenuItem value="">View as: Everyone</MenuItem>
              {team.map((m) => (
                <MenuItem key={m.id} value={String(m.id)}>
                  View as: {m.name}
                </MenuItem>
              ))}
            </Select>
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
                  setQuery('');
                  setRoleFilter('all');
                  setSortBy('name');
                  setMenuEl(null);
                }}
              >
                Clear filters
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        {loading && !team.length && (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={240} />
          </Box>
        )}

        {!loading && !team.length && (
          <Alert severity="info" sx={{ m: 2 }}>
            No developers yet. Add them under Developers.
          </Alert>
        )}

        {!loading && team.length > 0 && !filtered.length && (
          <Alert severity="info" sx={{ m: 2 }}>
            No members match your filters.
          </Alert>
        )}

        {!!pagedItems.length && (
          <Box
            sx={{
              p: 1.75,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 1.5,
            }}
          >
            {pagedItems.map((m) => {
              const active = String(viewAs) === String(m.id);
              return (
                <MemberCard
                  key={m.id}
                  m={m}
                  active={active}
                  onViewAs={() => setViewAs(active ? null : String(m.id))}
                  onProfile={() => navigate(`/developers/${m.id}`)}
                />
              );
            })}
          </Box>
        )}

        <Box sx={{ borderTop: `1px solid ${tokens.colors.border}`, px: 1.5, py: 0.5 }}>
          <PaginationBar
            page={page}
            pageCount={pageCount}
            totalCount={totalCount}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            rowsPerPageOptions={[6, 9, 12, 24]}
            itemLabel="members"
            embedded
            hideWhenEmpty={false}
          />
        </Box>
      </Paper>
    </PageContainer>
  );
}

export default function ProjectTeam() {
  const projectId = useProjectId();
  if (!projectId) return null;
  return (
    <ProjectWorkspaceProvider projectId={projectId}>
      <TeamBody />
    </ProjectWorkspaceProvider>
  );
}
