import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CalendarTodayOutlined as CalendarIcon,
  Add as AddIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import api from '../services/api';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';
import KanbanBoard from '../components/KanbanBoard';
import {
  TaskBoardToolbar,
  HierarchicalTaskTable,
  ALL_STATUSES,
  PRIORITY_BADGES_LIGHT,
  PRIORITY_BADGES_DARK,
  normalizeLegacyStatus,
} from '../components/TaskBoard';
import { useProjectId } from '../hooks/useProjectId';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../context/RoleContext';
import EmptyState from '../components/EmptyState';
import StatusRemarkDialog, { needsStatusRemark } from '../components/StatusRemarkDialog';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { getTaskProgressPercent } from '../utils/taskProgress';
import { isOverdue, getOverdueDays } from '../utils/taskManagementConstants';

const EMPTY_FILTERS = {
  phases: [],
  modules: [],
  developer: '',
  statuses: [],
  priority: '',
  overdueOnly: false,
};

/** Build Phase → Module → Task tree from work items + module metadata */
function buildPhaseTree(workTasks, allTasks, developers, { sortByOverdue = false } = {}) {
  const modulesById = {};
  allTasks.forEach((t) => {
    if (t.recordType === 'module') modulesById[t.taskId] = t;
  });

  const phases = {};

  const ensurePhase = (name) => {
    const key = name || 'Unassigned Phase';
    if (!phases[key]) {
      phases[key] = {
        id: key,
        name: key,
        modules: {},
        taskCount: 0,
        completedTasks: 0,
        developerIds: new Set(),
      };
    }
    return phases[key];
  };

  const ensureModule = (phase, moduleKey, seed = {}) => {
    if (!phase.modules[moduleKey]) {
      phase.modules[moduleKey] = {
        id: `${phase.id}::${moduleKey}`,
        moduleId: moduleKey,
        name: seed.name || '',
        parentTask: seed.parentTask || null,
        tasks: [],
        completedTasks: 0,
        taskCount: 0,
        ownerName: '',
      };
    }
    return phase.modules[moduleKey];
  };

  workTasks.forEach((t) => {
    const phase = ensurePhase(t.phase);
    let moduleKey = 'Unassigned';
    let seed = { name: 'Standalone tasks' };

    if (t.parentId && modulesById[t.parentId]) {
      moduleKey = t.parentId;
      seed = {
        name: modulesById[t.parentId].taskName,
        parentTask: modulesById[t.parentId],
      };
    } else if (t.module && String(t.module).includes('-')) {
      moduleKey = String(t.module).split('-')[0];
      const mod = modulesById[moduleKey];
      seed = { name: mod?.taskName || moduleKey, parentTask: mod || null };
    } else if (t.module && modulesById[t.module]) {
      moduleKey = t.module;
      seed = {
        name: modulesById[t.module].taskName,
        parentTask: modulesById[t.module],
      };
    } else if (t.module) {
      moduleKey = t.module;
      seed = { name: t.module };
    }

    const mod = ensureModule(phase, moduleKey, seed);
    if (seed.parentTask) mod.parentTask = seed.parentTask;
    if (seed.name) mod.name = seed.name;
    mod.tasks.push(t);
  });

  return Object.values(phases)
    .map((phase) => {
      const modules = Object.values(phase.modules)
        .map((mod) => {
          mod.tasks.sort((a, b) => {
            if (sortByOverdue) return getOverdueDays(b) - getOverdueDays(a);
            return String(a.taskId || '').localeCompare(String(b.taskId || ''), undefined, {
              numeric: true,
            });
          });
          const completed = mod.tasks.filter((t) => t.status === 'Completed').length;
          const total = mod.tasks.length;
          // Weighted average: each task contributes its workflow-stage progress (0–100)
          const weightedPct =
            total > 0
              ? Math.round(
                  mod.tasks.reduce((sum, t) => sum + getTaskProgressPercent(t), 0) / total
                )
              : 0;
          const owner =
            mod.parentTask &&
            developers.find(
              (d) =>
                d.id === mod.parentTask.developerId ||
                d.id === parseInt(mod.parentTask.developerId, 10)
            );
          return {
            ...mod,
            taskCount: total,
            completedTasks: completed,
            completionPct: weightedPct,
            ownerName: owner ? getDeveloperDisplayName(owner) : '',
          };
        })
        .sort((a, b) => {
          if (sortByOverdue) {
            const maxA = Math.max(0, ...a.tasks.map((t) => getOverdueDays(t)));
            const maxB = Math.max(0, ...b.tasks.map((t) => getOverdueDays(t)));
            return maxB - maxA || String(a.moduleId).localeCompare(String(b.moduleId), undefined, { numeric: true });
          }
          return String(a.moduleId).localeCompare(String(b.moduleId), undefined, { numeric: true });
        });

      let taskCount = 0;
      let completedTasks = 0;
      let weightedPctSum = 0;
      const developerIds = new Set();
      modules.forEach((m) => {
        taskCount += m.taskCount;
        completedTasks += m.completedTasks;
        // Accumulate weighted sum for phase-level progress
        weightedPctSum += m.completionPct * m.taskCount;
        m.tasks.forEach((t) => {
          if (t.developerId) developerIds.add(t.developerId);
        });
      });

      return {
        id: phase.id,
        name: phase.name,
        modules,
        taskCount,
        completedTasks,
        completionPct: taskCount > 0 ? Math.round(weightedPctSum / taskCount) : 0,
        developerCount: developerIds.size,
      };
    })
    .filter((p) => p.taskCount > 0)
    .sort((a, b) => {
      if (sortByOverdue) {
        const maxA = Math.max(0, ...a.modules.flatMap((m) => m.tasks.map((t) => getOverdueDays(t))));
        const maxB = Math.max(0, ...b.modules.flatMap((m) => m.tasks.map((t) => getOverdueDays(t))));
        return maxB - maxA || a.name.localeCompare(b.name, undefined, { numeric: true });
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
}

export default function ProjectTaskBoard() {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { role, project: clientProject, clientMeta } = useRole();
  const isClient = role === 'client';
  const canStatusPerm = usePermission('task.status');
  const canAssignPerm = usePermission('task.assign');
  const canEditPerm = usePermission('task.edit');
  // Clients are view-only — never allow edit/status/assign UI
  const canStatus = !isClient && canStatusPerm;
  const canAssign = !isClient && canAssignPerm;
  const canEdit = !isClient && canEditPerm;

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [searchParams] = useSearchParams();
  const [boardLayout, setBoardLayout] = useState(() => {
    const view = searchParams.get('view');
    if (view === 'kanban') return 'kanban';
    if (view === 'list' || view === 'table') return 'table';
    try {
      return localStorage.getItem('tt_task_board_layout') || 'table';
    } catch {
      return 'table';
    }
  });

  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'kanban') setBoardLayout('kanban');
    else if (view === 'list' || view === 'table') setBoardLayout('table');
    if (searchParams.get('overdueOnly') === '1') {
      setFilters((prev) => ({ ...prev, overdueOnly: true }));
    }
    const status = searchParams.get('status');
    if (status) {
      setFilters((prev) => ({ ...prev, statuses: [status] }));
    }
  }, [searchParams]);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPhases, setExpandedPhases] = useState({});
  const [expandedModules, setExpandedModules] = useState({});

  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStartEdit, setDrawerStartEdit] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [statusRemark, setStatusRemark] = useState({
    open: false,
    taskId: null,
    status: '',
    taskName: '',
    initialRemark: '',
    saving: false,
  });
  const [delayAnalysis, setDelayAnalysis] = useState(null);
  const [newTask, setNewTask] = useState({
    taskName: '',
    taskId: '',
    status: 'Upcoming',
    developerId: '',
    phase: '',
    priority: '',
    module: '',
    description: '',
  });

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  useEffect(() => {
    try {
      localStorage.setItem('tt_task_board_layout', boardLayout);
    } catch {
      /* ignore */
    }
  }, [boardLayout]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(false);

      if (role === 'client') {
        const token = clientMeta?.token;
        if (!token) {
          setLoadError(true);
          return;
        }
        const sharePassword = sessionStorage.getItem(`share-password:${token}`) || undefined;
        const data = await api.getClientTasks(token, sharePassword);
        setProject(data.project);
        setTasks(data.tasks || []);
        setDevelopers([]);
        setDelayAnalysis(data.delayAnalysis || null);
        return;
      }

      if (!projectId) return;

      const [projectsData, devsData, tasksResponse, analysis] = await Promise.all([
        api.getProjects(),
        api.getDevelopers(),
        api.getProjectTasks(projectId, { limit: -1 }),
        api.getProjectDelayAnalysis(projectId).catch(() => null),
      ]);
      const curProj = projectsData.find((p) => p.id === parseInt(projectId, 10));
      setProject(curProj || { name: `Project #${projectId}` });
      setDevelopers(devsData);
      setTasks(tasksResponse.tasks);
      setDelayAnalysis(analysis);
    } catch (e) {
      console.error('Failed to load board tasks data:', e);
      setLoadError(true);
      showAlert('Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, role, clientMeta?.token]);

  const applyStatusUpdate = async (taskId, newStatus, remarks) => {
    const payload = { status: newStatus };
    if (remarks != null) payload.remarks = remarks;
    const updated = await api.updateTask(taskId, payload);
    showAlert('Task status updated successfully');
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    if (selectedTask && selectedTask.id === taskId) setSelectedTask(updated);
    return updated;
  };

  const handleStatusChange = async (taskId, newStatus, event) => {
    if (event) event.stopPropagation();
    if (!canStatus) return;

    if (needsStatusRemark(newStatus)) {
      const task = tasks.find((t) => t.id === taskId);
      setStatusRemark({
        open: true,
        taskId,
        status: newStatus,
        taskName: task?.taskName || task?.taskId || '',
        initialRemark: task?.remarks || '',
        saving: false,
      });
      return;
    }

    try {
      await applyStatusUpdate(taskId, newStatus);
    } catch (error) {
      console.error('Inline status update failed:', error);
      showAlert('Failed to update status', 'error');
    }
  };

  const handleStatusRemarkConfirm = async (remark) => {
    const { taskId, status } = statusRemark;
    if (!taskId || !status) return;
    setStatusRemark((prev) => ({ ...prev, saving: true }));
    try {
      await applyStatusUpdate(taskId, status, remark);
      setStatusRemark({
        open: false,
        taskId: null,
        status: '',
        taskName: '',
        initialRemark: '',
        saving: false,
      });
    } catch (error) {
      console.error('Status remark update failed:', error);
      showAlert('Failed to update status', 'error');
      setStatusRemark((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleStatusRemarkCancel = () => {
    if (statusRemark.saving) return;
    setStatusRemark({
      open: false,
      taskId: null,
      status: '',
      taskName: '',
      initialRemark: '',
      saving: false,
    });
  };

  const handleDeveloperChange = async (taskId, newDeveloperId, event) => {
    if (event) event.stopPropagation();
    if (!canAssign) return;
    try {
      const devId = newDeveloperId ? parseInt(newDeveloperId, 10) : null;
      const updated = await api.updateTask(taskId, { developerId: devId });
      showAlert('Task assignment updated successfully');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (selectedTask && selectedTask.id === taskId) setSelectedTask(updated);
    } catch (error) {
      console.error('Inline assignment update failed:', error);
      showAlert('Failed to update assignment', 'error');
    }
  };

  const handleRowClick = (taskItem, startEdit = false) => {
    setSelectedTask(taskItem);
    setDrawerStartEdit(Boolean(startEdit));
    setDrawerOpen(true);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTask(updatedTask);
    showAlert('Task saved successfully');
  };

  const handleDeleteTask = async (taskItem) => {
    if (!taskItem?.id) return;
    const taskNameStr = taskItem.taskName || taskItem.taskId || 'this task';
    if (!window.confirm(`Are you sure you want to delete "${taskNameStr}"?`)) return;
    try {
      await api.deleteTask(taskItem.id);
      showAlert('Task deleted successfully');
      setTasks((prev) => prev.filter((t) => t.id !== taskItem.id));
      if (selectedTask && selectedTask.id === taskItem.id) {
        setSelectedTask(null);
        setDrawerOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      showAlert('Failed to delete task', 'error');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchQuery('');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (boardLayout !== 'kanban' && filters.statuses.length > 0) {
        if (!filters.statuses.includes(normalizeLegacyStatus(task.status))) return false;
      }

      if (filters.phases.length > 0) {
        if (!filters.phases.includes(task.phase || 'Unassigned Phase')) return false;
      }

      if (filters.modules.length > 0) {
        const modKey =
          task.parentId ||
          (task.module && String(task.module).includes('-')
            ? String(task.module).split('-')[0]
            : task.module) ||
          'Unassigned';
        if (!filters.modules.includes(modKey) && !filters.modules.includes(task.module)) {
          return false;
        }
      }

      if (filters.developer !== '' && filters.developer != null) {
        const id = parseInt(filters.developer, 10);
        if (task.developerId !== id) return false;
      }

      if (filters.priority) {
        if (task.priority !== filters.priority) return false;
      }

      if (filters.overdueOnly && !isOverdue(task)) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const dev = developers.find(
          (d) => d.id === task.developerId || d.id === parseInt(task.developerId, 10)
        );
        const devName = getDeveloperDisplayName(dev).toLowerCase();
        const match =
          task.taskId?.toLowerCase().includes(query) ||
          task.taskName?.toLowerCase().includes(query) ||
          task.module?.toLowerCase().includes(query) ||
          task.phase?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          devName.includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [tasks, filters, searchQuery, boardLayout, developers]);

  const workTasks = useMemo(() => {
    const list = filteredTasks.filter((t) => t.recordType !== 'module');
    if (filters.overdueOnly) {
      return [...list].sort((a, b) => getOverdueDays(b) - getOverdueDays(a));
    }
    return list;
  }, [filteredTasks, filters.overdueOnly]);

  const delayTaskMap = useMemo(() => {
    const map = {};
    if (!delayAnalysis) return map;

    (delayAnalysis.contributingTasks || []).forEach((t, idx) => {
      map[t.id] = {
        overdueDays: t.overdueDays,
        delayImpactScore: t.delayImpactScore,
        isPrimary: idx === 0,
        isContributor: idx > 0 && idx <= 5,
        explanation: t.explanation,
      };
    });

    if (delayAnalysis.primaryDelayedWork && !map[delayAnalysis.primaryDelayedWork.id]) {
      const t = delayAnalysis.primaryDelayedWork;
      map[t.id || t.taskName] = {
        overdueDays: t.daysBehindSchedule,
        isPrimary: true,
        explanation: t.explanation,
      };
    }

    return map;
  }, [delayAnalysis]);

  const primaryDelayTaskId =
    delayAnalysis?.primaryDelayTaskId ||
    delayAnalysis?.primaryDelayDriver?.id ||
    delayAnalysis?.primaryDelayedWork?.id ||
    null;

  const pagedWorkTasks = useMemo(
    () => workTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [workTasks, page, rowsPerPage]
  );

  const phaseTree = useMemo(
    () => buildPhaseTree(pagedWorkTasks, tasks, developers, { sortByOverdue: filters.overdueOnly }),
    [pagedWorkTasks, tasks, developers, filters.overdueOnly]
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters, rowsPerPage]);

  // Expand newly visible phases/modules by default
  useEffect(() => {
    setExpandedPhases((prev) => {
      const next = { ...prev };
      phaseTree.forEach((p) => {
        if (next[p.id] === undefined) next[p.id] = true;
      });
      return next;
    });
    setExpandedModules((prev) => {
      const next = { ...prev };
      phaseTree.forEach((p) => {
        p.modules.forEach((m) => {
          if (next[m.id] === undefined) next[m.id] = true;
        });
      });
      return next;
    });
  }, [phaseTree]);

  const filterOptions = useMemo(() => {
    const overdueCount = tasks.filter(
      (t) => t.recordType !== 'module' && isOverdue(t)
    ).length;

    const phases = [
      ...new Set(tasks.map((t) => t.phase || 'Unassigned Phase').filter(Boolean)),
    ]
      .sort()
      .map((p) => ({ value: p, label: p }));

    const moduleMap = new Map();
    tasks.forEach((t) => {
      if (t.recordType === 'module' && !t.parentId) {
        moduleMap.set(t.taskId, t.taskName || t.taskId);
      } else if (t.module) {
        const key = String(t.module).includes('-')
          ? String(t.module).split('-')[0]
          : t.module;
        if (!moduleMap.has(key)) moduleMap.set(key, key);
      }
    });
    const modules = Array.from(moduleMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([value, label]) => ({
        value,
        label: label === value ? `Module ${value}` : `Module ${value} — ${label}`,
      }));

    const priorities = [
      ...new Set(tasks.map((t) => t.priority).filter(Boolean)),
    ]
      .sort()
      .map((p) => ({ value: p, label: p }));

    return {
      phases,
      modules,
      developers: developers.map((d) => ({
        value: String(d.id),
        label: getDeveloperDisplayName(d),
      })),
      priorities,
      overdueCount,
    };
  }, [tasks, developers]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.phases.length) n += 1;
    if (filters.modules.length) n += 1;
    if (filters.developer !== '' && filters.developer != null) n += 1;
    if (filters.statuses.length) n += 1;
    if (filters.priority) n += 1;
    if (filters.overdueOnly) n += 1;
    if (searchQuery.trim()) n += 1;
    return n;
  }, [filters, searchQuery]);

  const statusCounts = useMemo(() => {
    const base = tasks.filter((t) => t.recordType !== 'module');
    const counts = {};
    ALL_STATUSES.forEach((s) => {
      counts[s] = base.filter((t) => normalizeLegacyStatus(t.status) === s).length;
    });
    return counts;
  }, [tasks]);

  const toggleStatusChip = (statusVal) => {
    setFilters((prev) => {
      const cur = prev.statuses || [];
      const next = cur.includes(statusVal)
        ? cur.filter((s) => s !== statusVal)
        : [...cur, statusVal];
      return { ...prev, statuses: next };
    });
  };

  const PRIORITY_BADGES = isDark ? PRIORITY_BADGES_DARK : PRIORITY_BADGES_LIGHT;

  const resetNewTaskForm = () => {
    setNewTask({
      taskName: '',
      taskId: '',
      status: 'Upcoming',
      developerId: '',
      phase: '',
      priority: '',
      module: '',
      description: '',
    });
  };

  const handleCreateTask = async () => {
    if (!projectId || !newTask.taskName.trim()) {
      showAlert('Task name is required', 'warning');
      return;
    }
    setSavingTask(true);
    try {
      const created = await api.createTask(projectId, {
        ...newTask,
        taskName: newTask.taskName.trim(),
        taskId: newTask.taskId.trim() || undefined,
        developerId: newTask.developerId || null,
        phase: newTask.phase || null,
        priority: newTask.priority || null,
        module: newTask.module || null,
        description: newTask.description || null,
      });
      setTasks((prev) => [...prev, created]);
      setAddTaskOpen(false);
      resetNewTaskForm();
      showAlert('Task created successfully');
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to create task', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  const goCalendar = () =>
    navigate(
      isClient ? `/client/${clientMeta?.token}/calendar` : `/projects/${projectId}/calendar`
    );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          gap: 2,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          Failed to load project data. Make sure the server is running and the database is
          accessible.
        </Alert>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.5, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {isClient && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.25 },
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            background: (t) =>
              t.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1e3a5f 0%, #111827 100%)'
                : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={1.25}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                {project?.name || clientProject?.name || 'Project'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {[clientMeta?.clientName, clientMeta?.company].filter(Boolean).join(' · ') ||
                  'Client view'}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CalendarIcon />}
              onClick={goCalendar}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '10px' }}
            >
              Calendar
            </Button>
          </Stack>
        </Paper>
      )}

      <TaskBoardToolbar
        boardLayout={boardLayout}
        onBoardLayoutChange={setBoardLayout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={{
          ...filters,
          developer: filters.developer === '' ? '' : String(filters.developer),
        }}
        onFilterChange={(key, value) => {
          if (key === 'developer') {
            handleFilterChange('developer', value === '' ? '' : value);
          } else {
            handleFilterChange(key, value);
          }
        }}
        onClearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        filterOptions={filterOptions}
        onCalendar={goCalendar}
        onImportCsv={() => navigate(`/projects/upload?projectId=${projectId}`)}
        onAddTask={() => setAddTaskOpen(true)}
        isClient={isClient}
        statusCounts={statusCounts}
        onStatusChipClick={toggleStatusChip}
        activeStatusFilters={filters.statuses}
        isDark={isDark}
      />

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks in this project"
          description={
            isClient
              ? 'The shared project has no tasks yet. Check back once the admin imports or adds work items.'
              : 'Upload a CSV or add tasks to start tracking progress.'
          }
          actionText={isClient ? undefined : 'Add Task'}
          onActionClick={isClient ? undefined : () => setAddTaskOpen(true)}
          actionPermission="task.edit"
          actionIcon={<AddIcon />}
        />
      ) : filteredTasks.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '16px',
            borderStyle: 'dashed',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            No matching tasks
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>
            Try clearing filters or search to see more results.
          </Typography>
          <Button variant="outlined" onClick={clearFilters} sx={{ borderRadius: '10px' }}>
            Clear filters
          </Button>
        </Paper>
      ) : boardLayout === 'kanban' ? (
        <KanbanBoard
          tasks={filteredTasks}
          developers={developers}
          canStatus={canStatus}
          canEdit={canEdit}
          onStatusChange={(taskId, newStatus) => handleStatusChange(taskId, newStatus)}
          onOpenTask={(task) => handleRowClick(task)}
          onEditTask={canEdit ? (task) => handleRowClick(task, true) : undefined}
          onAddTask={
            canEdit
              ? (status) => {
                  setNewTask((prev) => ({
                    ...prev,
                    status: status || 'Upcoming',
                  }));
                  setAddTaskOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <HierarchicalTaskTable
          phaseTree={phaseTree}
          developers={developers}
          isDark={isDark}
          canStatus={canStatus}
          canAssign={canAssign}
          canEdit={canEdit}
          isClient={isClient}
          priorityBadges={PRIORITY_BADGES}
          expandedPhases={expandedPhases}
          expandedModules={expandedModules}
          onTogglePhase={(id) =>
            setExpandedPhases((prev) => ({ ...prev, [id]: !(prev[id] !== false) }))
          }
          onToggleModule={(id) =>
            setExpandedModules((prev) => ({ ...prev, [id]: !(prev[id] !== false) }))
          }
          onRowClick={handleRowClick}
          onDeleteTask={handleDeleteTask}
          onStatusChange={handleStatusChange}
          onDeveloperChange={handleDeveloperChange}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          totalCount={workTasks.length}
          primaryDelayTaskId={primaryDelayTaskId}
          delayTaskMap={delayTaskMap}
        />
      )}

      {/* Status remark for Blocked / On Hold */}
      <StatusRemarkDialog
        open={statusRemark.open}
        status={statusRemark.status}
        taskName={statusRemark.taskName}
        initialRemark={statusRemark.initialRemark}
        saving={statusRemark.saving}
        onCancel={handleStatusRemarkCancel}
        onConfirm={handleStatusRemarkConfirm}
      />

      {/* Add Task Dialog */}
      <Dialog
        open={addTaskOpen}
        onClose={() => {
          if (!savingTask) {
            setAddTaskOpen(false);
            resetNewTaskForm();
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Add Task</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Create one task for this project. You can edit more details after saving.
          </Typography>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Task name"
              required
              fullWidth
              value={newTask.taskName}
              onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
              autoFocus
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Task ID"
                fullWidth
                value={newTask.taskId}
                onChange={(e) => setNewTask({ ...newTask, taskId: e.target.value })}
                placeholder="Auto if empty"
                helperText="Optional"
              />
              <TextField
                select
                label="Status"
                fullWidth
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
              >
                {ALL_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Developer"
                fullWidth
                value={newTask.developerId}
                onChange={(e) => setNewTask({ ...newTask, developerId: e.target.value })}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {developers.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {getDeveloperDisplayName(d)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Phase"
                fullWidth
                value={newTask.phase}
                onChange={(e) => setNewTask({ ...newTask, phase: e.target.value })}
              />
              <TextField
                label="Module"
                fullWidth
                value={newTask.module}
                onChange={(e) => setNewTask({ ...newTask, module: e.target.value })}
              />
              <TextField
                label="Priority"
                fullWidth
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                placeholder="P0 / P1 / P2"
              />
            </Stack>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            disabled={savingTask}
            onClick={() => {
              setAddTaskOpen(false);
              resetNewTaskForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingTask || !newTask.taskName.trim()}
            onClick={handleCreateTask}
            startIcon={<AddIcon />}
          >
            {savingTask ? 'Saving…' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>

      <TaskDetailsDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerStartEdit(false);
        }}
        task={selectedTask}
        developers={developers}
        onTaskUpdated={handleTaskUpdated}
        startInEditMode={drawerStartEdit}
      />

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
