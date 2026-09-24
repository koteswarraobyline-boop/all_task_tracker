import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  useTheme,
  Skeleton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CalendarTodayOutlined as CalendarIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import api from '../services/api';
import TaskDetailsDrawer, { splitTitleAndDescription } from '../components/TaskDetailsDrawer';
import KanbanBoard from '../components/KanbanBoard';
import {
  TaskBoardToolbar,
  TaskBoardSummary,
  HierarchicalTaskTable,
  ALL_STATUSES,
  STATUS_LABELS,
  PRIORITY_BADGES_LIGHT,
  PRIORITY_BADGES_DARK,
  normalizeLegacyStatus,
} from '../components/TaskBoard';
import { useProjectId } from '../hooks/useProjectId';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../context/RoleContext';
import EmptyState from '../components/EmptyState';
import EditModuleDialog from '../components/TaskBoard/EditModuleDialog';
import StatusRemarkDialog, { needsStatusRemark } from '../components/StatusRemarkDialog';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { getTaskProgressPercent } from '../utils/taskProgress';
import { isOverdue, getOverdueDays, computeTaskStats } from '../utils/taskManagementConstants';
import { comparePhaseNames } from '../utils/phaseSort';
import { tokens } from '../theme';

const EMPTY_FILTERS = {
  phases: [],
  modules: [],
  developer: '',
  statuses: [],
  priority: '',
  overdueOnly: false,
};

function getModuleKey(task, modulesById = {}) {
  if (task.parentId && modulesById[task.parentId]) return task.parentId;
  if (task.module && String(task.module).includes('-')) return String(task.module).split('-')[0];
  if (task.module && modulesById[task.module]) return task.module;
  if (task.module) return task.module;
  return 'Unassigned';
}

function compareWorkTasksByPhase(a, b, modulesById = {}) {
  const phaseCmp = comparePhaseNames(a.phase || 'Unassigned Phase', b.phase || 'Unassigned Phase');
  if (phaseCmp) return phaseCmp;
  const moduleCmp = String(getModuleKey(a, modulesById)).localeCompare(
    String(getModuleKey(b, modulesById)),
    undefined,
    { numeric: true, sensitivity: 'base' }
  );
  if (moduleCmp) return moduleCmp;
  return String(a.taskId || '').localeCompare(String(b.taskId || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function buildModulesById(allTasks) {
  const modulesById = {};
  allTasks.forEach((t) => {
    if (t.recordType === 'module') modulesById[t.taskId] = t;
  });
  return modulesById;
}

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
            phaseName: phase.name,
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
        return maxB - maxA || comparePhaseNames(a.name, b.name);
      }
      return comparePhaseNames(a.name, b.name);
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
  const canDeletePerm = usePermission('task.delete');
  // Clients are view-only — never allow edit/status/assign UI
  const canStatus = !isClient && canStatusPerm;
  const canAssign = !isClient && canAssignPerm;
  const canEdit = !isClient && canEditPerm;
  const canDelete = !isClient && canDeletePerm;

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeKpi, setActiveKpi] = useState(null);
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
  const [deleteModuleDialog, setDeleteModuleDialog] = useState({
    open: false,
    mod: null,
    deleting: false,
  });
  const [editModuleDialog, setEditModuleDialog] = useState({
    open: false,
    mod: null,
    saving: false,
  });
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
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

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
      showAlert('Unable to load tasks.', 'error');
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
    showAlert('Task updated successfully.');
  };

  const handleDeleteTask = async (taskItem, { skipConfirm = false } = {}) => {
    if (!taskItem?.id || !canDelete) return;
    const taskNameStr = taskItem.taskName || taskItem.taskId || 'this task';
    if (!skipConfirm && !window.confirm(`Are you sure you want to delete "${taskNameStr}"?`)) return;
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
      throw err;
    }
  };

  const handleDeleteModuleRequest = (mod) => {
    if (!canDelete || !mod || !(mod.tasks?.length > 0)) return;
    setDeleteModuleDialog({ open: true, mod, deleting: false });
  };

  const handleDeleteModuleConfirm = async () => {
    const { mod } = deleteModuleDialog;
    if (!mod || !projectId) return;
    setDeleteModuleDialog((prev) => ({ ...prev, deleting: true }));
    try {
      let result;
      if (mod.moduleId === 'Unassigned') {
        await Promise.all((mod.tasks || []).map((t) => api.deleteTask(t.id)));
        result = { deletedTasks: mod.tasks?.length ?? 0 };
        setTasks((prev) => prev.filter((t) => !(mod.tasks || []).some((mt) => mt.id === t.id)));
      } else {
        result = await api.deleteModule(projectId, mod.moduleId);
        const tasksResponse = await api.getProjectTasks(projectId, { limit: -1 });
        setTasks(tasksResponse.tasks);
      }
      const removedIds = new Set((mod.tasks || []).map((t) => t.id));
      if (selectedTask && removedIds.has(selectedTask.id)) {
        setSelectedTask(null);
        setDrawerOpen(false);
      }
      const count = result.deletedTasks ?? mod.taskCount ?? 0;
      const label =
        mod.moduleId === 'Unassigned'
          ? `Standalone tasks deleted (${count} removed).`
          : `Module deleted (${count} task${count === 1 ? '' : 's'} removed).`;
      showAlert(label);
      setDeleteModuleDialog({ open: false, mod: null, deleting: false });
    } catch (err) {
      console.error('Failed to delete module:', err);
      showAlert(err.response?.data?.error || 'Failed to delete module', 'error');
      setDeleteModuleDialog((prev) => ({ ...prev, deleting: false }));
    }
  };

  const handleEditModuleRequest = (mod) => {
    if (!canEdit || !mod) return;
    setEditModuleDialog({ open: true, mod, saving: false });
  };

  const handleEditModuleSave = async (form) => {
    const { mod } = editModuleDialog;
    if (!mod || !projectId) return;
    setEditModuleDialog((prev) => ({ ...prev, saving: true }));
    try {
      const phase = form.phase.trim() || null;

      if (mod.parentTask) {
        await api.updateTask(mod.parentTask.id, {
          taskName: form.name.trim(),
          phase,
          description: form.description.trim() || null,
          status: form.status,
        });
        if (phase !== (mod.parentTask.phase || null)) {
          await Promise.all(
            (mod.tasks || []).map((t) => api.updateTask(t.id, { phase }))
          );
        }
      } else if (mod.moduleId === 'Unassigned') {
        const moduleName = form.name.trim();
        if (moduleName) {
          const moduleId =
            form.moduleId.trim() ||
            `M-${Date.now().toString(36).toUpperCase()}`;
          await api.createTask(projectId, {
            taskName: moduleName,
            taskId: moduleId,
            recordType: 'module',
            module: moduleId,
            phase,
            description: form.description.trim() || null,
            status: form.status || 'Upcoming',
          });
          await Promise.all(
            (mod.tasks || []).map((t) =>
              api.updateTask(t.id, {
                parentId: moduleId,
                module: moduleId,
                phase,
              })
            )
          );
        } else {
          await Promise.all(
            (mod.tasks || []).map((t) => api.updateTask(t.id, { phase }))
          );
        }
      } else {
        const moduleKey = form.moduleId.trim() || mod.moduleId;
        const moduleName = form.name.trim() || mod.name || moduleKey;
        const hasModuleRecord = tasks.some(
          (t) => t.recordType === 'module' && t.taskId === mod.moduleId
        );
        if (!hasModuleRecord && moduleName) {
          await api.createTask(projectId, {
            taskName: moduleName,
            taskId: moduleKey,
            recordType: 'module',
            module: moduleKey,
            phase,
          });
        }
        await Promise.all(
          (mod.tasks || []).map((t) =>
            api.updateTask(t.id, {
              module: moduleKey,
              parentId: hasModuleRecord || moduleName ? moduleKey : t.parentId,
              phase,
            })
          )
        );
      }

      const tasksResponse = await api.getProjectTasks(projectId, { limit: -1 });
      setTasks(tasksResponse.tasks);
      showAlert('Module updated successfully.');
      setEditModuleDialog({ open: false, mod: null, saving: false });
    } catch (err) {
      console.error('Failed to update module:', err);
      showAlert(err.response?.data?.error || 'Failed to update module', 'error');
      setEditModuleDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleDuplicateTask = async (taskItem) => {
    if (!projectId || !taskItem) return;
    try {
      const { title, description } = splitTitleAndDescription(taskItem.taskName, taskItem.description);
      const created = await api.createTask(projectId, {
        taskName: `${title || taskItem.taskName} (copy)`,
        status: 'Upcoming',
        phase: taskItem.phase || null,
        module: taskItem.module || null,
        priority: taskItem.priority || null,
        description: description || taskItem.description || null,
        tags: taskItem.tags || null,
        dependencies: taskItem.dependencies || null,
        estimatedHours: taskItem.estimatedHours ?? null,
      });
      setTasks((prev) => [...prev, created]);
      setSelectedTask(created);
      setDrawerOpen(true);
      setDrawerStartEdit(false);
      showAlert('Task duplicated successfully');
    } catch (err) {
      console.error('Failed to duplicate task:', err);
      showAlert('Failed to duplicate task', 'error');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'phases') {
        const modulesById = buildModulesById(tasks);
        const allowed = new Set();
        tasks.forEach((t) => {
          if (t.recordType === 'module') return;
          const phase = t.phase || 'Unassigned Phase';
          if (value.length && !value.includes(phase)) return;
          allowed.add(getModuleKey(t, modulesById));
        });
        next.modules = prev.modules.filter((m) => allowed.has(m));
      }
      return next;
    });
    if (key === 'overdueOnly') setActiveKpi(value ? 'overdue' : null);
    if (key === 'statuses') setActiveKpi(null);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchQuery('');
    setDebouncedSearch('');
    setActiveKpi(null);
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
        const modulesById = buildModulesById(tasks);
        const modKey = getModuleKey(task, modulesById);
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

      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
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
  }, [tasks, filters, debouncedSearch, boardLayout, developers]);

  const workTasks = useMemo(() => {
    const list = filteredTasks.filter((t) => t.recordType !== 'module');
    const modulesById = buildModulesById(tasks);
    if (filters.overdueOnly) {
      return [...list].sort((a, b) => {
        const overdue = getOverdueDays(b) - getOverdueDays(a);
        if (overdue) return overdue;
        return compareWorkTasksByPhase(a, b, modulesById);
      });
    }
    return [...list].sort((a, b) => compareWorkTasksByPhase(a, b, modulesById));
  }, [filteredTasks, filters.overdueOnly, tasks]);

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

  const kpiStats = useMemo(() => computeTaskStats(tasks), [tasks]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filters, rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(workTasks.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [workTasks.length, rowsPerPage, page]);

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
    const modulesById = buildModulesById(tasks);
    const overdueCount = tasks.filter((t) => t.recordType !== 'module' && isOverdue(t)).length;

    const phases = [
      ...new Set(tasks.map((t) => t.phase || 'Unassigned Phase').filter(Boolean)),
    ]
      .sort(comparePhaseNames)
      .map((p) => ({ value: p, label: p }));

    const moduleMap = new Map();
    tasks.forEach((t) => {
      if (t.recordType === 'module') return;
      const phase = t.phase || 'Unassigned Phase';
      if (filters.phases.length > 0 && !filters.phases.includes(phase)) return;
      const key = getModuleKey(t, modulesById);
      const modRecord = modulesById[key];
      const label = modRecord?.taskName || (key === 'Unassigned' ? 'Standalone tasks' : key);
      if (!moduleMap.has(key)) {
        moduleMap.set(key, label === key ? `Module ${key}` : `Module ${key} — ${label}`);
      }
    });
    tasks.forEach((t) => {
      if (t.recordType === 'module' && !t.parentId) {
        const phase = t.phase || 'Unassigned Phase';
        if (filters.phases.length > 0 && !filters.phases.includes(phase)) return;
        if (!moduleMap.has(t.taskId)) moduleMap.set(t.taskId, t.taskName || t.taskId);
      }
    });
    const modules = Array.from(moduleMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([value, label]) => ({ value, label }));

    const priorities = [...new Set(tasks.map((t) => t.priority).filter(Boolean))]
      .sort()
      .map((p) => ({ value: p, label: p }));

    // Only show developers who are actually assigned to tasks in this project
    const assignedDevIds = new Set(
      tasks.filter((t) => t.recordType !== 'module' && t.developerId != null).map((t) => t.developerId)
    );
    const projectDevelopers = developers
      .filter((d) => assignedDevIds.has(d.id))
      .map((d) => ({ value: String(d.id), label: getDeveloperDisplayName(d) }));

    return {
      phases,
      modules,
      developers: projectDevelopers,
      priorities,
      overdueCount,
    };
  }, [tasks, developers, filters.phases]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.phases.length) n += 1;
    if (filters.modules.length) n += 1;
    if (filters.developer !== '' && filters.developer != null) n += 1;
    if (filters.statuses.length) n += 1;
    if (filters.overdueOnly) n += 1;
    if (debouncedSearch.trim()) n += 1;
    return n;
  }, [filters, debouncedSearch]);

  const handleKpiClick = useCallback((key) => {
    setActiveKpi(key);
    if (key === 'total') {
      setFilters(EMPTY_FILTERS);
      setSearchQuery('');
      setDebouncedSearch('');
      return;
    }
    if (key === 'completed') {
      setFilters((prev) => ({ ...prev, statuses: ['Completed'], overdueOnly: false }));
      return;
    }
    if (key === 'inProgress') {
      setFilters((prev) => ({
        ...prev,
        statuses: ['In Development', 'Testing', 'Assigned'],
        overdueOnly: false,
      }));
      return;
    }
    if (key === 'overdue') {
      setFilters((prev) => ({ ...prev, overdueOnly: true, statuses: [] }));
    }
  }, []);

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
          px: 2,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          Unable to load tasks.
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
        px: { xs: 1.5, sm: 2, md: 2 },
        py: { xs: 1.5, md: 2 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        width: '100%',
        maxWidth: '100%',
        mx: 0,
        boxSizing: 'border-box',
      }}
    >
      {isClient && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.25 },
            borderRadius: `${tokens.radius.card}px`,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={1.25}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 650, letterSpacing: '-0.02em' }}>
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
        projectName={project?.name}
        projectDeliveryStatus={project?.deliveryStatus}
        breadcrumbProjectId={projectId}
        summarySlot={
          !loading && !isClient && tasks.some((t) => t.recordType !== 'module') ? (
            <TaskBoardSummary stats={kpiStats} activeKpi={activeKpi} onKpiClick={handleKpiClick} />
          ) : loading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rounded" height={96} sx={{ borderRadius: 3 }} />
              ))}
            </Box>
          ) : null
        }
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
      />

      {!loading && tasks.length === 0 ? (
        <EmptyState
          title="No tasks in this project yet."
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
      ) : !loading && filteredTasks.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: '16px', borderStyle: 'dashed' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {filters.overdueOnly ? 'No overdue tasks' : 'No tasks match your current filters.'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>
            {filters.overdueOnly
              ? 'Great! Everything is currently on schedule.'
              : 'Try clearing filters or search to see more results.'}
          </Typography>
          <Button variant="outlined" onClick={clearFilters} sx={{ borderRadius: '10px' }}>
            Clear Filters
          </Button>
        </Paper>
      ) : boardLayout === 'kanban' && !loading ? (
        <KanbanBoard
          tasks={filteredTasks}
          developers={developers}
          canStatus={canStatus}
          canEdit={canEdit}
          canDelete={canDelete}
          onStatusChange={(taskId, newStatus) => handleStatusChange(taskId, newStatus)}
          onOpenTask={(task) => handleRowClick(task)}
          onEditTask={canEdit ? (task) => handleRowClick(task, true) : undefined}
          onDeleteTask={canDelete ? (task) => handleDeleteTask(task) : undefined}
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
          canDelete={canDelete}
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
          onDeleteTask={canDelete ? handleDeleteTask : undefined}
          onDeleteModule={canDelete ? handleDeleteModuleRequest : undefined}
          onEditModule={canEdit ? handleEditModuleRequest : undefined}
          onStatusChange={handleStatusChange}
          onDeveloperChange={handleDeveloperChange}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          totalCount={workTasks.length}
          loading={loading}
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
                    {STATUS_LABELS[s] || s}
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

      <Dialog
        open={deleteModuleDialog.open}
        onClose={() => {
          if (!deleteModuleDialog.deleting) {
            setDeleteModuleDialog({ open: false, mod: null, deleting: false });
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {deleteModuleDialog.mod?.moduleId === 'Unassigned'
            ? 'Delete Standalone Tasks?'
            : 'Delete Module?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {deleteModuleDialog.mod?.moduleId === 'Unassigned' ? (
              <>
                This will permanently delete all{' '}
                <strong>
                  {deleteModuleDialog.mod?.taskCount ?? 0} standalone task
                  {(deleteModuleDialog.mod?.taskCount ?? 0) === 1 ? '' : 's'}
                </strong>{' '}
                in <strong>{deleteModuleDialog.mod?.phaseName || 'this phase'}</strong>. This cannot
                be undone.
              </>
            ) : (
              <>
                This will permanently delete{' '}
                <strong>
                  {deleteModuleDialog.mod?.name || deleteModuleDialog.mod?.moduleId || 'this module'}
                </strong>{' '}
                and all{' '}
                <strong>
                  {deleteModuleDialog.mod?.taskCount ?? 0} task
                  {(deleteModuleDialog.mod?.taskCount ?? 0) === 1 ? '' : 's'}
                </strong>{' '}
                inside it, including nested modules. This cannot be undone.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteModuleDialog({ open: false, mod: null, deleting: false })}
            disabled={deleteModuleDialog.deleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteModuleDialog.deleting}
            onClick={handleDeleteModuleConfirm}
          >
            {deleteModuleDialog.deleting ? 'Deleting…' : deleteModuleDialog.mod?.moduleId === 'Unassigned' ? 'Delete Tasks' : 'Delete Module'}
          </Button>
        </DialogActions>
      </Dialog>

      <EditModuleDialog
        open={editModuleDialog.open}
        mod={editModuleDialog.mod}
        saving={editModuleDialog.saving}
        onClose={() => {
          if (!editModuleDialog.saving) {
            setEditModuleDialog({ open: false, mod: null, saving: false });
          }
        }}
        onSave={handleEditModuleSave}
      />

      <TaskDetailsDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerStartEdit(false);
        }}
        task={selectedTask}
        project={project}
        allTasks={tasks}
        developers={developers}
        onTaskUpdated={handleTaskUpdated}
        onOpenTask={(t) => setSelectedTask(t)}
        onDeleteTask={canDelete ? (t) => handleDeleteTask(t, { skipConfirm: true }) : undefined}
        onDuplicateTask={canEdit ? handleDuplicateTask : undefined}
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
