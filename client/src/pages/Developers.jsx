import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Avatar,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Menu,
  Skeleton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Palette as PaletteIcon,
  FileDownload as ExportIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  EventBusy as LeaveIcon,
  Assignment as TasksIcon,
  Schedule as WorkloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FolderOpen as ProjectIcon,
} from '@mui/icons-material';
import api from '../services/api';
import Can from '../components/Can';
import EmptyState from '../components/EmptyState';
import PageContainer, { PageHeader, MetricCard } from '../components/PageContainer';
import FilterDropdown from '../components/TaskBoard/FilterDropdown';
import PaginationBar from '../components/PaginationBar';
import { tokens } from '../theme';
import {
  DEVELOPER_STATUSES,
  DEFAULT_ROLES,
  DEFAULT_TEAMS,
  WORKLOAD_FILTER_OPTIONS,
  computeDeveloperKpis,
  exportDevelopersCsv,
  filterDevelopers,
  formatLastActive,
  getInitials,
  getRoleBadgeStyle,
  getStatusStyle,
  getWorkloadBarColor,
  sortDeveloperProjects,
  uniqueSorted,
} from '../utils/developerHelpers';

const PRESET_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#ff9800', '#ff5722', '#795548', '#607d8b',
];

function DeveloperProjectsCell({ projects, onNavigate }) {
  const sorted = sortDeveloperProjects(projects);
  if (!sorted.length) {
    return <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>—</Typography>;
  }

  const visible = sorted.slice(0, 2);
  const hidden = sorted.slice(2);

  return (
    <Stack spacing={0.5} onClick={(e) => e.stopPropagation()}>
      {visible.map((project) => (
        <Tooltip
          key={project.id}
          title={`${project.activeTasks} active · ${project.totalTasks} total tasks`}
        >
          <Chip
            icon={<ProjectIcon sx={{ fontSize: '14px !important' }} />}
            label={project.name}
            size="small"
            clickable
            onClick={() => onNavigate(project.id)}
            sx={{
              maxWidth: 180,
              justifyContent: 'flex-start',
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: project.activeTasks > 0 ? '#EEF2FF' : '#F1F5F9',
              color: project.activeTasks > 0 ? tokens.colors.primary : tokens.colors.textSecondary,
              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
            }}
          />
        </Tooltip>
      ))}
      {hidden.length > 0 ? (
        <Tooltip title={hidden.map((p) => p.name).join(', ')}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, pl: 0.5 }}>
            +{hidden.length} more
          </Typography>
        </Tooltip>
      ) : null}
    </Stack>
  );
}


function DevelopersTableSkeleton() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: `${tokens.radius.card}px`, overflow: 'hidden' }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Stack key={i} direction="row" spacing={2} sx={{ px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="40%" height={20} />
            <Skeleton width="55%" height={16} sx={{ mt: 0.5 }} />
          </Box>
        </Stack>
      ))}
    </Paper>
  );
}

export default function Developers() {
  const navigate = useNavigate();
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [openForm, setOpenForm] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [team, setTeam] = useState('');
  const [status, setStatus] = useState('Active');
  const [skills, setSkills] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [customColor, setCustomColor] = useState('#1976d2');
  const [formErrors, setFormErrors] = useState({});

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const openProjectTasks = useCallback(
    (projectId) => navigate(`/projects/${projectId}/tasks`),
    [navigate]
  );

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuDev, setMenuDev] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchDevelopers = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await api.getDevelopers();
      setDevelopers(data);
    } catch (error) {
      console.error('Failed to load developers:', error);
      setLoadError('Could not load developers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  const roleOptions = useMemo(() => {
    const fromData = uniqueSorted(developers.map((d) => d.role));
    const merged = uniqueSorted([...DEFAULT_ROLES, ...fromData]);
    return [{ value: '', label: 'All Roles' }, ...merged.map((r) => ({ value: r, label: r }))];
  }, [developers]);

  const teamOptions = useMemo(() => {
    const fromData = uniqueSorted(developers.map((d) => d.team));
    const merged = uniqueSorted([...DEFAULT_TEAMS, ...fromData]);
    return [{ value: '', label: 'All Teams' }, ...merged.map((t) => ({ value: t, label: t }))];
  }, [developers]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Status' },
      ...DEVELOPER_STATUSES.map((s) => ({ value: s, label: s })),
    ],
    []
  );

  const projectOptions = useMemo(() => {
    const map = new Map();
    developers.forEach((dev) => {
      (dev.projects || []).forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p.name);
      });
    });
    const projects = [...map.entries()]
      .map(([id, name]) => ({ value: String(id), label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: '', label: 'All Projects' }, ...projects];
  }, [developers]);

  const filteredDevelopers = useMemo(
    () =>
      filterDevelopers(developers, {
        search: debouncedSearch,
        role: roleFilter,
        team: teamFilter,
        status: statusFilter,
        workload: workloadFilter,
        project: projectFilter,
      }),
    [developers, debouncedSearch, roleFilter, teamFilter, statusFilter, workloadFilter, projectFilter]
  );

  const kpis = useMemo(() => computeDeveloperKpis(developers), [developers]);

  const pageCount = Math.max(1, Math.ceil(filteredDevelopers.length / rowsPerPage));
  const pagedDevelopers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredDevelopers.slice(start, start + rowsPerPage);
  }, [filteredDevelopers, page, rowsPerPage]);

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || roleFilter || teamFilter || statusFilter || workloadFilter || projectFilter
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, teamFilter, statusFilter, workloadFilter, projectFilter, rowsPerPage]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setRoleFilter('');
    setTeamFilter('');
    setStatusFilter('');
    setWorkloadFilter('');
    setProjectFilter('');
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('');
    setTeam('');
    setStatus('Active');
    setSkills('');
    setColor(PRESET_COLORS[0]);
    setFormErrors({});
  };

  const handleOpenAdd = () => {
    setSelectedDeveloper(null);
    resetForm();
    setOpenForm(true);
  };

  const handleOpenEdit = (dev) => {
    setSelectedDeveloper(dev);
    setName(dev.name);
    setEmail(dev.email || '');
    setRole(dev.role || '');
    setTeam(dev.team || '');
    setStatus(dev.status || 'Active');
    setSkills(dev.skills || '');
    setColor(PRESET_COLORS.includes(dev.color) ? dev.color : 'custom');
    if (!PRESET_COLORS.includes(dev.color)) setCustomColor(dev.color);
    setFormErrors({});
    setOpenForm(true);
    setDetailsOpen(false);
  };

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Full name is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const devColor = color === 'custom' ? customColor : color;
    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      color: devColor,
      role: role.trim() || null,
      team: team.trim() || null,
      status,
      skills: skills.trim() || null,
    };

    setSaving(true);
    try {
      if (selectedDeveloper) {
        await api.updateDeveloper(selectedDeveloper.id, payload);
        showAlert('Developer updated successfully');
      } else {
        await api.createDeveloper(payload);
        showAlert('Developer added successfully');
      }
      fetchDevelopers();
      setOpenForm(false);
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to save developer';
      if (/email/i.test(msg)) setFormErrors((prev) => ({ ...prev, email: msg }));
      else showAlert(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (dev) => {
    setMenuAnchor(null);
    try {
      await api.updateDeveloper(dev.id, { status: 'Inactive' });
      showAlert(`${dev.name} deactivated`);
      fetchDevelopers();
    } catch {
      showAlert('Failed to deactivate developer', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteDeveloper(deleteTarget.id);
      showAlert('Developer deleted. Associated tasks are now unassigned.');
      fetchDevelopers();
      setOpenDelete(false);
      setDeleteTarget(null);
    } catch {
      showAlert('Failed to delete developer', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      exportDevelopersCsv(filteredDevelopers, 'developers');
      showAlert('Developers exported');
    } catch {
      showAlert('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const openRowMenu = (event, dev) => {
    setMenuAnchor(event.currentTarget);
    setMenuDev(dev);
  };

  const kpiCards = [
    {
      label: 'Total Developers',
      value: kpis.total,
      trend: 'Active team members',
      trendVariant: 'neutral',
      icon: <PeopleIcon />,
      tint: '#EEF2FF',
      iconColor: tokens.colors.primary,
    },
    {
      label: 'Active',
      value: kpis.active,
      trend: 'Currently working',
      trendUp: true,
      icon: <ActiveIcon />,
      tint: '#ECFDF5',
      iconColor: tokens.colors.success,
    },
    {
      label: 'On Leave',
      value: kpis.onLeave,
      trend: 'Not available',
      trendVariant: kpis.onLeave > 0 ? 'warning' : 'neutral',
      icon: <LeaveIcon />,
      tint: '#FFFBEB',
      iconColor: tokens.colors.warning,
    },
    {
      label: 'Total Tasks',
      value: kpis.totalTasks,
      trend: 'Assigned tasks',
      trendVariant: 'neutral',
      icon: <TasksIcon />,
      tint: '#EEF2FF',
      iconColor: tokens.colors.primary,
    },
    {
      label: 'Avg. Workload',
      value: `${kpis.avgWorkload}%`,
      trend: 'Team capacity',
      trendVariant: kpis.avgWorkload > 85 ? 'warning' : 'neutral',
      icon: <WorkloadIcon />,
      tint: '#EFF6FF',
      iconColor: '#2563EB',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Developers"
        subtitle="Manage your development team and track their workload."
        actions={
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Can permission="report.export">
              <Button
                variant="outlined"
                startIcon={exporting ? <CircularProgress size={16} /> : <ExportIcon />}
                onClick={handleExport}
                disabled={exporting || filteredDevelopers.length === 0}
                sx={{ textTransform: 'none', borderRadius: `${tokens.radius.button}px`, fontWeight: 600 }}
              >
                Export
              </Button>
            </Can>
            <Can permission="developer.manage">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
                sx={{ textTransform: 'none', borderRadius: `${tokens.radius.button}px`, fontWeight: 600 }}
              >
                Add Developer
              </Button>
            </Can>
          </Stack>
        }
      />

      {loading ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: `${tokens.radius.card}px` }} />
            ))}
          </Box>
          <DevelopersTableSkeleton />
        </>
      ) : loadError ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: `${tokens.radius.card}px` }}>
          <Typography sx={{ mb: 2, fontWeight: 600 }}>{loadError}</Typography>
          <Button variant="contained" onClick={fetchDevelopers}>Try Again</Button>
        </Paper>
      ) : developers.length === 0 ? (
        <EmptyState
          title="No developers found"
          description="Try adjusting your filters or add a new developer."
          actionText="Add Developer"
          onActionClick={handleOpenAdd}
          actionPermission="developer.manage"
          actionIcon={<AddIcon />}
        />
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {kpiCards.map((card) => (
              <MetricCard
                key={card.label}
                {...card}
                sx={{
                  minHeight: 132,
                  '&:hover': { transform: 'none', boxShadow: tokens.shadow.card },
                  '& .MuiCardContent-root': { p: 2.5, '&:last-child': { pb: 2.5 } },
                }}
              />
            ))}
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, md: 2 },
              mb: 2,
              borderRadius: `${tokens.radius.card}px`,
              borderColor: tokens.colors.border,
            }}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', lg: 'center' }}
            >
              <TextField
                size="small"
                placeholder="Search by name, email, skills or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
                }}
                sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: `${tokens.radius.input}px` } }}
                aria-label="Search developers"
              />
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                <FilterDropdown label="All Roles" options={roleOptions} value={roleFilter} onChange={setRoleFilter} minWidth={130} />
                <FilterDropdown label="All Teams" options={teamOptions} value={teamFilter} onChange={setTeamFilter} minWidth={130} />
                <FilterDropdown label="All Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} minWidth={130} />
                <FilterDropdown label="All Projects" options={projectOptions} value={projectFilter} onChange={setProjectFilter} minWidth={140} searchable />
                <FilterDropdown
                  label="Workload"
                  options={WORKLOAD_FILTER_OPTIONS}
                  value={workloadFilter}
                  onChange={setWorkloadFilter}
                  minWidth={150}
                />
                {hasActiveFilters ? (
                  <Button size="small" onClick={clearFilters} sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Clear All
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Paper>

          {filteredDevelopers.length === 0 ? (
            <EmptyState
              title="No developers match your filters."
              description="Try different search terms or clear your filters."
              actionText="Clear Filters"
              onActionClick={clearFilters}
            />
          ) : (
            <>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: `${tokens.radius.card}px`, borderColor: tokens.colors.border, overflow: 'auto' }}
              >
                <Table size="medium" aria-label="Developers">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      {['Developer', 'Role', 'Team', 'Projects', 'Workload', 'Active Tasks', 'Completed Tasks', 'Status', 'Last Active', 'Actions'].map(
                        (col) => (
                          <TableCell key={col} sx={{ fontWeight: 700, color: tokens.colors.textSecondary, whiteSpace: 'nowrap' }}>
                            {col}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedDevelopers.map((dev) => {
                      const roleStyle = getRoleBadgeStyle(dev.role);
                      const statusStyle = getStatusStyle(dev.status || 'Active');
                      const workload = dev.workloadPercent ?? 0;
                      const barColor = getWorkloadBarColor(workload);

                      return (
                        <TableRow
                          key={dev.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/developers/${dev.id}`)}
                        >
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ bgcolor: dev.color, width: 40, height: 40, fontSize: '0.875rem', fontWeight: 700 }}>
                                {getInitials(dev.name)}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }} noWrap>
                                  {dev.name}
                                </Typography>
                                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }} noWrap>
                                  {dev.email || 'No email'}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {dev.role ? (
                              <Chip
                                label={dev.role}
                                size="small"
                                sx={{
                                  bgcolor: roleStyle.bgcolor,
                                  color: roleStyle.color,
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  borderRadius: `${tokens.radius.badge}px`,
                                }}
                              />
                            ) : (
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{dev.team || '—'}</TableCell>
                          <TableCell sx={{ minWidth: 160, maxWidth: 200 }}>
                            <DeveloperProjectsCell projects={dev.projects} onNavigate={openProjectTasks} />
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <Stack spacing={0.75}>
                              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{workload}%</Typography>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(100, workload)}
                                sx={{
                                  height: 6,
                                  borderRadius: 999,
                                  bgcolor: '#E5E7EB',
                                  '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 999 },
                                }}
                                aria-label={`Workload ${workload} percent`}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{dev.activeTasks ?? 0}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{dev.completedTasks ?? 0}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusStyle.dot, flexShrink: 0 }} />
                              <Chip
                                label={dev.status || 'Active'}
                                size="small"
                                sx={{
                                  bgcolor: statusStyle.bgcolor,
                                  color: statusStyle.color,
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  borderRadius: `${tokens.radius.badge}px`,
                                }}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            {formatLastActive(dev)}
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              size="small"
                              aria-label={`Actions for ${dev.name}`}
                              onClick={(e) => openRowMenu(e, dev)}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <PaginationBar
                page={page}
                pageCount={pageCount}
                totalCount={filteredDevelopers.length}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
                rowsPerPageOptions={[6, 10, 20, 50]}
                itemLabel="developers"
              />
            </>
          )}
        </>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            if (menuDev?.id) navigate(`/developers/${menuDev.id}`);
          }}
        >
          <ViewIcon fontSize="small" sx={{ mr: 1.5 }} /> View Developer
        </MenuItem>
        {(() => {
          const projects = sortDeveloperProjects(menuDev?.projects);
          const target = projects.find((p) => p.activeTasks > 0) || projects[0];
          return target ? (
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                openProjectTasks(target.id);
              }}
            >
              <ProjectIcon fontSize="small" sx={{ mr: 1.5 }} /> View Tasks
            </MenuItem>
          ) : null;
        })()}
        <Can permission="developer.manage">
          <MenuItem onClick={() => { setMenuAnchor(null); handleOpenEdit(menuDev); }}>
            <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit Developer
          </MenuItem>
          {menuDev?.status !== 'Inactive' ? (
            <MenuItem onClick={() => handleDeactivate(menuDev)}>
              Deactivate
            </MenuItem>
          ) : null}
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              setDeleteTarget(menuDev);
              setOpenDelete(true);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
          </MenuItem>
        </Can>
      </Menu>

      <Dialog open={openForm} onClose={() => !saving && setOpenForm(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {selectedDeveloper ? 'Edit Developer' : 'Add Developer'}
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              margin="normal"
              error={Boolean(formErrors.name)}
              helperText={formErrors.name}
            />
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              error={Boolean(formErrors.email)}
              helperText={formErrors.email}
            />
            <TextField
              select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              fullWidth
              margin="normal"
            >
              <MenuItem value="">None</MenuItem>
              {uniqueSorted([...DEFAULT_ROLES, role].filter(Boolean)).map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              fullWidth
              margin="normal"
            >
              <MenuItem value="">None</MenuItem>
              {uniqueSorted([...DEFAULT_TEAMS, team].filter(Boolean)).map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              fullWidth
              margin="normal"
              required
            >
              {DEVELOPER_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="e.g. React, Node.js, TypeScript"
              helperText="Comma-separated skills for search"
            />

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1.5, fontWeight: 600 }}>
              Avatar Accent Color
            </Typography>
            <Grid container spacing={1.5}>
              {PRESET_COLORS.map((preset) => (
                <Grid key={preset}>
                  <Box
                    onClick={() => setColor(preset)}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: preset,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid',
                      borderColor: color === preset ? 'text.primary' : 'transparent',
                    }}
                  >
                    {color === preset ? <CheckIcon sx={{ color: '#fff', fontSize: 18 }} /> : null}
                  </Box>
                </Grid>
              ))}
              <Grid>
                <Box
                  onClick={() => setColor('custom')}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, red, orange, yellow, green, blue, purple)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid',
                    borderColor: color === 'custom' ? 'text.primary' : 'transparent',
                  }}
                >
                  {color === 'custom' ? <PaletteIcon sx={{ color: '#fff', fontSize: 18 }} /> : null}
                </Box>
              </Grid>
            </Grid>
            {color === 'custom' ? (
              <TextField
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                sx={{ mt: 2, width: 80 }}
              />
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenForm(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Save Developer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={openDelete} onClose={() => !deleting && setOpenDelete(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Developer?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteTarget?.name}</strong> from the directory? Assigned tasks will become unassigned.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDelete(false)} disabled={deleting}>Cancel</Button>
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
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity} variant="filled">
          {alert.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
