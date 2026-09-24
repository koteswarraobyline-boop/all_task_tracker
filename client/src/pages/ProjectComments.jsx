import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BarChartOutlined as AnalyticsIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  ChatBubbleOutlined as CommentIcon,
  RadioButtonUnchecked as OpenIcon,
  CheckCircleOutlined as ResolvedIcon,
  AccountTreeOutlined as LinkedIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import PageContainer, { PageHeader } from '../components/PageContainer';
import ProjectPlanTopbar from '../components/ProjectPlanTopbar';
import { ViewAsBanner } from '../components/ProjectWorkspaceBar';
import PaginationBar from '../components/PaginationBar';
import { ProjectWorkspaceProvider, useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import { useProjectId } from '../hooks/useProjectId';
import { useClientPagination } from '../hooks/useClientPagination';
import { api } from '../services/api';
import { tokens, planPageSx } from '../theme';
import Can from '../components/Can';

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

function isResolved(c) {
  return Boolean(c.resolved || c.status === 'resolved');
}

function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

function CommentCard({ c, projectId, canEdit, onResolve, onDelete, onJump }) {
  const [menuEl, setMenuEl] = useState(null);
  const resolved = isResolved(c);
  const linked = Boolean(c.nodeId);
  const crumbs = String(c.breadcrumb || '')
    .split(/\s*[→>]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: tokens.colors.border,
        bgcolor: tokens.colors.card,
        boxShadow: tokens.shadow.card,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={1.25}>
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
            {initials(c.authorName)}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 650, fontSize: '0.875rem', color: tokens.colors.text }}>
                {c.authorName || 'Unknown'}
              </Typography>
              <Chip
                size="small"
                label={linked ? 'Node-linked' : 'General'}
                sx={{
                  height: 20,
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  bgcolor: '#F1F5F9',
                  color: tokens.colors.textSecondary,
                  borderRadius: '6px',
                }}
              />
            </Stack>
            <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.textSecondary }}>
              {c.authorRole || 'Team member'}
              <Box component="span" sx={{ color: tokens.colors.textMuted }}>
                {' · '}
                {relativeTime(c.createdAt)}
              </Box>
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="center">
          <Chip
            size="small"
            label={resolved ? 'Resolved' : 'Open'}
            sx={{
              height: 22,
              fontWeight: 600,
              fontSize: '0.7rem',
              borderRadius: '999px',
              ...(resolved
                ? { bgcolor: tokens.colors.successBg, color: tokens.colors.success }
                : { bgcolor: tokens.colors.primarySoft, color: tokens.colors.primary }),
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => setMenuEl(e.currentTarget)}
            sx={{ color: tokens.colors.textMuted }}
          >
            <MoreIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
            <Can permission="task.delete">
              <MenuItem
                disabled={!canEdit}
                onClick={() => {
                  setMenuEl(null);
                  onDelete(c);
                }}
                sx={{ color: tokens.colors.danger, fontWeight: 600 }}
              >
                Delete
              </MenuItem>
            </Can>
            {linked && (
              <MenuItem
                onClick={() => {
                  setMenuEl(null);
                  onJump(c);
                }}
              >
                Jump to Hierarchy
              </MenuItem>
            )}
          </Menu>
        </Stack>
      </Stack>

      <Typography
        sx={{
          fontSize: '0.875rem',
          color: '#334155',
          lineHeight: 1.55,
          mb: 1.25,
          whiteSpace: 'pre-wrap',
        }}
      >
        {c.body}
      </Typography>

      {(linked || crumbs.length > 0) && (
        <Box
          sx={{
            px: 1.25,
            py: 1,
            mb: 1.25,
            borderRadius: `${tokens.radius.sm}px`,
            bgcolor: tokens.colors.primarySofter,
            border: `1px solid ${tokens.colors.borderLight}`,
          }}
        >
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: tokens.colors.textMuted, mb: 0.35 }}>
            Location
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {(crumbs.length ? crumbs : ['Linked node']).map((part, i, arr) => (
              <React.Fragment key={`${part}-${i}`}>
                {i > 0 && (
                  <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.textMuted }}>→</Typography>
                )}
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: i === arr.length - 1 ? 650 : 500,
                    color: i === arr.length - 1 ? tokens.colors.primary : tokens.colors.textSecondary,
                  }}
                >
                  {part}
                </Typography>
              </React.Fragment>
            ))}
          </Stack>
        </Box>
      )}

      {c.statusFrom && (
        <Typography sx={{ fontSize: '0.7rem', color: tokens.colors.textMuted, mb: 1 }}>
          Status change: {c.statusFrom} → {c.statusTo}
        </Typography>
      )}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Can permission="task.edit">
          <Button
            size="small"
            disabled={!canEdit}
            onClick={() => onResolve(c)}
            sx={{ ...btnSx, color: tokens.colors.primary, fontSize: '0.75rem' }}
          >
            {resolved ? 'Reopen' : 'Resolve'}
          </Button>
        </Can>
        <Button
          size="small"
          disabled
          sx={{ ...btnSx, color: tokens.colors.textSecondary, fontSize: '0.75rem' }}
          title="Reply coming soon"
        >
          Reply
        </Button>
        {linked && (
          <Button
            size="small"
            endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
            onClick={() => onJump(c)}
            sx={{ ...btnSx, color: tokens.colors.primary, fontSize: '0.75rem', ml: { sm: 'auto' } }}
          >
            Jump to Hierarchy
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

function CommentsBody() {
  const navigate = useNavigate();
  const { projectId, canEdit, wbs, refresh } = useProjectWorkspace();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [menuEl, setMenuEl] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjectComments(projectId);
      setItems(data.comments || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...items];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          String(c.body || '')
            .toLowerCase()
            .includes(q) ||
          String(c.authorName || '')
            .toLowerCase()
            .includes(q) ||
          String(c.breadcrumb || '')
            .toLowerCase()
            .includes(q)
      );
    }
    if (statusFilter === 'open') list = list.filter((c) => !isResolved(c));
    if (statusFilter === 'resolved') list = list.filter((c) => isResolved(c));
    if (scopeFilter === 'general') list = list.filter((c) => !c.nodeId);
    if (scopeFilter === 'linked') list = list.filter((c) => c.nodeId);
    return list;
  }, [items, query, statusFilter, scopeFilter]);

  const {
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    pageCount,
    totalCount,
    pagedItems,
  } = useClientPagination(filtered, {
    initialRows: 10,
    resetKey: `${projectId}-${filtered.length}-${query}-${statusFilter}-${scopeFilter}`,
  });

  const metrics = useMemo(() => {
    const total = items.length;
    const resolved = items.filter(isResolved).length;
    const openCount = total - resolved;
    const linked = items.filter((c) => c.nodeId).length;
    return { total, open: openCount, resolved, linked };
  }, [items]);

  const addGeneral = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api.createProjectComment(projectId, { body: body.trim() });
      setBody('');
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleResolve = async (c) => {
    const next = isResolved(c) ? 'open' : 'resolved';
    await api.updateProjectComment(projectId, c.id, { status: next });
    await load();
  };

  const remove = async (c) => {
    if (!confirm('Delete this comment?')) return;
    await api.deleteProjectComment(projectId, c.id);
    await load();
  };

  const jumpHierarchy = (c) => {
    const phase = c.nodeId ? `?phase=${c.nodeId}` : '';
    navigate(`/projects/${projectId}/hierarchy${c.phaseId ? `?phase=${c.phaseId}` : phase}`);
  };

  const projectName = wbs?.project?.name || 'Comments';

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
              onClick={() => {
                refresh?.();
                load();
              }}
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

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Unlock editing to add or resolve comments.
        </Alert>
      )}
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
          Project Comments
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, mt: 0.25 }}>
          Project discussion and activity
        </Typography>
      </Box>

      {/* KPI summary */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 1.25,
          mb: 1.5,
        }}
      >
        <KpiCard
          label="Total comments"
          value={metrics.total}
          icon={<CommentIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.primarySoft}
          iconColor={tokens.colors.primary}
        />
        <KpiCard
          label="Open"
          value={metrics.open}
          icon={<OpenIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.primarySoft}
          iconColor={tokens.colors.primary}
          valueColor={tokens.colors.primary}
        />
        <KpiCard
          label="Resolved"
          value={metrics.resolved}
          icon={<ResolvedIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.successBg}
          iconColor={tokens.colors.success}
          valueColor={tokens.colors.success}
        />
        <KpiCard
          label="Node-linked"
          value={metrics.linked}
          icon={<LinkedIcon sx={{ fontSize: 20 }} />}
          tint={tokens.colors.primarySoft}
          iconColor={tokens.colors.primary}
        />
      </Box>

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
        {/* Toolbar */}
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
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <TextField
              size="small"
              placeholder="Search comments..."
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
                minWidth: { sm: 200 },
                maxWidth: 300,
                '& .MuiOutlinedInput-root': {
                  height: 36,
                  bgcolor: '#fff',
                  borderRadius: `${tokens.radius.button}px`,
                  fontSize: '0.8125rem',
                },
              }}
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              value={statusFilter}
              onChange={(_e, v) => v && setStatusFilter(v)}
              sx={{
                bgcolor: '#F8FAFC',
                borderRadius: `${tokens.radius.button}px`,
                p: 0.25,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '6px !important',
                  px: 1.25,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: tokens.colors.textSecondary,
                  '&.Mui-selected': {
                    bgcolor: tokens.colors.primary,
                    color: '#fff',
                    '&:hover': { bgcolor: tokens.colors.primaryHover },
                  },
                },
              }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="open">Open</ToggleButton>
              <ToggleButton value="resolved">Resolved</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={scopeFilter}
              onChange={(_e, v) => v && setScopeFilter(v)}
              sx={{
                bgcolor: '#F8FAFC',
                borderRadius: `${tokens.radius.button}px`,
                p: 0.25,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '6px !important',
                  px: 1.25,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: tokens.colors.textSecondary,
                  '&.Mui-selected': {
                    bgcolor: tokens.colors.primarySoft,
                    color: tokens.colors.primary,
                  },
                },
              }}
            >
              <ToggleButton value="all">All types</ToggleButton>
              <ToggleButton value="general">General</ToggleButton>
              <ToggleButton value="linked">Node-linked</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center">
            <Can permission="task.edit">
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                disabled={!canEdit}
                onClick={() => setOpen(true)}
                sx={{ ...btnSx }}
              >
                Add comment
              </Button>
            </Can>
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
                  load();
                  setMenuEl(null);
                }}
              >
                Refresh comments
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setQuery('');
                  setStatusFilter('all');
                  setScopeFilter('all');
                  setMenuEl(null);
                }}
              >
                Clear filters
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        {loading && (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={160} />
          </Box>
        )}

        {!loading && (
          <Stack spacing={1.25} sx={{ p: 1.75 }}>
            {pagedItems.map((c) => (
              <CommentCard
                key={c.id}
                c={c}
                projectId={projectId}
                canEdit={canEdit}
                onResolve={toggleResolve}
                onDelete={remove}
                onJump={jumpHierarchy}
              />
            ))}
            {!items.length && <Alert severity="info">No comments yet. Add a general comment to start.</Alert>}
            {!!items.length && !filtered.length && (
              <Alert severity="info">No comments match your filters.</Alert>
            )}
          </Stack>
        )}

        <Box sx={{ borderTop: `1px solid ${tokens.colors.border}`, px: 1.5, py: 0.5 }}>
          <PaginationBar
            page={page}
            pageCount={pageCount}
            totalCount={totalCount}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 50]}
            itemLabel="comments"
            embedded
            hideWhenEmpty={false}
          />
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={addGeneral}>
          <DialogTitle sx={{ fontWeight: 650, color: tokens.colors.text }}>Add comment</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, mb: 1.5 }}>
              General project comment
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              placeholder="Comment..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setOpen(false)}
              sx={{ ...btnSx, border: `1px solid ${tokens.colors.border}`, color: tokens.colors.text }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={busy || !body.trim()}
              sx={{ ...btnSx }}
            >
              Add comment
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </PageContainer>
  );
}

export default function ProjectComments() {
  const projectId = useProjectId();
  if (!projectId) return null;
  return (
    <ProjectWorkspaceProvider projectId={projectId}>
      <CommentsBody />
    </ProjectWorkspaceProvider>
  );
}
