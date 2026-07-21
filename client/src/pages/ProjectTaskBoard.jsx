import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Button,
  Stack,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Select,
  MenuItem,
  InputBase,
  InputAdornment,
  LinearProgress,
  useTheme,
  TextField,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  KeyboardArrowDown as ExpandIcon,
  Refresh as RefreshIcon,
  Done as DoneIcon,
  OpenInNew as LaunchIcon,
  AssignmentOutlined as AssignmentIcon,
  CheckCircleOutlined as CheckCircleIcon,
  CodeOutlined as CodeIcon,
  CalendarTodayOutlined as CalendarIcon,
} from '@mui/icons-material';
import api from '../services/api';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';
import Dashboard from './Dashboard';

const PRIORITY_BADGES = {
  'P0': { color: '#EF4444', bgcolor: '#FEF2F2', borderColor: '#FCA5A5' }, // Red
  'P1': { color: '#F59E0B', bgcolor: '#FEF3C7', borderColor: '#FDE047' }, // Orange
  'P2': { color: '#3B82F6', bgcolor: '#EFF6FF', borderColor: '#BFDBFE' }, // Blue
  'P3': { color: '#10B981', bgcolor: '#ECFDF5', borderColor: '#A7F3D0' }, // Green
};

const ALL_STATUSES = [
  'Upcoming', 'Assigned', 'In Development', 'Code Review',
  'Testing', 'Completed', 'Blocked', 'On Hold'
];

export default function ProjectTaskBoard() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Data States
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State: 'overview', 'sprint-planner', or a specific phase name
  const [activeTab, setActiveTab] = useState('sprint-planner');
  
  // Status Key Filters (array of active statuses, empty means all)
  const [activeStatusFilters, setActiveStatusFilters] = useState([]);
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapsed parents mapping (parentId -> boolean)
  const [expandedParents, setExpandedParents] = useState({});

  // Drawer States
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsData = await api.getProjects();
      const curProj = projectsData.find(p => p.id === parseInt(projectId));
      setProject(curProj || { name: `Project #${projectId}` });

      const devsData = await api.getDevelopers();
      setDevelopers(devsData);

      const tasksResponse = await api.getProjectTasks(projectId, { limit: -1 });
      setTasks(tasksResponse.tasks);
    } catch (e) {
      console.error('Failed to load board tasks data:', e);
      showAlert('Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Extract unique phases dynamically from tasks to construct top tabs
  const phaseList = useMemo(() => {
    const phases = tasks.map(t => t.phase).filter(Boolean);
    return [...new Set(phases)].sort();
  }, [tasks]);

  // Handle Tab Switch
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setActiveStatusFilters([]); // Reset filters on tab switch
    setSearchQuery('');
  };

  // Inline status updates
  const handleStatusChange = async (taskId, newStatus, event) => {
    if (event) event.stopPropagation();
    try {
      const updated = await api.updateTask(taskId, { status: newStatus });
      showAlert('Task status updated successfully');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updated);
      }
    } catch (error) {
      console.error('Inline status update failed:', error);
      showAlert('Failed to update status', 'error');
    }
  };

  const handleDeveloperChange = async (taskId, newDeveloperId, event) => {
    if (event) event.stopPropagation();
    try {
      const devId = newDeveloperId ? parseInt(newDeveloperId) : null;
      const updated = await api.updateTask(taskId, { developerId: devId });
      showAlert('Task assignment updated successfully');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updated);
      }
    } catch (error) {
      console.error('Inline assignment update failed:', error);
      showAlert('Failed to update assignment', 'error');
    }
  };

  const handleRowClick = (taskItem) => {
    setSelectedTask(taskItem);
    setDrawerOpen(true);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTask(updatedTask);
  };

  // Toggle expand/collapse for a parent row
  const toggleParent = (parentId) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  // Status Badge/Chip styles matching screenshot specifications
  const getStatusStyle = (statusVal) => {
    switch (statusVal) {
      case 'Completed':
        return { bgcolor: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0', text: '✓ COMPLETED' };
      case 'In Development':
        return { bgcolor: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE', text: '⧗ IN DEVELOPMENT' };
      case 'Testing':
        return { bgcolor: '#FAF5FF', color: '#A855F7', border: '1px solid #E9D5FF', text: '🧪 TESTING' };
      case 'Code Review':
        return { bgcolor: '#EEF2F6', color: '#4F46E5', border: '1px solid #C7D2FE', text: '👁 CODE REVIEW' };
      case 'Blocked':
        return { bgcolor: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5', text: '🛇 BLOCKED' };
      case 'On Hold':
        return { bgcolor: '#FFF7ED', color: '#F97316', border: '1px solid #FFEDD5', text: '⏸ ON HOLD' };
      case 'Upcoming':
      case 'Planned':
        return { bgcolor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', text: '⚙ PLANNED' };
      default:
        return { bgcolor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', text: statusVal?.toUpperCase() };
    }
  };

  const getDevInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  // Toggle status filter from the keybar
  const toggleStatusFilter = (statusVal) => {
    setActiveStatusFilters((prev) => {
      if (prev.includes(statusVal)) {
        return prev.filter((s) => s !== statusVal);
      } else {
        return [...prev, statusVal];
      }
    });
  };

  // Filter Tasks list by active tab and status filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Filter by Active Phase Tab
      if (activeTab !== 'overview' && activeTab !== 'sprint-planner') {
        if (task.phase !== activeTab) return false;
      }

      // 2. Filter by Status Key Pills
      if (activeStatusFilters.length > 0) {
        if (!activeStatusFilters.includes(task.status)) return false;
      }

      // 3. Filter by Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchId = task.taskId?.toLowerCase().includes(query);
        const matchName = task.taskName?.toLowerCase().includes(query);
        const matchModule = task.module?.toLowerCase().includes(query);
        if (!matchId && !matchName && !matchModule) return false;
      }

      return true;
    });
  }, [tasks, activeTab, activeStatusFilters, searchQuery]);

  // Compute Grouped Task Data for Hierarchical Phase view
  const hierarchicalData = useMemo(() => {
    // 1. Group tasks by base Module (parent)
    const groups = {};
    filteredTasks.forEach((t) => {
      // Check if module looks like a child (contains a dash: e.g. 1.13-1)
      const isChild = t.module && t.module.includes('-');
      const parentModuleId = isChild ? t.module.split('-')[0] : t.module || 'Unassigned';

      if (!groups[parentModuleId]) {
        groups[parentModuleId] = {
          moduleId: parentModuleId,
          name: isChild ? '' : t.taskName, // Parent row takes name from parent task
          description: isChild ? '' : t.description,
          status: 'Upcoming',
          priority: 'P2',
          week: t.week,
          phase: t.phase,
          notes: t.remarks,
          isRealParent: !isChild,
          tasks: [],
          parentTask: null
        };
      }

      if (isChild) {
        groups[parentModuleId].tasks.push(t);
      } else {
        groups[parentModuleId].parentTask = t;
        groups[parentModuleId].name = t.taskName;
        groups[parentModuleId].description = t.description;
        groups[parentModuleId].status = t.status;
        groups[parentModuleId].priority = t.priority || 'P2';
        groups[parentModuleId].week = t.week;
        groups[parentModuleId].phase = t.phase;
        groups[parentModuleId].notes = t.remarks;
      }
    });

    // Resolve details for parent groups, sorting their child tasks
    const resolvedGroups = Object.values(groups).map((group) => {
      // Sort sub-tasks by their numerical sub-id (e.g. 1.13-1, 1.13-2)
      group.tasks.sort((a, b) => {
        const subA = parseInt(a.module.split('-')[1] || 0);
        const subB = parseInt(b.module.split('-')[1] || 0);
        return subA - subB;
      });

      // Calculate aggregate stats for parent row progress
      const children = group.parentTask ? [group.parentTask, ...group.tasks] : group.tasks;
      const total = children.length;
      const completed = children.filter((t) => t.status === 'Completed').length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Parent status falls back based on children
      let parentStatus = group.status;
      if (total > 0) {
        if (completed === total) parentStatus = 'Completed';
        else if (children.some(t => t.status === 'In Development')) parentStatus = 'In Development';
        else if (children.some(t => t.status === 'Testing')) parentStatus = 'Testing';
        else if (children.some(t => t.status === 'Code Review')) parentStatus = 'Code Review';
        else if (children.some(t => t.status === 'Blocked')) parentStatus = 'Blocked';
      }

      return {
        ...group,
        totalTasks: total,
        completedTasks: completed,
        completionPct: pct,
        status: parentStatus
      };
    });

    // Sort parent modules alphabetically/numerically by Module ID
    resolvedGroups.sort((a, b) => {
      return a.moduleId.localeCompare(b.moduleId, undefined, { numeric: true, sensitivity: 'base' });
    });

    return resolvedGroups;
  }, [filteredTasks]);

  // Compute Week-Grouped Data for Sprint Planner view
  const sprintPlannerWeeks = useMemo(() => {
    const weeks = {};
    filteredTasks.forEach((t) => {
      // Normalize week code (e.g., 'W1' or 'Week 1' -> 'W1')
      let weekKey = t.week || 'Unscheduled';
      if (weekKey.toLowerCase().startsWith('week')) {
        const num = weekKey.match(/\d+/);
        if (num) weekKey = `W${num[0]}`;
      } else if (weekKey.toLowerCase().startsWith('w') && weekKey.length > 1) {
        weekKey = weekKey.toUpperCase();
      }

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekId: weekKey,
          tasks: []
        };
      }
      weeks[weekKey].tasks.push(t);
    });

    // Sort weeks chronologically
    const sortedWeeks = Object.values(weeks).sort((a, b) => {
      if (a.weekId === 'Unscheduled') return 1;
      if (b.weekId === 'Unscheduled') return -1;
      return a.weekId.localeCompare(b.weekId, undefined, { numeric: true });
    });

    // Sort tasks inside each week by Module ID
    sortedWeeks.forEach(w => {
      w.tasks.sort((a, b) => {
        return (a.module || '').localeCompare((b.module || ''), undefined, { numeric: true });
      });
    });

    return sortedWeeks;
  }, [filteredTasks]);

  // General counts for current view (dynamic KPIs)
  const viewKPIs = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'Completed').length;
    const inDev = filteredTasks.filter(t => t.status === 'In Development').length;
    const planned = filteredTasks.filter(t => ['Upcoming', 'Assigned', 'Planned'].includes(t.status)).length;

    return {
      total,
      completed,
      completedPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      inDev,
      inDevPct: total > 0 ? Math.round((inDev / total) * 100) : 0,
      planned,
      plannedPct: total > 0 ? Math.round((planned / total) * 100) : 0,
    };
  }, [filteredTasks]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Upper Navigation Tabs */}
      <Paper variant="outlined" sx={{ borderRadius: 3, border: 'none', borderBottom: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            '& .MuiTab-root': { fontWeight: 650, py: 2, fontSize: '0.88rem' }
          }}
        >
          <Tab value="overview" label="Overview" />
          {phaseList.map((phase) => (
            <Tab key={phase} value={phase} label={phase} />
          ))}
          <Tab value="sprint-planner" label="Sprint Planner" />
        </Tabs>
      </Paper>

      {/* OVERVIEW (EMBEDDED DASHBOARD VIEW) */}
      {activeTab === 'overview' && (
        <Dashboard />
      )}

      {/* SPRINT PLANNER & HIERARCHICAL PHASE VIEWS */}
      {activeTab !== 'overview' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          
          {/* KPI Cards (Matches image layout) */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'default', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bgcolor: 'primary.main' }} />
                <CardContent sx={{ py: 2.5, px: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Tasks
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 850, mt: 0.5 }}>
                        {viewKPIs.total}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        tasks in view
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'primary.main', width: 38, height: 38 }}>
                      <AssignmentIcon fontSize="small" />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'default', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bgcolor: 'success.main' }} />
                <CardContent sx={{ py: 2.5, px: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Completed
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 850, mt: 0.5, color: 'success.main' }}>
                        {viewKPIs.completed}
                      </Typography>
                      <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, mt: 0.5, display: 'block' }}>
                        {viewKPIs.completedPct}% of total
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main', width: 38, height: 38 }}>
                      <CheckCircleIcon fontSize="small" />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'default', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bgcolor: 'secondary.main' }} />
                <CardContent sx={{ py: 2.5, px: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        In Development
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 850, mt: 0.5, color: 'secondary.main' }}>
                        {viewKPIs.inDev}
                      </Typography>
                      <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 600, mt: 0.5, display: 'block' }}>
                        {viewKPIs.inDevPct}% of total
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: 'secondary.main', width: 38, height: 38 }}>
                      <CodeIcon fontSize="small" />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ cursor: 'default', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bgcolor: 'text.secondary' }} />
                <CardContent sx={{ py: 2.5, px: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Planned
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 850, mt: 0.5, color: 'text.secondary' }}>
                        {viewKPIs.planned}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5, display: 'block' }}>
                        {viewKPIs.plannedPct}% of total
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(107, 114, 128, 0.1)', color: 'text.secondary', width: 38, height: 38 }}>
                      <CalendarIcon fontSize="small" />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filtering Bar */}
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderRadius: 3 }}>
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status Key
              </Typography>
              
              {ALL_STATUSES.map((statusVal) => {
                const styles = getStatusStyle(statusVal);
                const isActive = activeStatusFilters.includes(statusVal);
                return (
                  <Chip
                    key={statusVal}
                    label={styles.text}
                    onClick={() => toggleStatusFilter(statusVal)}
                    sx={{
                      cursor: 'pointer',
                      height: 26,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      bgcolor: isActive ? styles.color : (theme => theme.palette.mode === 'dark' ? '#1f293730' : '#f8fafc'),
                      color: isActive ? '#fff' : styles.color,
                      border: `1px solid ${isActive ? 'transparent' : styles.color}35`,
                      '&:hover': {
                        bgcolor: isActive ? styles.color : 'action.hover',
                      },
                      transition: 'all 0.15s ease',
                    }}
                  />
                );
              })}

              {activeStatusFilters.length > 0 && (
                <Button size="small" color="inherit" onClick={() => setActiveStatusFilters([])}>
                  Clear Keys
                </Button>
              )}
            </Stack>

            {/* Inline search filter */}
            <TextField
              placeholder="Search module or task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 220 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Paper>

          {/* TABLE CONTAINER */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            
            {/* VIEW A: HIERARCHICAL PHASE VIEWS */}
            {activeTab !== 'sprint-planner' && (
              <Table size="small">
                <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1f2937' : '#0f172a' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1.5 }} width="40" />
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Phase</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Week</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Module ID</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Task ID</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }} width="280">Feature Name</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }} width="220">Description</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Developer</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Start</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Est. Done</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Priority</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Notes</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                
                <TableBody>
                  {hierarchicalData.map((group) => {
                    const isExpanded = expandedParents[group.moduleId];
                    const parentStatusStyle = getStatusStyle(group.status);
                    
                    return (
                      <React.Fragment key={group.moduleId}>
                        {/* Parent Row */}
                        <TableRow 
                          onClick={() => toggleParent(group.moduleId)}
                          sx={{ 
                            cursor: 'pointer',
                            bgcolor: isDark ? '#1e293b40' : 'rgba(79, 70, 229, 0.03)',
                            '&:hover': { bgcolor: isDark ? '#1e293b60' : 'rgba(79, 70, 229, 0.06)' },
                          }}
                        >
                          <TableCell>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleParent(group.moduleId); }}>
                              {isExpanded ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          
                          {/* Phase tag */}
                          <TableCell>
                            <Chip 
                              label={group.phase || 'N/A'} 
                              size="small" 
                              sx={{ 
                                bgcolor: isDark ? '#1e293b' : '#EFF6FF', 
                                color: '#3B82F6', 
                                fontWeight: 700,
                                height: 22,
                                fontSize: '0.72rem'
                              }} 
                            />
                          </TableCell>
                          
                          {/* Week Tag */}
                          <TableCell>
                            <Chip 
                              label={group.week || 'N/A'} 
                              size="small" 
                              sx={{ 
                                bgcolor: '#FEF3C7', 
                                color: '#D97706', 
                                border: '1px solid #FDE047',
                                fontWeight: 700,
                                height: 22,
                                fontSize: '0.72rem'
                              }} 
                            />
                          </TableCell>
                          
                          {/* Module ID */}
                          <TableCell sx={{ fontWeight: 750, color: 'primary.main' }}>
                            {group.moduleId}
                          </TableCell>

                          {/* Task ID */}
                          <TableCell sx={{ fontWeight: 650, color: 'text.secondary', fontSize: '0.82rem' }}>
                            {group.parentTask?.taskId || '—'}
                          </TableCell>
                          
                          {/* Feature Name & Progress Bar */}
                          <TableCell>
                            <Box sx={{ py: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 750 }}>
                                {group.name || 'Access Management'}
                              </Typography>
                              
                              {/* Completion Meter Progress */}
                              <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                                <Box sx={{ width: 80 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={group.completionPct} 
                                    color="success" 
                                    sx={{ height: 4, borderRadius: 2 }} 
                                  />
                                </Box>
                                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 700 }}>
                                  {group.completedTasks}/{group.totalTasks}
                                </Typography>
                              </Stack>
                            </Box>
                          </TableCell>
                          
                          {/* Description */}
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                              {group.description || group.name}
                            </Typography>
                          </TableCell>
                          
                          {/* Parent status chip */}
                          <TableCell>
                            <Chip
                              label={parentStatusStyle.text}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                bgcolor: parentStatusStyle.bgcolor,
                                color: parentStatusStyle.color,
                                border: parentStatusStyle.border,
                              }}
                            />
                          </TableCell>

                          {/* Parent Developer assignment cell */}
                          <TableCell>
                            {group.parentTask ? (
                              <Select
                                value={group.parentTask.developerId || ''}
                                onChange={(e) => handleDeveloperChange(group.parentTask.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                size="small"
                                variant="standard"
                                disableUnderline
                                sx={{ fontSize: '0.8rem' }}
                              >
                                <MenuItem value="">
                                  <Stack direction="row" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 18, height: 18, fontSize: '0.6rem', bgcolor: 'grey.300' }}>?</Avatar>
                                    <Typography variant="caption"><em>Unassigned</em></Typography>
                                  </Stack>
                                </MenuItem>
                                {developers.map((dev) => (
                                  <MenuItem key={dev.id} value={dev.id}>
                                    <Stack direction="row" alignItems="center" gap={1}>
                                      <Avatar sx={{ width: 18, height: 18, fontSize: '0.6rem', bgcolor: dev.color, fontWeight: 700 }}>
                                        {getDevInitials(dev.name)}
                                      </Avatar>
                                      <Typography variant="caption" sx={{ fontWeight: 550 }}>{dev.name}</Typography>
                                    </Stack>
                                  </MenuItem>
                                ))}
                              </Select>
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>—</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>—</TableCell>
                          
                          {/* Priority */}
                          <TableCell>
                            {PRIORITY_BADGES[group.priority] ? (
                              <Box sx={{ 
                                display: 'inline-block',
                                border: '1px solid',
                                px: 1,
                                py: 0.2,
                                borderRadius: 1,
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                ...PRIORITY_BADGES[group.priority]
                              }}>
                                {group.priority}
                              </Box>
                            ) : '—'}
                          </TableCell>
                          
                          {/* Notes */}
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 120 }}>
                              {group.notes || '—'}
                            </Typography>
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right">
                            {group.parentTask && (
                              <Tooltip title="Task Details">
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(group.parentTask); }}
                                  sx={{ color: 'primary.main' }}
                                >
                                  <LaunchIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Collapsed Children Sub-Tasks */}
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={14}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ py: 1, pl: 4, pr: 1 }}>
                                <Table size="small">
                                  <TableBody>
                                    {group.tasks.map((child, childIdx) => {
                                      const childStatusStyle = getStatusStyle(child.status);
                                      const hasPrio = PRIORITY_BADGES[child.priority];
                                      
                                      return (
                                        <TableRow 
                                          key={child.id}
                                          onClick={() => handleRowClick(child)}
                                          sx={{ 
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'action.hover', '& .row-actions': { opacity: 1 } },
                                            '& td': { borderBottom: childIdx === group.tasks.length - 1 ? 'none' : '1px solid divider' }
                                          }}
                                        >
                                          {/* Subtask indent arrow */}
                                          <TableCell width="40" sx={{ pl: 4, color: 'text.secondary' }}>
                                            ↳
                                          </TableCell>
                                          
                                          {/* Phase */}
                                          <TableCell width="85">
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                              {child.phase}
                                            </Typography>
                                          </TableCell>
                                          
                                          {/* Week */}
                                          <TableCell width="70">
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                              {child.week}
                                            </Typography>
                                          </TableCell>
                                          
                                          {/* Module ID */}
                                          <TableCell width="90" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                            {child.module}
                                          </TableCell>

                                          {/* Task ID */}
                                          <TableCell sx={{ fontWeight: 650, color: 'text.secondary', fontSize: '0.8rem' }}>
                                            {child.taskId}
                                          </TableCell>
                                          
                                          {/* Title name */}
                                          <TableCell width="280">
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                              {child.taskName}
                                            </Typography>
                                          </TableCell>
                                          
                                          {/* Description */}
                                          <TableCell width="220">
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                                              {child.description || '—'}
                                            </Typography>
                                          </TableCell>
                                          
                                          {/* Status inline editor dropdown */}
                                          <TableCell width="150">
                                            <Select
                                              value={child.status}
                                              onChange={(e) => handleStatusChange(child.id, e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              size="small"
                                              variant="standard"
                                              disableUnderline
                                              sx={{ fontSize: '0.75rem' }}
                                            >
                                              {ALL_STATUSES.map((opt) => {
                                                const optStyle = getStatusStyle(opt);
                                                return (
                                                  <MenuItem key={opt} value={opt}>
                                                    <Chip
                                                      label={optStyle.text}
                                                      size="small"
                                                      sx={{
                                                        height: 22,
                                                        fontSize: '0.68rem',
                                                        fontWeight: 700,
                                                        bgcolor: optStyle.bgcolor,
                                                        color: optStyle.color,
                                                        border: optStyle.border,
                                                      }}
                                                    />
                                                  </MenuItem>
                                                );
                                              })}
                                            </Select>
                                          </TableCell>

                                          {/* Developer dropdown */}
                                          <TableCell>
                                            <Select
                                              value={child.developerId || ''}
                                              onChange={(e) => handleDeveloperChange(child.id, e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              size="small"
                                              variant="standard"
                                              disableUnderline
                                              sx={{ fontSize: '0.8rem' }}
                                            >
                                              <MenuItem value="">
                                                <Stack direction="row" alignItems="center" gap={1}>
                                                  <Avatar sx={{ width: 18, height: 18, fontSize: '0.6rem', bgcolor: 'grey.300' }}>?</Avatar>
                                                  <Typography variant="caption"><em>Unassigned</em></Typography>
                                                </Stack>
                                              </MenuItem>
                                              {developers.map((dev) => (
                                                <MenuItem key={dev.id} value={dev.id}>
                                                  <Stack direction="row" alignItems="center" gap={1}>
                                                    <Avatar sx={{ width: 18, height: 18, fontSize: '0.6rem', bgcolor: dev.color, fontWeight: 700 }}>
                                                      {getDevInitials(dev.name)}
                                                    </Avatar>
                                                    <Typography variant="caption" sx={{ fontWeight: 550 }}>{dev.name}</Typography>
                                                  </Stack>
                                                </MenuItem>
                                              ))}
                                            </Select>
                                          </TableCell>
                                          
                                          {/* Dates */}
                                          <TableCell width="95">
                                            <Typography variant="caption" color="text.secondary">
                                              {child.startDate || '—'}
                                            </Typography>
                                          </TableCell>
                                          <TableCell width="95">
                                            <Typography variant="caption" color="text.secondary">
                                              {child.dueDate || '—'}
                                            </Typography>
                                          </TableCell>
                                          
                                          {/* Priority Box */}
                                          <TableCell width="75">
                                            {hasPrio ? (
                                              <Box sx={{ 
                                                display: 'inline-block',
                                                border: '1px solid',
                                                px: 0.8,
                                                py: 0.1,
                                                borderRadius: 0.8,
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                ...hasPrio
                                              }}>
                                                {child.priority}
                                              </Box>
                                            ) : '—'}
                                          </TableCell>
                                          
                                          {/* Notes */}
                                          <TableCell>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 120 }}>
                                              {child.remarks || '—'}
                                            </Typography>
                                          </TableCell>

                                          {/* Actions */}
                                          <TableCell align="right">
                                            <Box className="row-actions" sx={{ opacity: 0, transition: 'opacity 0.2s', display: 'flex', justifyContent: 'flex-end' }}>
                                              <Tooltip title="Task Details">
                                                <IconButton 
                                                  size="small" 
                                                  onClick={(e) => { e.stopPropagation(); handleRowClick(child); }}
                                                  sx={{ color: 'primary.main' }}
                                                >
                                                  <LaunchIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </Box>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* VIEW B: SPRINT PLANNER (WEEK GROUPED TABLE) */}
            {activeTab === 'sprint-planner' && (
              <Table size="small">
                <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1f2937' : '#0f172a' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Week</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Module ID</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Task ID</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Phase</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }} width="300">Feature / Task</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Developer</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }} align="center">Est. Days</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Start Date</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>End Date</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Priority</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Dependencies</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Notes</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {sprintPlannerWeeks.map((weekGroup) => (
                    <React.Fragment key={weekGroup.weekId}>
                      {/* Week Header Row Grouping */}
                      <TableRow sx={{ bgcolor: isDark ? '#1f293780' : '#f8fafc', '& td': { py: 1.2, borderBottom: '1px solid divider' } }}>
                        <TableCell colSpan={14}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', pl: 1 }}>
                            {`>> ${weekGroup.weekId === 'Unscheduled' ? 'UNSCHEDULED TASKS' : `${weekGroup.weekId.toUpperCase()} - ${weekGroup.tasks.length} tasks`}`}
                          </Typography>
                        </TableCell>
                      </TableRow>

                      {/* Tasks of Week */}
                      {weekGroup.tasks.map((taskItem) => {
                        const statusStyle = getStatusStyle(taskItem.status);
                        const hasPrio = PRIORITY_BADGES[taskItem.priority];
                        const isChild = taskItem.module && taskItem.module.includes('-');

                        return (
                          <TableRow
                            key={taskItem.id}
                            onClick={() => handleRowClick(taskItem)}
                            className="row-actions-parent"
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'action.hover', '& .row-actions': { opacity: 1 } },
                            }}
                          >
                            {/* Week */}
                            <TableCell sx={{ fontWeight: 650, color: 'text.secondary', fontSize: '0.82rem' }}>
                              {taskItem.week || '—'}
                            </TableCell>

                            {/* Module ID */}
                            <TableCell sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.82rem' }}>
                              {taskItem.module || '—'}
                            </TableCell>

                            {/* Task ID */}
                            <TableCell sx={{ fontWeight: 650, color: 'text.secondary', fontSize: '0.82rem' }}>
                              {taskItem.taskId || '—'}
                            </TableCell>

                            {/* Phase Tag */}
                            <TableCell>
                              {taskItem.phase ? (
                                <Chip
                                  label={taskItem.phase}
                                  size="small"
                                  sx={{
                                    bgcolor: taskItem.phase.includes('Infra') ? '#FFF7ED' : '#EFF6FF',
                                    color: taskItem.phase.includes('Infra') ? '#F97316' : '#3B82F6',
                                    fontWeight: 700,
                                    height: 20,
                                    fontSize: '0.68rem',
                                  }}
                                />
                              ) : '—'}
                            </TableCell>

                            {/* Feature / Task Title */}
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: isChild ? 500 : 700 }}>
                                {`${isChild ? '↳ ' : ''}${taskItem.taskName}`}
                              </Typography>
                            </TableCell>

                            {/* Status Select editor */}
                            <TableCell>
                              <Select
                                value={taskItem.status}
                                onChange={(e) => handleStatusChange(taskItem.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                size="small"
                                variant="standard"
                                disableUnderline
                                sx={{ fontSize: '0.75rem' }}
                              >
                                {ALL_STATUSES.map((opt) => {
                                  const optStyle = getStatusStyle(opt);
                                  return (
                                    <MenuItem key={opt} value={opt}>
                                      <Chip
                                        label={optStyle.text}
                                        size="small"
                                        sx={{
                                          height: 22,
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          bgcolor: optStyle.bgcolor,
                                          color: optStyle.color,
                                          border: optStyle.border,
                                        }}
                                      />
                                    </MenuItem>
                                  );
                                })}
                              </Select>
                            </TableCell>

                            {/* Developer assignment Select editor */}
                            <TableCell>
                              <Select
                                value={taskItem.developerId || ''}
                                onChange={(e) => handleDeveloperChange(taskItem.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                size="small"
                                variant="standard"
                                disableUnderline
                                sx={{ fontSize: '0.8rem' }}
                              >
                                <MenuItem value="">
                                  <Stack direction="row" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 18, height: 18, fontSize: '0.6rem', bgcolor: 'grey.300' }}>?</Avatar>
                                    <Typography variant="caption"><em>Unassigned</em></Typography>
                                  </Stack>
                                </MenuItem>
                                {developers.map((dev) => (
                                  <MenuItem key={dev.id} value={dev.id}>
                                    <Stack direction="row" alignItems="center" gap={1}>
                                      <Avatar sx={{ width: 18, height: 18, fontSize: '0.6rem', bgcolor: dev.color, fontWeight: 700 }}>
                                        {getDevInitials(dev.name)}
                                      </Avatar>
                                      <Typography variant="caption" sx={{ fontWeight: 550 }}>{dev.name}</Typography>
                                    </Stack>
                                  </MenuItem>
                                ))}
                              </Select>
                            </TableCell>

                            {/* Est. Days */}
                            <TableCell align="center" sx={{ fontWeight: 650, fontSize: '0.82rem' }}>
                              {taskItem.estDays !== null && taskItem.estDays !== undefined ? taskItem.estDays : '—'}
                            </TableCell>

                            {/* Start Date */}
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                              {taskItem.startDate || '—'}
                            </TableCell>

                            {/* Due Date (End Date) */}
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                              {taskItem.dueDate || '—'}
                            </TableCell>

                            {/* Priority Badge */}
                            <TableCell>
                              {hasPrio ? (
                                <Box sx={{
                                  display: 'inline-block',
                                  border: '1px solid',
                                  px: 1,
                                  py: 0.2,
                                  borderRadius: 1,
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  ...hasPrio
                                }}>
                                  {taskItem.priority}
                                </Box>
                              ) : '—'}
                            </TableCell>

                            {/* Dependencies */}
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                              {taskItem.dependencies || '—'}
                            </TableCell>

                            {/* Notes / Remarks */}
                            <TableCell>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 150 }}>
                                {taskItem.remarks || '—'}
                              </Typography>
                            </TableCell>

                            {/* Actions */}
                            <TableCell align="right">
                              <Box className="row-actions" sx={{ opacity: 0, transition: 'opacity 0.2s', display: 'flex', justifyContent: 'flex-end' }}>
                                <Tooltip title="Task Details">
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => { e.stopPropagation(); handleRowClick(taskItem); }}
                                    sx={{ color: 'primary.main' }}
                                  >
                                    <LaunchIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}

          </TableContainer>
        </Box>
      )}

      {/* Side Details Drawer */}
      <TaskDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        task={selectedTask}
        developers={developers}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Alerts popup */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
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
    </Box>
  );
}
