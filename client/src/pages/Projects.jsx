import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Skeleton,
  Fab,
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
  MoreVert as MoreIcon,
  FolderOpen as FolderIcon,
  CheckCircle as CheckIcon,
  WarningAmber as OverdueIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  GridView as GridIcon,
  ViewList as TableIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Notifications as NotificationsIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  TrendingUp as OnTrackIcon,
  ErrorOutlineOutlined as AtRiskIcon,
  Timeline as TimelineIcon,
  HelpOutlineOutlined as HelpIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import ShareProjectDialog from '../components/ShareProjectDialog';
import UpdateDeliveryDateDialog from '../components/UpdateDeliveryDateDialog';
import EditProjectDialog from '../components/EditProjectDialog';
import Can from '../components/Can';
import PageContainer from '../components/PageContainer';
import { ProjectHealthBadge, DelayAnalysisDrawer } from '../components/DeliveryHealth';
import { DELIVERY_STATUS_COLORS, deliveryTimingText } from '../utils/deliveryHealth';
import { tokens } from '../theme';

const AVATAR_COLORS = ['#6366F1', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];
const FAVORITES_KEY = 'tt_project_favorites';

const STATUS_CHIP = {
  Active: { bgcolor: '#D1FAE5', color: '#047857' },
  Completed: { bgcolor: '#DBEAFE', color: '#1D4ED8' },
  'On Hold': { bgcolor: '#FFEDD5', color: '#C2410C' },
  Delayed: { bgcolor: '#FEE2E2', color: '#B91C1C' },
  Planned: { bgcolor: '#F1F5F9', color: '#475569' },
  Archived: { bgcolor: '#F1F5F9', color: '#475569' },
};

const DELIVERY_FILTER_OPTIONS = [
  { id: 'all', label: 'All Delivery Health' },
  { id: 'ON_TRACK', label: 'On Track' },
  { id: 'AT_RISK', label: 'At Risk' },
  { id: 'DUE_SOON', label: 'Due Soon' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'COMPLETED', label: 'Completed' },
];

const STATUS_FILTER_OPTIONS = [
  { id: 'all', label: 'All Status' },
  { id: 'Active', label: 'Active' },
  { id: 'Planned', label: 'Planned' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Archived', label: 'Archived' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'name-asc', label: 'Name A–Z' },
  { id: 'name-desc', label: 'Name Z–A' },
  { id: 'due', label: 'Due Date' },
  { id: 'progress', label: 'Progress' },
  { id: 'overdue', label: 'Most Overdue' },
];

const cardSx = {
  bgcolor: tokens.colors.card,
  border: '1px solid',
  borderColor: tokens.colors.border,
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

function formatProjectId(id) {
  return `PRJ-${String(id).padStart(3, '0')}`;
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

function progressBarColor(deliveryStatus) {
  const colors = DELIVERY_STATUS_COLORS[deliveryStatus] || DELIVERY_STATUS_COLORS.ON_TRACK;
  return colors.color;
}

function displayStatus(proj) {
  if (proj.archived) return 'Archived';
  if (proj.status === 'Completed' || proj.deliveryStatus === 'COMPLETED') return 'Completed';
  if (!proj.archived && proj.status === 'Active' && (proj.progress === 0 || proj.totalTasks === 0)) {
    return 'Planned';
  }
  return proj.status || 'Active';
}

function matchesStatusFilter(proj, statusFilter) {
  if (statusFilter === 'all') return true;
  return displayStatus(proj) === statusFilter;
}

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function exportProjectsCsv(rows) {
  const headers = [
    'Name',
    'Project ID',
    'Client',
    'Status',
    'Delivery Health',
    'Progress',
    'Completed',
    'Total Tasks',
    'Owner',
    'Start Date',
    'Due Date',
  ];
  const lines = rows.map((p) =>
    [
      p.name,
      formatProjectId(p.id),
      p.clientName || '',
      displayStatus(p),
      p.deliveryStatus || '',
      `${p.progress || 0}%`,
      p.completed || 0,
      p.totalTasks || 0,
      p.manager?.name || '',
      p.startDate || '',
      p.dueDate || '',
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

function StatusBadge({ proj }) {
  const label = displayStatus(proj);
  const chip = STATUS_CHIP[label] || STATUS_CHIP.Active;
  return (
    <Chip
      size="small"
      label={label}
      sx={{ fontWeight: 700, height: 26, borderRadius: 999, ...chip }}
    />
  );
}

function ProgressCell({ progress, completed, total, deliveryStatus, compact }) {
  const barColor = progressBarColor(deliveryStatus);
  return (
    <Box sx={{ minWidth: compact ? 100 : '100%' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
        {!compact && completed != null && total != null ? (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {completed} / {total}
          </Typography>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{progress}%</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: compact ? 6 : 10,
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

function KpiStripCard({ label, value, sub, icon, tint, iconColor }) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...cardSx,
        p: 2,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        minHeight: 96,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: `${tokens.radius.button}px`,
          bgcolor: tint,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          '& .MuiSvgIcon-root': { fontSize: 22 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.25 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>
          {value}
        </Typography>
        {sub ? (
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', mt: 0.25 }}>
            {sub}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}

function ProjectCard({
  proj,
  search,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onMenu,
}) {
  const color = projectColor(proj.id);
  const projectCode = formatProjectId(proj.id);
  const members = proj.members || [];
  const isOverdue = proj.deliveryStatus === 'OVERDUE' || proj.isProjectOverdue;

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
        ...cardSx,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: tokens.motion.fast,
        '&:hover': { boxShadow: tokens.shadow.hover },
        '&:focus-visible': {
          outline: `2px solid ${tokens.colors.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2.25, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.25 }}>
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', minWidth: 0, flex: 1 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: color,
                borderRadius: `${tokens.radius.button}px`,
                flexShrink: 0,
              }}
            >
              <FolderIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {highlightMatch(proj.name, search)}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 600, mt: 0.15 }}>
                {highlightMatch(projectCode, search)}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                stop(e);
                onToggleFavorite(proj.id);
              }}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              sx={{ color: isFavorite ? '#F59E0B' : 'text.secondary', p: 0.75 }}
            >
              {isFavorite ? <StarIcon sx={{ fontSize: 20 }} /> : <StarBorderIcon sx={{ fontSize: 20 }} />}
            </IconButton>
            {proj.deliveryStatus ? <ProjectHealthBadge status={proj.deliveryStatus} /> : null}
            <IconButton
              size="small"
              onClick={(e) => {
                stop(e);
                onMenu(e, proj);
              }}
              aria-label="More actions"
              sx={{ p: 0.75 }}
            >
              <MoreIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>
        </Stack>

        {proj.description ? (
          <Typography
            sx={{
              fontSize: '0.8125rem',
              color: 'text.secondary',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.6em',
            }}
          >
            {highlightMatch(proj.description, search)}
          </Typography>
        ) : (
          <Box sx={{ minHeight: '2.6em' }} />
        )}

        <ProgressCell
          progress={proj.progress || 0}
          completed={proj.completed || 0}
          total={proj.totalTasks || 0}
          deliveryStatus={proj.deliveryStatus}
        />

        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 1.25, mt: 'auto', pt: 0.5 }}>
          <Stack direction="row" useFlexGap sx={{ gap: 2.5, flexWrap: 'wrap' }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Box>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
                  Start
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{formatDate(proj.startDate)}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <EventIcon sx={{ fontSize: 16, color: isOverdue ? 'error.main' : 'text.secondary' }} />
              <Box>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
                  Due
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: isOverdue ? 'error.main' : 'text.primary',
                  }}
                >
                  {formatDate(proj.dueDate)}
                </Typography>
                {isOverdue && (
                  <Typography sx={{ fontSize: '0.7rem', color: 'error.main', fontWeight: 700 }}>
                    {deliveryTimingText(proj)}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Stack>
          {members.length > 0 ? (
            <AvatarGroup
              max={3}
              sx={{
                justifyContent: 'flex-end',
                '& .MuiAvatar-root': { width: 30, height: 30, fontSize: '0.65rem', fontWeight: 700, border: '2px solid #fff' },
              }}
            >
              {members.map((m) => (
                <Tooltip key={m.id} title={m.name}>
                  <Avatar sx={{ bgcolor: m.color || color }}>{initials(m.name)}</Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          ) : null}
        </Stack>
      </Box>
    </Paper>
  );
}

function LoadingSkeleton({ view }) {
  if (view === 'table') {
    return (
      <Paper elevation={0} sx={{ ...cardSx, p: 2 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1.5, borderRadius: 2 }} />
        ))}
      </Paper>
    );
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
          xl: 'repeat(4, minmax(0, 1fr))',
        },
        gap: 2.5,
      }}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} variant="rounded" height={360} sx={{ borderRadius: `${tokens.radius.card}px` }} />
      ))}
    </Box>
  );
}

const filterSelectSx = {
  minWidth: { xs: '100%', sm: 130 },
  flex: { sm: '1 1 130px' },
  '& .MuiOutlinedInput-root': {
    height: 36,
    bgcolor: tokens.colors.card,
    borderRadius: `${tokens.radius.input}px`,
    fontSize: '0.8125rem',
    fontWeight: 600,
  },
  '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
};

export default function Projects() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteProj, setDeleteProj] = useState(null);
  const [shareProj, setShareProj] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [view, setView] = useState(() => {
    const stored = localStorage.getItem('tt_projects_view') || 'grid';
    return stored === 'list' ? 'table' : stored;
  });
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProj, setMenuProj] = useState(null);
  const [editProj, setEditProj] = useState(null);
  const [dateDialogProj, setDateDialogProj] = useState(null);
  const [delayDrawerProj, setDelayDrawerProj] = useState(null);
  const [delayAnalysis, setDelayAnalysis] = useState(null);
  const [delayDrawerOpen, setDelayDrawerOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [favorites, setFavorites] = useState(loadFavorites);
  const navigate = useNavigate();

  const showAlert = useCallback((message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await api.getProjects();
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setFetchError('Failed to load projects. Please try again.');
      showAlert('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const delivery = searchParams.get('delivery');
    const status = searchParams.get('status');
    const q = searchParams.get('search');
    if (delivery) setDeliveryFilter(delivery);
    if (status) setStatusFilter(status);
    if (q) setGlobalSearch(q);
  }, [searchParams]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      if (isTyping) return;
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('projects-global-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('tt_projects_view', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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

  const openDelayAnalysis = async (proj) => {
    if (!proj?.id) return;
    setDelayDrawerProj(proj);
    setDelayDrawerOpen(true);
    try {
      const analysis = await api.getProjectDelayAnalysis(proj.id);
      setDelayAnalysis(analysis);
    } catch (err) {
      console.error('Failed to load delay analysis:', err);
      showAlert('Unable to load delay analysis', 'error');
    }
  };

  const effectiveSearch = (filterSearch.trim() || globalSearch.trim()).toLowerCase();

  const filtered = useMemo(() => {
    let rows = projects.filter((p) => {
      if (!matchesStatusFilter(p, statusFilter)) return false;

      if (deliveryFilter !== 'all') {
        const ds = p.deliveryStatus || 'ON_TRACK';
        if (deliveryFilter === 'AT_RISK') {
          if (!['AT_RISK', 'DUE_SOON'].includes(ds)) return false;
        } else if (ds !== deliveryFilter) return false;
      }

      if (dateStart && p.dueDate) {
        if (new Date(p.dueDate) < new Date(dateStart)) return false;
      } else if (dateStart && !p.dueDate) {
        return false;
      }

      if (dateEnd && p.dueDate) {
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59, 999);
        if (new Date(p.dueDate) > end) return false;
      } else if (dateEnd && !p.dueDate) {
        return false;
      }

      if (!effectiveSearch) return true;
      const hay = [
        p.name,
        formatProjectId(p.id),
        p.description,
        p.manager?.name,
        p.owner?.name,
        ...(p.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(effectiveSearch);
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === 'name-asc') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortBy === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''));
      if (sortBy === 'progress') return (b.progress || 0) - (a.progress || 0);
      if (sortBy === 'due') {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      }
      if (sortBy === 'overdue') return (b.projectOverdueDays || 0) - (a.projectOverdueDays || 0);
      if (sortBy === 'oldest') {
        return new Date(a.lastUpdated || a.createdAt || 0) - new Date(b.lastUpdated || b.createdAt || 0);
      }
      return new Date(b.lastUpdated || b.createdAt || 0) - new Date(a.lastUpdated || a.createdAt || 0);
    });

    return rows;
  }, [projects, effectiveSearch, deliveryFilter, statusFilter, dateStart, dateEnd, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [globalSearch, filterSearch, deliveryFilter, statusFilter, dateStart, dateEnd, sortBy, view]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const from = filtered.length === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to = Math.min(page * rowsPerPage, filtered.length);

  const overdueCount = useMemo(
    () => projects.filter((p) => p.deliveryStatus === 'OVERDUE' || p.isProjectOverdue).length,
    [projects]
  );

  const kpi = useMemo(() => {
    const total = projects.length;
    if (total === 0) {
      return {
        total: 0,
        onTrack: 0,
        atRisk: 0,
        overdue: 0,
        completed: 0,
        onTrackPct: 0,
        atRiskPct: 0,
        overduePct: 0,
        completedPct: 0,
      };
    }
    let onTrack = 0;
    let atRisk = 0;
    let overdue = 0;
    let completed = 0;
    projects.forEach((p) => {
      const ds = p.deliveryStatus || 'ON_TRACK';
      if (ds === 'ON_TRACK') onTrack += 1;
      else if (ds === 'AT_RISK' || ds === 'DUE_SOON') atRisk += 1;
      else if (ds === 'OVERDUE') overdue += 1;
      else if (ds === 'COMPLETED') completed += 1;
    });
    const pct = (n) => Number(((n / total) * 100).toFixed(2));
    return {
      total,
      onTrack,
      atRisk,
      overdue,
      completed,
      onTrackPct: pct(onTrack),
      atRiskPct: pct(atRisk),
      overduePct: pct(overdue),
      completedPct: pct(completed),
    };
  }, [projects]);

  const appliedFilters = useMemo(() => {
    const items = [];
    if (globalSearch.trim()) items.push({ key: 'globalSearch', label: `Search: ${globalSearch.trim()}` });
    if (filterSearch.trim()) items.push({ key: 'filterSearch', label: `Keyword: ${filterSearch.trim()}` });
    if (deliveryFilter !== 'all') {
      const label = DELIVERY_FILTER_OPTIONS.find((o) => o.id === deliveryFilter)?.label || deliveryFilter;
      items.push({ key: 'delivery', label: `Delivery: ${label}` });
    }
    if (statusFilter !== 'all') items.push({ key: 'status', label: `Status: ${statusFilter}` });
    if (dateStart) items.push({ key: 'dateStart', label: `From: ${dateStart}` });
    if (dateEnd) items.push({ key: 'dateEnd', label: `To: ${dateEnd}` });
    return items;
  }, [globalSearch, filterSearch, deliveryFilter, statusFilter, dateStart, dateEnd]);

  const resetFilters = () => {
    setGlobalSearch('');
    setFilterSearch('');
    setDeliveryFilter('all');
    setStatusFilter('all');
    setDateStart('');
    setDateEnd('');
    setSortBy('newest');
  };

  const clearApplied = (key) => {
    if (key === 'globalSearch') setGlobalSearch('');
    if (key === 'filterSearch') setFilterSearch('');
    if (key === 'delivery') setDeliveryFilter('all');
    if (key === 'status') setStatusFilter('all');
    if (key === 'dateStart') setDateStart('');
    if (key === 'dateEnd') setDateEnd('');
  };

  const filterSelectProps = {
    size: 'small',
    SelectProps: { displayEmpty: true },
  };

  return (
    <PageContainer maxWidth={1600} sx={{ py: { xs: 2, md: 2.5 }, px: { xs: 2, md: 3 } }}>
      {/* Unified page header — matches reference layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(220px, 1fr) minmax(320px, 1.4fr)' },
          gap: { xs: 2, lg: 3 },
          alignItems: { lg: 'start' },
          mb: 2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '1.65rem', md: '1.85rem' },
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: tokens.colors.text,
              mb: 0.5,
            }}
          >
            Projects
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: tokens.colors.textSecondary, lineHeight: 1.5 }}>
            Manage and track all your projects in one place
          </Typography>
        </Box>

        <Stack sx={{ gap: 1.25, minWidth: 0 }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <TextField
              id="projects-global-search"
              size="small"
              fullWidth
              placeholder="Search projects..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  bgcolor: tokens.colors.card,
                  borderRadius: `${tokens.radius.input}px`,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {globalSearch ? (
                        <IconButton size="small" onClick={() => setGlobalSearch('')} aria-label="Clear search">
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Chip
                          size="small"
                          label="/"
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#E2E8F0', minWidth: 26 }}
                        />
                      )}
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Tooltip title={`${overdueCount} overdue project${overdueCount === 1 ? '' : 's'}`}>
              <IconButton
                aria-label={`Notifications, ${overdueCount} overdue`}
                onClick={() => {
                  setDeliveryFilter('OVERDUE');
                  setStatusFilter('all');
                }}
                sx={{
                  border: '1px solid',
                  borderColor: tokens.colors.border,
                  bgcolor: tokens.colors.card,
                  borderRadius: `${tokens.radius.button}px`,
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                }}
              >
                <Badge badgeContent={overdueCount || null} color="error" max={99}>
                  <NotificationsIcon sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Help">
              <IconButton
                aria-label="Help"
                sx={{
                  border: '1px solid',
                  borderColor: tokens.colors.border,
                  bgcolor: tokens.colors.card,
                  borderRadius: `${tokens.radius.button}px`,
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                }}
              >
                <HelpIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="More options">
              <IconButton
                aria-label="More options"
                onClick={(e) => setMoreAnchor(e.currentTarget)}
                sx={{
                  border: '1px solid',
                  borderColor: tokens.colors.border,
                  bgcolor: tokens.colors.card,
                  borderRadius: `${tokens.radius.button}px`,
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                }}
              >
                <MoreIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack direction="row" sx={{ gap: 1, justifyContent: { xs: 'stretch', sm: 'flex-end' }, flexWrap: 'wrap' }}>
            <Can permission="csv.upload">
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => navigate('/projects/upload')}
                sx={{
                  height: 36,
                  borderRadius: `${tokens.radius.button}px`,
                  bgcolor: tokens.colors.card,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Import CSV
              </Button>
            </Can>
            <Can permission="project.create">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/projects/upload')}
                sx={{
                  height: 36,
                  borderRadius: `${tokens.radius.button}px`,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
                }}
              >
                New Project
              </Button>
            </Can>
          </Stack>
        </Stack>
      </Box>

      {/* Filter panel + active filters — single card */}
      <Paper elevation={0} sx={{ ...cardSx, mb: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search by project name or keyword..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              sx={{
                flex: { xs: '1 1 100%', lg: '2 1 200px' },
                minWidth: 180,
                '& .MuiOutlinedInput-root': {
                  height: 36,
                  bgcolor: tokens.colors.card,
                  borderRadius: `${tokens.radius.input}px`,
                  fontSize: '0.8125rem',
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              {...filterSelectProps}
              select
              label="Delivery Health"
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              sx={filterSelectSx}
            >
              {DELIVERY_FILTER_OPTIONS.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              {...filterSelectProps}
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={filterSelectSx}
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Start date"
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ ...filterSelectSx, minWidth: { xs: '100%', sm: 130 } }}
            />
            <TextField
              size="small"
              label="End date"
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ ...filterSelectSx, minWidth: { xs: '100%', sm: 130 } }}
            />
            <TextField
              {...filterSelectProps}
              select
              label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              sx={filterSelectSx}
            >
              {SORT_OPTIONS.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={view}
              onChange={(_e, v) => v && setView(v)}
              sx={{
                bgcolor: '#F1F5F9',
                borderRadius: `${tokens.radius.button}px`,
                p: 0.25,
                flexShrink: 0,
                height: 36,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '8px !important',
                  px: 1,
                  py: 0.5,
                  minWidth: 36,
                  '&.Mui-selected': {
                    bgcolor: tokens.colors.primary,
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
                    '&:hover': { bgcolor: tokens.colors.primaryHover },
                  },
                },
              }}
            >
              <ToggleButton value="grid" aria-label="Card view">
                <GridIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table view">
                <TableIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>

        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderTop: '1px solid',
            borderColor: tokens.colors.border,
            bgcolor: '#FAFBFC',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ gap: 1, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                <FilterIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>Active Filters</Typography>
                <Chip
                  size="small"
                  label={appliedFilters.length}
                  sx={{
                    height: 20,
                    minWidth: 20,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    bgcolor: tokens.colors.primary,
                    color: '#fff',
                  }}
                />
              </Stack>
              {appliedFilters.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  size="small"
                  onDelete={() => clearApplied(f.key)}
                  sx={{ fontWeight: 650, bgcolor: '#EEF2FF', color: '#4338CA', height: 26 }}
                />
              ))}
            </Stack>
            <Stack direction="row" sx={{ gap: 1.5, flexShrink: 0, alignItems: 'center' }}>
              <Button
                size="small"
                onClick={resetFilters}
                disabled={appliedFilters.length === 0}
                sx={{
                  fontWeight: 600,
                  color: appliedFilters.length ? 'error.main' : 'text.disabled',
                  textTransform: 'none',
                  minWidth: 0,
                  px: 0.5,
                }}
              >
                Clear All
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={fetchProjects}
                startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                sx={{ fontWeight: 600, textTransform: 'none', color: 'text.secondary' }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* KPI strip */}
      {!loading && !fetchError && projects.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(5, minmax(0, 1fr))',
            },
            gap: 1.5,
            mb: 2,
          }}
        >
          <KpiStripCard label="Total Projects" value={kpi.total} sub="All time" icon={<FolderIcon />} tint="#EEF2FF" iconColor="#6366F1" />
          <KpiStripCard label="On Track" value={kpi.onTrack} sub={`${kpi.onTrackPct}%`} icon={<OnTrackIcon />} tint="#ECFDF5" iconColor="#059669" />
          <KpiStripCard label="At Risk" value={kpi.atRisk} sub={`${kpi.atRiskPct}%`} icon={<AtRiskIcon />} tint="#FFFBEB" iconColor="#D97706" />
          <KpiStripCard label="Overdue" value={kpi.overdue} sub={`${kpi.overduePct}%`} icon={<OverdueIcon />} tint="#FEF2F2" iconColor="#DC2626" />
          <KpiStripCard label="Completed" value={kpi.completed} sub={`${kpi.completedPct}%`} icon={<CheckIcon />} tint="#EFF6FF" iconColor="#2563EB" />
        </Box>
      )}

      {loading ? (
        <LoadingSkeleton view={view} />
      ) : fetchError ? (
        <Paper elevation={0} sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', mb: 1, color: 'error.main' }}>
            Unable to load projects
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>{fetchError}</Typography>
          <Button variant="contained" onClick={fetchProjects} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        </Paper>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project or import a project CSV."
          actionText="New Project"
          actionPermission="project.create"
          onActionClick={() => navigate('/projects/upload')}
        />
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', mb: 1 }}>No projects found</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3, maxWidth: 420, mx: 'auto' }}>
            Try changing your search or filters.
          </Typography>
          <Button variant="contained" onClick={resetFilters} startIcon={<ClearIcon />}>
            Clear Filters
          </Button>
        </Paper>
      ) : (
        <>
          {view === 'grid' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                  xl: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 2.5,
              }}
            >
              {paged.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  proj={proj}
                  search={effectiveSearch}
                  isFavorite={favorites.includes(proj.id)}
                  onToggleFavorite={toggleFavorite}
                  onOpen={(p) => navigate(`/projects/${p.id}/tasks`)}
                  onMenu={(e, p) => {
                    setMenuAnchor(e.currentTarget);
                    setMenuProj(p);
                  }}
                />
              ))}
            </Box>
          ) : (
            <Paper elevation={0} sx={{ ...cardSx, overflow: 'hidden' }}>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table stickyHeader sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow>
                      {[
                        'Project',
                        'Project ID',
                        'Status',
                        'Delivery Health',
                        'Owner',
                        'Start Date',
                        'Due Date',
                        'Progress',
                        'Tasks',
                        'Actions',
                      ].map((col) => (
                        <TableCell key={col}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paged.map((proj) => {
                      const color = projectColor(proj.id);
                      const projectCode = formatProjectId(proj.id);
                      const isOverdue = proj.deliveryStatus === 'OVERDUE' || proj.isProjectOverdue;
                      return (
                        <TableRow
                          key={proj.id}
                          hover
                          sx={{
                            cursor: 'pointer',
                            '& td': { borderBottomColor: 'divider' },
                            transition: tokens.motion.fast,
                          }}
                          onClick={() => navigate(`/projects/${proj.id}/tasks`)}
                        >
                          <TableCell sx={{ maxWidth: 240 }}>
                            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: color,
                                  fontWeight: 700,
                                  borderRadius: `${tokens.radius.sm}px`,
                                }}
                              >
                                <FolderIcon sx={{ fontSize: 18 }} />
                              </Avatar>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                {highlightMatch(proj.name, effectiveSearch)}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary' }}>
                              {highlightMatch(projectCode, effectiveSearch)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <StatusBadge proj={proj} />
                          </TableCell>
                          <TableCell>
                            {proj.deliveryStatus ? (
                              <ProjectHealthBadge status={proj.deliveryStatus} />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            {proj.manager ? (
                              <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                                <Avatar
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    fontSize: '0.65rem',
                                    bgcolor: proj.manager.color || color,
                                  }}
                                >
                                  {initials(proj.manager.name)}
                                </Avatar>
                                <Typography sx={{ fontSize: '0.85rem' }}>{proj.manager.name}</Typography>
                              </Stack>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.85rem' }}>{formatDate(proj.startDate)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: '0.85rem',
                                fontWeight: isOverdue ? 700 : 400,
                                color: isOverdue ? 'error.main' : 'text.primary',
                              }}
                            >
                              {formatDate(proj.dueDate)}
                            </Typography>
                            {isOverdue && (
                              <Typography sx={{ fontSize: '0.7rem', color: 'error.main', fontWeight: 700 }}>
                                {deliveryTimingText(proj)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <ProgressCell
                              progress={proj.progress || 0}
                              completed={proj.completed || 0}
                              total={proj.totalTasks || 0}
                              deliveryStatus={proj.deliveryStatus}
                              compact
                            />
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                              {proj.completed || 0} / {proj.totalTasks || 0}
                            </Typography>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              size="small"
                              aria-label="Actions"
                              onClick={(e) => {
                                setMenuAnchor(e.currentTarget);
                                setMenuProj(proj);
                              }}
                            >
                              <MoreIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mt: 3 }}
          >
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              Showing {from} to {to} of {filtered.length} projects
            </Typography>
            <Stack direction="row" useFlexGap sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
                label="Rows per page"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                sx={{
                  minWidth: 130,
                  '& .MuiOutlinedInput-root': { height: 36, borderRadius: 2, bgcolor: tokens.colors.card },
                  '& .MuiSelect-select': { fontSize: '0.8rem', fontWeight: 600 },
                }}
              >
                {[8, 16, 24, 48].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </>
      )}

      <Can permission="project.create">
        <Fab
          color="primary"
          aria-label="New project"
          onClick={() => navigate('/projects/upload')}
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed',
            bottom: 24,
            right: 24,
          }}
        >
          <AddIcon />
        </Fab>
      </Can>

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem onClick={() => { fetchProjects(); setMoreAnchor(null); }}>
          <RefreshIcon fontSize="small" sx={{ mr: 1.5 }} /> Refresh
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportProjectsCsv(filtered);
            setMoreAnchor(null);
            showAlert(`Exported ${filtered.length} projects`);
          }}
          disabled={!filtered.length}
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
            navigate(`/projects/${menuProj?.id}/timeline`);
            setMenuAnchor(null);
          }}
        >
          <TimelineIcon fontSize="small" sx={{ mr: 1.5 }} /> Timeline
        </MenuItem>
        <Can permission="project.edit">
          <MenuItem
            onClick={() => {
              setEditProj(menuProj);
              setMenuAnchor(null);
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit Project
          </MenuItem>
        </Can>
        <MenuItem
          onClick={() => {
            setDateDialogProj(menuProj);
            setMenuAnchor(null);
          }}
        >
          <CalendarIcon fontSize="small" sx={{ mr: 1.5 }} /> Update Delivery Date
        </MenuItem>
        <MenuItem
          onClick={() => {
            openDelayAnalysis(menuProj);
            setMenuAnchor(null);
          }}
        >
          <OverdueIcon fontSize="small" sx={{ mr: 1.5 }} /> View Delay Analysis
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

      <EditProjectDialog
        open={Boolean(editProj)}
        onClose={() => setEditProj(null)}
        project={editProj}
        onUpdated={fetchProjects}
      />
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
      <DelayAnalysisDrawer
        open={delayDrawerOpen}
        onClose={() => {
          setDelayDrawerOpen(false);
          setDelayAnalysis(null);
          setDelayDrawerProj(null);
        }}
        analysis={delayAnalysis}
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
