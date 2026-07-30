import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  AvatarGroup,
  Chip,
  LinearProgress,
  Menu,
  Pagination,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Skeleton,
  Fab,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Dashboard as DashboardIcon,
  ListAlt as ListIcon,
  CalendarMonth as CalendarIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  FolderOpen as FolderIcon,
  CheckCircle as CheckIcon,
  WarningAmber as OverdueIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  GridView as GridIcon,
  ViewList as TableIcon,
  Sort as SortIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Bolt as ActiveIcon,
  Tune as TuneIcon,
  KeyboardCommandKey as CmdIcon,
} from '@mui/icons-material';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import { openClientInviteEmail } from '../utils/clientInviteMail';
import ShareProjectDialog from '../components/ShareProjectDialog';
import UpdateDeliveryDateDialog from '../components/UpdateDeliveryDateDialog';
import Can from '../components/Can';
import PageContainer, { MetricCard } from '../components/PageContainer';
import { tokens } from '../theme';

const AVATAR_COLORS = ['#6366F1', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

const STATUS_CHIP = {
  Active: { bgcolor: '#D1FAE5', color: '#047857' },
  Completed: { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  'On Hold': { bgcolor: '#FFEDD5', color: '#C2410C' },
  Delayed: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  Archived: { bgcolor: '#F1F5F9', color: '#475569' },
};

const PRIORITY_CHIP = {
  High: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  P0: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  P1: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  Medium: { bgcolor: '#FFEDD5', color: '#C2410C' },
  P2: { bgcolor: '#FFEDD5', color: '#C2410C' },
  Low: { bgcolor: '#DCFCE7', color: '#15803D' },
  P3: { bgcolor: '#DCFCE7', color: '#15803D' },
};

const CHIP_FILTERS = [
  { id: 'all', label: 'All Projects' },
  { id: 'Active', label: 'Active' },
  { id: 'Completed', label: 'Completed' },
  { id: 'On Hold', label: 'On Hold' },
  { id: 'Archived', label: 'Archived' },
];

const glassSx = {
  bgcolor: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(12px)',
  border: '1px solid',
  borderColor: 'rgba(226,232,240,0.9)',
  boxShadow: tokens.shadow.card,
  borderRadius: `${tokens.radius.card}px`,
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function timeAgo(value) {
  if (!value) return '—';
  const now = new Date();
  const past = new Date(value);
  const diffMs = now - past;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
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

function projectColor(id) {
  return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length];
}

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Box component="mark" sx={{ bgcolor: '#FEF08A', color: 'inherit', px: 0.25, borderRadius: 0.5 }}>
        {text.slice(idx, idx + query.length)}
      </Box>
      {text.slice(idx + query.length)}
    </>
  );
}

function priorityStyle(priority) {
  const key = Object.keys(PRIORITY_CHIP).find(
    (k) => k.toLowerCase() === String(priority || '').toLowerCase()
  );
  return PRIORITY_CHIP[key] || PRIORITY_CHIP.Medium;
}

function exportProjectsCsv(rows) {
  const headers = [
    'Name',
    'Client',
    'Status',
    'Priority',
    'Progress',
    'Completed',
    'Total Tasks',
    'Manager',
    'Start Date',
    'Due Date',
    'Estimated Hours',
  ];
  const lines = rows.map((p) =>
    [
      p.name,
      p.clientName || '',
      p.archived ? 'Archived' : p.status,
      p.priority || '',
      `${p.progress || 0}%`,
      p.completed || 0,
      p.totalTasks || 0,
      p.manager?.name || '',
      p.startDate || '',
      p.dueDate || '',
      p.estimatedHours || 0,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `projects-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status, archived }) {
  const label = archived ? 'Archived' : status || 'Active';
  const chip = STATUS_CHIP[label] || STATUS_CHIP.Active;
  return (
    <Chip
      size="small"
      label={label}
      sx={{ fontWeight: 700, height: 26, borderRadius: 999, ...chip }}
    />
  );
}

function PriorityBadge({ priority }) {
  const style = priorityStyle(priority);
  return (
    <Chip
      size="small"
      label={priority || 'Medium'}
      sx={{ fontWeight: 700, height: 26, borderRadius: 999, ...style }}
    />
  );
}

function ProgressCell({ progress, completed, total, compact }) {
  const barColor = progress >= 100 ? '#22C55E' : progress >= 50 ? '#4F46E5' : '#94A3B8';
  return (
    <Box sx={{ minWidth: compact ? 100 : 140 }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 0.75
        }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{progress}%</Typography>
        {!compact && (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {completed} / {total}
          </Typography>
        )}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8,
          borderRadius: 99,
          bgcolor: '#E2E8F0',
          '& .MuiLinearProgress-bar': {
            bgcolor: barColor,
            borderRadius: 99,
            transition: 'transform 600ms ease',
          },
        }}
      />
    </Box>
  );
}

function ProjectCard({
  proj,
  search,
  onOpen,
  onDashboard,
  onCalendar,
  onShare,
  onMenu,
}) {
  const color = projectColor(proj.id);

  const stop = (e) => e.stopPropagation();

  return (
    <Paper
      component={motion.div}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
      elevation={0}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(proj)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(proj);
        }
      }}
      aria-label={`Open ${proj.name || 'project'}`}
      sx={{
        ...glassSx,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: tokens.motion.fast,
        '&:hover': { boxShadow: tokens.shadow.hover },
        '&:focus-visible': {
          outline: `2px solid ${color}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Hero header */}
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2.5,
          background: `linear-gradient(135deg, ${color}18 0%, ${color}08 50%, transparent 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <Stack
            direction="row"
            sx={{
              gap: 1.5,
              alignItems: 'center',
              minWidth: 0,
              flex: 1,
            }}
          >
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: color,
                fontWeight: 800,
                fontSize: '1.1rem',
                borderRadius: 2.5,
                boxShadow: `0 8px 20px ${color}40`,
              }}
            >
              {(proj.name || '?').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 750,
                  fontSize: '1rem',
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {highlightMatch(proj.name, search)}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {highlightMatch(proj.clientName || 'Internal project', search)}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            size="small"
            onClick={(e) => {
              stop(e);
              onMenu(e, proj);
            }}
            aria-label="More"
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack
          direction="row"
          useFlexGap
          sx={{
            gap: 1,
            flexWrap: 'wrap',
            mt: 2,
          }}
        >
          <StatusBadge status={proj.status} archived={proj.archived} />
          <PriorityBadge priority={proj.priority} />
        </Stack>
      </Box>
      <Box sx={{ px: 3, py: 2.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {proj.description ? (
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: 'text.secondary',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {proj.description}
          </Typography>
        ) : null}

        <ProgressCell
          progress={proj.progress || 0}
          completed={proj.completed || 0}
          total={proj.totalTasks || 0}
        />

        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5, fontWeight: 600 }}>
              Manager
            </Typography>
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                gap: 1,
              }}
            >
              {proj.manager ? (
                <>
                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: proj.manager.color || color }}>
                    {initials(proj.manager.name)}
                  </Avatar>
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {proj.manager.name}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Unassigned</Typography>
              )}
            </Stack>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: proj.isProjectOverdue ? '#DC2626' : 'text.secondary',
                mb: 0.3,
                fontWeight: 750,
                letterSpacing: '0.02em',
              }}
            >
              {proj.isProjectOverdue ? `OVERDUE (${proj.projectOverdueDays}d)` : 'DUE'}
            </Typography>
            {proj.isProjectOverdue ? (
              <Chip
                icon={<OverdueIcon sx={{ fontSize: '12px !important', color: '#DC2626 !important' }} />}
                label={formatDate(proj.effectiveDueDate || proj.revisedDeliveryDate || proj.dueDate)}
                size="small"
                sx={{
                  bgcolor: '#FEF2F2',
                  color: '#B91C1C',
                  fontWeight: 800,
                  border: '1px solid #FCA5A5',
                  height: 22,
                  fontSize: '0.75rem',
                }}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: '0.825rem',
                  fontWeight: 750,
                  color: proj.revisedDeliveryDate ? '#6B21A8' : 'text.primary',
                }}
              >
                {formatDate(proj.effectiveDueDate || proj.revisedDeliveryDate || proj.dueDate)}
              </Typography>
            )}
            {proj.revisedDeliveryDate && !proj.isProjectOverdue && (
              <Typography sx={{ fontSize: '0.65rem', color: '#6B21A8', fontWeight: 750, mt: 0.2 }}>
                Extended Date
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
      {/* Footer actions */}
      <Stack
        direction="row"
        onClick={stop}
        onKeyDown={stop}
        sx={{
          gap: 1,
          px: 2.5,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(248,250,252,0.65)',
        }}
      >
        <Tooltip title="Dashboard">
          <IconButton
            size="small"
            onClick={() => onDashboard(proj)}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <DashboardIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Calendar">
          <IconButton
            size="small"
            onClick={() => onCalendar(proj)}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <CalendarIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Can permission="project.share">
          <Tooltip title="Share">
            <IconButton
              size="small"
              onClick={() => onShare(proj)}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <ShareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Can>
      </Stack>
    </Paper>
  );
}

function LoadingSkeleton({ view }) {
  if (view === 'list') {
    return (
      <Paper elevation={0} sx={{ ...glassSx, p: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1.5, borderRadius: 2 }} />
        ))}
      </Paper>
    );
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
        gap: 3,
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} variant="rounded" height={420} sx={{ borderRadius: `${tokens.radius.card}px` }} />
      ))}
    </Box>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteProj, setDeleteProj] = useState(null);
  const [shareProj, setShareProj] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');
  const [chipFilter, setChipFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem('tt_projects_view') || 'grid');
  const [sortBy, setSortBy] = useState('updated');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProj, setMenuProj] = useState(null);
  const [dateDialogProj, setDateDialogProj] = useState(null);
  const [sortAnchor, setSortAnchor] = useState(null);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tt_project_searches') || '[]');
    } catch {
      return [];
    }
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();

  const showAlert = useCallback((message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      showAlert('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('projects-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('tt_projects_view', view);
  }, [view]);

  const rememberSearch = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, 5);
      localStorage.setItem('tt_project_searches', JSON.stringify(next));
      return next;
    });
  };

  const handleOpenDelete = (proj) => {
    setDeleteProj(proj);
    setOpenDelete(true);
    setMenuAnchor(null);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setDeleteProj(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProj) return;
    setDeleting(true);
    try {
      await api.deleteProject(deleteProj.id);
      showAlert('Project deleted successfully');
      fetchProjects();
      handleCloseDelete();
    } catch (error) {
      console.error('Failed to delete project:', error);
      showAlert('Failed to delete project', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const clients = useMemo(
    () =>
      [...new Set(projects.map((p) => p.clientName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [projects]
  );

  const teams = useMemo(() => {
    const map = {};
    projects.forEach((p) => (p.members || []).forEach((m) => {
      map[m.id] = m.name;
    }));
    return Object.entries(map)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const priorities = useMemo(
    () =>
      [...new Set(projects.map((p) => p.priority).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [projects]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = projects.filter((p) => {
      if (chipFilter === 'Archived') {
        if (!p.archived) return false;
      } else if (chipFilter !== 'all') {
        if (p.archived && chipFilter !== 'Completed') return false;
        if ((p.status || 'Active') !== chipFilter) return false;
      }

      if (clientFilter !== 'all' && (p.clientName || '') !== clientFilter) return false;
      if (teamFilter !== 'all' && !(p.members || []).some((m) => String(m.id) === String(teamFilter))) {
        return false;
      }
      if (priorityFilter !== 'all' && String(p.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'all' && (p.status || 'Active') !== statusFilter) return false;

      if (dateRange !== 'all' && p.dueDate) {
        const due = new Date(p.dueDate);
        const now = new Date();
        const end = new Date();
        if (dateRange === '7d') end.setDate(now.getDate() + 7);
        if (dateRange === '30d') end.setDate(now.getDate() + 30);
        if (dateRange === 'overdue') {
          if (due >= now || p.status === 'Completed') return false;
        } else if (due < now || due > end) return false;
      } else if (dateRange !== 'all' && !p.dueDate) {
        return false;
      }

      if (!q) return true;
      const hay = [
        p.name,
        p.clientName,
        p.description,
        p.manager?.name,
        ...(p.tags || []),
        ...(p.members || []).map((m) => m.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortBy === 'progress') return (b.progress || 0) - (a.progress || 0);
      if (sortBy === 'due') {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      }
      if (sortBy === 'priority') {
        const rank = (p) => {
          const v = String(p || '').toLowerCase();
          if (['high', 'p0', 'p1'].includes(v)) return 3;
          if (['medium', 'p2'].includes(v)) return 2;
          return 1;
        };
        return rank(b.priority) - rank(a.priority);
      }
      return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
    });

    return rows;
  }, [
    projects,
    search,
    chipFilter,
    clientFilter,
    teamFilter,
    priorityFilter,
    statusFilter,
    dateRange,
    sortBy,
  ]);

  useEffect(() => {
    setPage(1);
  }, [search, chipFilter, clientFilter, teamFilter, priorityFilter, statusFilter, dateRange, sortBy, view]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const from = filtered.length === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to = Math.min(page * rowsPerPage, filtered.length);

  const totals = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'Active' && !p.archived).length;
    const completed = projects.filter((p) => p.status === 'Completed').length;
    const delayed = projects.filter((p) => p.status === 'Delayed').length;
    const avgProgress =
      total > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / total) : 0;
    return { total, active, completed, delayed, avgProgress };
  }, [projects]);

  const appliedFilters = useMemo(() => {
    const items = [];
    if (clientFilter !== 'all') items.push({ key: 'client', label: `Client: ${clientFilter}` });
    if (teamFilter !== 'all') {
      const t = teams.find((x) => String(x.id) === String(teamFilter));
      items.push({ key: 'team', label: `Team: ${t?.name || teamFilter}` });
    }
    if (priorityFilter !== 'all') items.push({ key: 'priority', label: `Priority: ${priorityFilter}` });
    if (statusFilter !== 'all') items.push({ key: 'status', label: `Status: ${statusFilter}` });
    if (dateRange !== 'all') {
      const labels = { '7d': 'Due in 7 days', '30d': 'Due in 30 days', overdue: 'Overdue' };
      items.push({ key: 'date', label: labels[dateRange] || dateRange });
    }
    return items;
  }, [clientFilter, teamFilter, priorityFilter, statusFilter, dateRange, teams]);

  const resetFilters = () => {
    setChipFilter('all');
    setClientFilter('all');
    setTeamFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setDateRange('all');
    setSearch('');
  };

  const clearApplied = (key) => {
    if (key === 'client') setClientFilter('all');
    if (key === 'team') setTeamFilter('all');
    if (key === 'priority') setPriorityFilter('all');
    if (key === 'status') setStatusFilter('all');
    if (key === 'date') setDateRange('all');
  };

  const upcomingDeadlines = useMemo(() => {
    return [...projects]
      .filter((p) => p.dueDate && p.status !== 'Completed')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [projects]);

  const recentlyUpdated = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
      .slice(0, 5);
  }, [projects]);

  const filterSelectSx = {
    minWidth: 130,
    '& .MuiOutlinedInput-root': {
      height: 40,
      bgcolor: '#fff',
      borderRadius: `${tokens.radius.button}px`,
      fontSize: '0.8rem',
      fontWeight: 600,
    },
  };

  return (
    <PageContainer maxWidth={1800}>
      {/* PAGE HEADER */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: 'stretch', lg: 'center' },
          gap: 3,
          mb: 4
        }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '1.85rem', md: '2.35rem' },
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: 'text.primary',
              mb: 0.75,
            }}
          >
            Projects
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', lineHeight: 1.5 }}>
            Manage all your projects in one place.
          </Typography>
        </Box>

        <Stack
          direction="row"
          useFlexGap
          sx={{
            gap: 1.25,
            flexWrap: "wrap",
            alignItems: "center"
          }}>
        <Can permission="csv.upload">
          <Button
            variant="contained"
              startIcon={<AddIcon />}
            onClick={() => navigate('/projects/upload')}
            sx={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
                },
              }}
            >
              New Project
          </Button>
        </Can>
          <Can permission="csv.upload">
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => navigate('/projects/upload')}
              sx={{ bgcolor: '#fff' }}
            >
              Import CSV
            </Button>
          </Can>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => {
              exportProjectsCsv(filtered);
              showAlert(`Exported ${filtered.length} projects`);
            }}
            disabled={!filtered.length}
            sx={{ bgcolor: '#fff' }}
          >
            Export
          </Button>
          <Tooltip title="Refresh">
            <IconButton
              onClick={fetchProjects}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#fff',
                borderRadius: `${tokens.radius.button}px`,
                width: 44,
                height: 44,
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      {/* TOOLBAR */}
      <Paper elevation={0} sx={{ ...glassSx, p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          sx={{
            gap: 2,
            alignItems: { xs: 'stretch', lg: 'center' },
            justifyContent: "space-between"
          }}>
          {/* Search */}
          <Box sx={{ position: 'relative', minWidth: { xs: '100%', lg: 280 }, flex: { lg: '0 1 320px' } }}>
            <TextField
              id="projects-search"
              size="small"
              fullWidth
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') rememberSearch(search);
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 44,
                  bgcolor: '#F8FAFC',
                  borderRadius: `${tokens.radius.button}px`,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {search ? (
                        <IconButton size="small" onClick={() => setSearch('')} aria-label="Clear search">
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Chip
                          size="small"
                          icon={<CmdIcon sx={{ fontSize: '14px !important' }} />}
                          label="K"
                          sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#E2E8F0' }}
                        />
                      )}
                    </InputAdornment>
                  ),
                }
              }}
            />
            <AnimatePresence>
              {searchFocused && recentSearches.length > 0 && !search && (
                <Paper
                  component={motion.div}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  elevation={8}
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    mt: 1,
                    zIndex: 20,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary' }}>
                    Recent searches
                  </Typography>
                  {recentSearches.map((q) => (
                    <MenuItem
                      key={q}
                      onClick={() => {
                        setSearch(q);
                        setSearchFocused(false);
                      }}
                      dense
                    >
                      <SearchIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      {q}
                    </MenuItem>
                  ))}
                </Paper>
              )}
            </AnimatePresence>
      </Box>

          {/* Filter chips */}
          <Stack
            direction="row"
            useFlexGap
            sx={{
              gap: 1,
              flexWrap: "wrap",
              justifyContent: "center",
              flex: 1
            }}>
            {CHIP_FILTERS.map((f) => {
              const active = chipFilter === f.id;
              return (
                <Chip
                  key={f.id}
                  label={f.label}
                  onClick={() => setChipFilter(f.id)}
                  sx={{
                    fontWeight: 700,
                    height: 36,
                    px: 0.5,
                    borderRadius: 999,
                    transition: tokens.motion.fast,
                    ...(active
                      ? {
                          bgcolor: 'primary.main',
                          color: '#fff',
                          boxShadow: '0 6px 16px rgba(79,70,229,0.35)',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }
                      : {
                          bgcolor: '#F1F5F9',
                          color: 'text.secondary',
                          '&:hover': { bgcolor: '#E2E8F0' },
                        }),
                  }}
                />
              );
            })}
          </Stack>

          {/* View controls */}
          <Stack
            direction="row"
            sx={{
              gap: 1,
              alignItems: "center",
              justifyContent: { xs: 'space-between', lg: 'flex-end' }
            }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={view}
              onChange={(_e, v) => v && setView(v)}
              sx={{
                bgcolor: '#F1F5F9',
                borderRadius: 2,
                p: 0.35,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '10px !important',
                  px: 1.25,
                  py: 0.75,
                  '&.Mui-selected': { bgcolor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
                },
              }}
            >
              <ToggleButton value="grid" aria-label="Grid view">
                <GridIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="list" aria-label="List view">
                <TableIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              size="small"
              startIcon={<TuneIcon />}
              onClick={() => setShowFilters((v) => !v)}
              variant={showFilters ? 'contained' : 'outlined'}
              sx={{ bgcolor: showFilters ? undefined : '#fff', whiteSpace: 'nowrap' }}
            >
              Filters
              {appliedFilters.length > 0 && (
                <Badge badgeContent={appliedFilters.length} color="error" sx={{ ml: 1 }} />
              )}
            </Button>

            <Button
              size="small"
              startIcon={<SortIcon />}
              onClick={(e) => setSortAnchor(e.currentTarget)}
              variant="outlined"
              sx={{ bgcolor: '#fff', whiteSpace: 'nowrap' }}
            >
              Sort
            </Button>

            <IconButton
              size="small"
              onClick={(e) => setMoreAnchor(e.currentTarget)}
              sx={{ border: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Collapse in={showFilters}>
          <Divider sx={{ my: 2 }} />
          <Stack
            direction="row"
            useFlexGap
            sx={{
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center"
            }}>
            <TextField select size="small" label="Client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} sx={filterSelectSx}>
              <MenuItem value="all">All clients</MenuItem>
              {clients.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Team" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} sx={filterSelectSx}>
              <MenuItem value="all">All team</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} sx={filterSelectSx}>
              <MenuItem value="all">All priorities</MenuItem>
              {priorities.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={filterSelectSx}>
              <MenuItem value="all">All status</MenuItem>
              {['Active', 'Completed', 'On Hold', 'Delayed'].map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Date Range" value={dateRange} onChange={(e) => setDateRange(e.target.value)} sx={filterSelectSx}>
              <MenuItem value="all">Any date</MenuItem>
              <MenuItem value="7d">Due in 7 days</MenuItem>
              <MenuItem value="30d">Due in 30 days</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
            </TextField>
            {(appliedFilters.length > 0 || chipFilter !== 'all' || search) && (
              <Button size="small" onClick={resetFilters} startIcon={<CloseIcon />}>
                Reset filters
              </Button>
            )}
          </Stack>
        </Collapse>

        {appliedFilters.length > 0 && (
          <Stack
            direction="row"
            useFlexGap
            sx={{
              gap: 1,
              flexWrap: "wrap",
              mt: 2
            }}>
            {appliedFilters.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                size="small"
                onDelete={() => clearApplied(f.key)}
                sx={{ fontWeight: 650, bgcolor: '#EEF2FF', color: '#4338CA' }}
              />
            ))}
          </Stack>
        )}
      </Paper>
      {/* KPI ROW */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 3,
          mb: 4,
        }}
      >
        <MetricCard
          label="Total Projects"
          value={totals.total}
          icon={<FolderIcon />}
          tint="#EEF2FF"
          iconColor="#6366F1"
          trend={totals.avgProgress ? `• ${totals.avgProgress}% avg progress` : undefined}
          trendUp
        />
        <MetricCard
          label="Active Projects"
          value={totals.active}
          icon={<ActiveIcon />}
          tint="#ECFDF5"
          iconColor="#059669"
        />
        <MetricCard
          label="Completed Projects"
          value={totals.completed}
          icon={<CheckIcon />}
          tint="#EFF6FF"
          iconColor="#2563EB"
        />
        <MetricCard
          label="Delayed Projects"
          value={totals.delayed}
          icon={<OverdueIcon />}
          tint="#FEF2F2"
          iconColor="#DC2626"
          trend={totals.delayed ? '• Needs attention' : undefined}
          trendUp={totals.delayed === 0}
        />
        </Box>
      {loading ? (
        <LoadingSkeleton view={view} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No Projects Found"
          description="Create your first project or import a CSV backlog to get started."
          actionText="Create Project"
          onActionClick={() => navigate('/projects/upload')}
        />
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{ ...glassSx, p: 6, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 750, fontSize: '1.15rem', mb: 1 }}>No projects match</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>
            Try adjusting search or filters to find what you need.
          </Typography>
          <Button variant="contained" onClick={resetFilters}>
            Reset filters
          </Button>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: '1fr 300px' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {view === 'grid' ? (
              <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 3,
                }}
              >
                {paged.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    proj={proj}
                    search={search.trim()}
                    onOpen={(p) => navigate(`/projects/${p.id}/tasks`)}
                    onDashboard={(p) => navigate(`/projects/${p.id}/dashboard`)}
                    onCalendar={(p) => navigate(`/projects/${p.id}/calendar`)}
                    onShare={(p) => setShareProj(p)}
                    onMenu={(e, p) => {
                      setMenuAnchor(e.currentTarget);
                      setMenuProj(p);
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Paper elevation={0} sx={{ ...glassSx, overflow: 'hidden' }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table stickyHeader sx={{ minWidth: 1100 }}>
                    <TableHead>
                      <TableRow>
                        {['Project', 'Client', 'Manager', 'Status', 'Priority', 'Progress', 'Team', 'Tasks', 'Due Date', 'Hours', 'Actions'].map(
                          (col) => (
                            <TableCell key={col}>{col}</TableCell>
                          )
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paged.map((proj) => {
                        const color = projectColor(proj.id);
                        const members = proj.members || [];
                        return (
                          <TableRow
                            key={proj.id}
                            hover
                sx={{
                              '& td': { borderBottomColor: 'divider' },
                              transition: tokens.motion.fast,
                              '&:hover': { bgcolor: 'rgba(79,70,229,0.03)' },
                            }}
                          >
                            <TableCell sx={{ maxWidth: 240 }}>
                              <Stack
                                direction="row"
                                sx={{
                                  alignItems: "center",
                                  gap: 1.5
                                }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: color, fontWeight: 700, borderRadius: 2, fontSize: '0.85rem' }}>
                                  {(proj.name || '?').charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                  {highlightMatch(proj.name, search.trim())}
                    </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontSize: '0.85rem' }}>
                                {highlightMatch(proj.clientName || '—', search.trim())}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {proj.manager ? (
                                <Stack
                                  direction="row"
                                  sx={{
                                    alignItems: "center",
                                    gap: 1
                                  }}>
                                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: proj.manager.color || color }}>
                                    {initials(proj.manager.name)}
                                  </Avatar>
                                  <Typography sx={{ fontSize: '0.85rem' }}>{proj.manager.name}</Typography>
                                </Stack>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={proj.status} archived={proj.archived} />
                            </TableCell>
                            <TableCell>
                              <PriorityBadge priority={proj.priority} />
                            </TableCell>
                            <TableCell>
                              <ProgressCell
                                progress={proj.progress || 0}
                                completed={proj.completed || 0}
                                total={proj.totalTasks || 0}
                                compact
                              />
                            </TableCell>
                            <TableCell>
                              {members.length === 0 ? (
                                '—'
                              ) : (
                                <AvatarGroup
                                  max={4}
                                  sx={{
                                    justifyContent: 'flex-start',
                                    '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.7rem', fontWeight: 700 },
                                  }}
                                >
                                  {members.map((m) => (
                                    <Tooltip key={m.id} title={m.name}>
                                      <Avatar sx={{ bgcolor: m.color || color }}>{initials(m.name)}</Avatar>
                                    </Tooltip>
                                  ))}
                                </AvatarGroup>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                {proj.completed || 0} / {proj.totalTasks || 0}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {proj.isProjectOverdue ? (
                                <Chip
                                  icon={<OverdueIcon sx={{ fontSize: '13px !important', color: '#DC2626 !important' }} />}
                                  label={`${formatDate(proj.dueDate)} (${proj.projectOverdueDays}d overdue)`}
                                  size="small"
                                  sx={{ bgcolor: '#FEF2F2', color: '#B91C1C', fontWeight: 800, border: '1px solid #FCA5A5' }}
                                />
                              ) : proj.revisedDeliveryDate ? (
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B21A8' }}>
                                    {formatDate(proj.dueDate)}
                                  </Typography>
                                  <Chip label="Extended" size="small" sx={{ bgcolor: '#F3E8FF', color: '#6B21A8', height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                                </Stack>
                              ) : (
                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 650 }}>{formatDate(proj.dueDate)}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontSize: '0.85rem', fontWeight: 650 }}>
                                {proj.estimatedHours || 0}h
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" sx={{
                                gap: 0.25
                              }}>
                                <Tooltip title="Open">
                                  <IconButton size="small" onClick={() => navigate(`/projects/${proj.id}/tasks`)}>
                                    <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                                <Tooltip title="Dashboard">
                                  <IconButton size="small" onClick={() => navigate(`/projects/${proj.id}/dashboard`)}>
                                    <DashboardIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                          <IconButton
                            size="small"
                                  onClick={(e) => {
                                    setMenuAnchor(e.currentTarget);
                                    setMenuProj(proj);
                                  }}
                                >
                                  <MoreIcon fontSize="small" />
                          </IconButton>
                    </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Pagination */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                mt: 3
              }}>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                Showing {from}–{to} of {filtered.length} projects
              </Typography>
              <Stack
                direction="row"
                useFlexGap
                sx={{
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap"
                }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_e, v) => setPage(v)}
                  color="primary"
                  shape="rounded"
                  size="small"
                />
                <TextField
                  select
                  size="small"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  sx={{
                    minWidth: 110,
                    '& .MuiOutlinedInput-root': { height: 36, borderRadius: 2, bgcolor: '#fff' },
                    '& .MuiSelect-select': { fontSize: '0.8rem', fontWeight: 600 },
                  }}
                >
                  {[6, 12, 24, 48].map((n) => (
                    <MenuItem key={n} value={n}>
                      {n} / page
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>
                    </Box>

          {/* RIGHT INSIGHTS PANEL */}
          <Stack
            spacing={2.5}
                    sx={{
              display: { xs: 'none', xl: 'flex' },
              position: 'sticky',
              top: 88,
            }}
          >
            <Paper elevation={0} sx={{ ...glassSx, p: 2.5 }}>
              <Typography sx={{ fontWeight: 750, fontSize: '0.9rem', mb: 2 }}>Upcoming Deadlines</Typography>
              <Stack spacing={1.5}>
                {upcomingDeadlines.length === 0 ? (
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No upcoming due dates</Typography>
                ) : (
                  upcomingDeadlines.map((p) => (
                    <Box
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}/tasks`)}
                        sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: '#F8FAFC',
                          border: '1px solid',
                          borderColor: 'divider',
                        cursor: 'pointer',
                        transition: tokens.motion.fast,
                        '&:hover': { borderColor: 'primary.main', bgcolor: '#EEF2FF' },
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 0.25 }}>{p.name}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        Due {formatDate(p.dueDate)}
                        </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </Paper>

            <Paper elevation={0} sx={{ ...glassSx, p: 2.5 }}>
              <Typography sx={{ fontWeight: 750, fontSize: '0.9rem', mb: 2 }}>Recently Updated</Typography>
              <Stack spacing={1.25}>
                {recentlyUpdated.map((p) => (
                  <Stack
                    key={p.id}
                    direction="row"
                    onClick={() => navigate(`/projects/${p.id}/tasks`)}
                    sx={{
                      gap: 1.25,
                      alignItems: "center",
                      cursor: 'pointer',
                      '&:hover .name': { color: 'primary.main' }
                    }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: projectColor(p.id), borderRadius: 1.5 }}>
                      {(p.name || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography className="name" sx={{ fontWeight: 650, fontSize: '0.8rem', transition: tokens.motion.fast }}>
                        {p.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {timeAgo(p.lastUpdated)}
                        </Typography>
                      </Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{p.progress || 0}%</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper elevation={0} sx={{ ...glassSx, p: 2.5 }}>
              <Typography sx={{ fontWeight: 750, fontSize: '0.9rem', mb: 1.5 }}>Project Insights</Typography>
              <Stack spacing={1}>
                <Stack direction="row" sx={{
                  justifyContent: "space-between"
                }}>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Portfolio progress</Typography>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{totals.avgProgress}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={totals.avgProgress}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    bgcolor: '#E2E8F0',
                    '& .MuiLinearProgress-bar': { bgcolor: '#4F46E5', borderRadius: 99 },
                  }}
                />
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', pt: 1 }}>
                  {totals.active} active · {totals.delayed} delayed · {totals.completed} completed
                    </Typography>
              </Stack>
            </Paper>
          </Stack>
                  </Box>
      )}
      {/* Mobile FAB */}
      <Can permission="csv.upload">
        <Fab
                    color="primary"
          aria-label="New project"
          onClick={() => navigate('/projects/upload')}
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            boxShadow: '0 12px 28px rgba(79,70,229,0.4)',
          }}
        >
          <AddIcon />
        </Fab>
      </Can>
      {/* Sort menu */}
      <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
        {[
          { id: 'updated', label: 'Recently updated' },
          { id: 'name', label: 'Name A–Z' },
          { id: 'progress', label: 'Progress' },
          { id: 'due', label: 'Due date' },
          { id: 'priority', label: 'Priority' },
        ].map((opt) => (
          <MenuItem
            key={opt.id}
            selected={sortBy === opt.id}
            onClick={() => {
              setSortBy(opt.id);
              setSortAnchor(null);
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem
          onClick={() => {
            setView(view === 'grid' ? 'list' : 'grid');
            setMoreAnchor(null);
          }}
        >
          {view === 'grid' ? <TableIcon fontSize="small" sx={{ mr: 1.5 }} /> : <GridIcon fontSize="small" sx={{ mr: 1.5 }} />}
          Switch to {view === 'grid' ? 'list' : 'grid'} view
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportProjectsCsv(filtered);
            setMoreAnchor(null);
            showAlert(`Exported ${filtered.length} projects`);
          }}
        >
          <ExportIcon fontSize="small" sx={{ mr: 1.5 }} /> Export CSV
        </MenuItem>
        <MenuItem
          onClick={() => {
            resetFilters();
            setMoreAnchor(null);
          }}
        >
          <ClearIcon fontSize="small" sx={{ mr: 1.5 }} /> Clear all filters
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            navigate(`/projects/${menuProj?.id}/tasks`);
            setMenuAnchor(null);
          }}
        >
          <ListIcon fontSize="small" sx={{ mr: 1.5 }} /> Open Board
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/projects/${menuProj?.id}/calendar`);
            setMenuAnchor(null);
          }}
        >
          <CalendarIcon fontSize="small" sx={{ mr: 1.5 }} /> Calendar
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/projects/${menuProj?.id}/dashboard`);
            setMenuAnchor(null);
          }}
        >
          <DashboardIcon fontSize="small" sx={{ mr: 1.5 }} /> Dashboard
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDateDialogProj(menuProj);
            setMenuAnchor(null);
          }}
        >
          <CalendarIcon fontSize="small" sx={{ mr: 1.5 }} /> Update Delivery Date
        </MenuItem>
        <Can permission="project.share">
          <MenuItem
            onClick={() => {
              setShareProj(menuProj);
              setMenuAnchor(null);
            }}
          >
            <ShareIcon fontSize="small" sx={{ mr: 1.5 }} /> Share
          </MenuItem>
        </Can>
        <Can permission="csv.upload">
          <MenuItem
            onClick={() => {
              navigate(`/projects/upload?projectId=${menuProj?.id}`);
              setMenuAnchor(null);
            }}
          >
            <UploadIcon fontSize="small" sx={{ mr: 1.5 }} /> Import CSV
          </MenuItem>
        </Can>
        <Can permission="project.delete">
          <MenuItem onClick={() => handleOpenDelete(menuProj)} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
          </MenuItem>
        </Can>
      </Menu>
      <ShareProjectDialog
        open={Boolean(shareProj)}
        onClose={() => setShareProj(null)}
        project={shareProj}
      />
      <UpdateDeliveryDateDialog
        open={Boolean(dateDialogProj)}
        onClose={() => setDateDialogProj(null)}
        project={dateDialogProj}
        onUpdated={fetchProjects}
      />
      <Dialog open={openDelete} onClose={handleCloseDelete} fullWidth maxWidth="xs">
        <DialogTitle>Delete Project?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ lineHeight: 1.6 }}>
            Are you sure you want to delete the project <strong>&quot;{deleteProj?.name}&quot;</strong>?
          </DialogContentText>
          <DialogContentText sx={{ color: 'error.main', mt: 2, fontWeight: 600, lineHeight: 1.55 }}>
            This permanently deletes all associated tasks and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
