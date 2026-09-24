import React, { useMemo, useState, useCallback, useEffect, memo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  InputAdornment,
  Collapse,
  Tooltip,
  Pagination,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowRight as CollapseIcon,
  FilterList as FilterIcon,
  ViewAgenda as FlatIcon,
  AccountTree as GroupIcon,
} from '@mui/icons-material';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import KanbanTaskCard, { KanbanAssigneeStack } from './KanbanTaskCard';
import { getDeveloperDisplayName } from '../utils/developerDisplay';
import { tokens } from '../theme';

const FILTERS_KEY = 'tt_kanban_filters';
const COLUMN_PAGE_SIZE = 10;

export const KANBAN_COLUMNS = [
  {
    id: 'backlog',
    title: 'Backlog',
    statuses: ['Upcoming', 'On Hold'],
    primaryStatus: 'Upcoming',
    accent: '#64748B',
    tint: '#F8FAFC',
    headerTint: '#E2E8F0',
  },
  {
    id: 'todo',
    title: 'To Do',
    statuses: ['Assigned'],
    primaryStatus: 'Assigned',
    accent: '#2563EB',
    tint: '#F8FBFF',
    headerTint: '#EFF6FF',
  },
  {
    id: 'progress',
    title: 'In Progress',
    statuses: ['In Development', 'Blocked'],
    primaryStatus: 'In Development',
    accent: '#2563EB',
    tint: '#F8FBFF',
    headerTint: '#EFF6FF',
  },
  {
    id: 'testing',
    title: 'Testing',
    statuses: ['Testing', 'Code Review'],
    primaryStatus: 'Testing',
    accent: '#2563EB',
    tint: '#F8FBFF',
    headerTint: '#EFF6FF',
  },
  {
    id: 'completed',
    title: 'Completed',
    statuses: ['Completed'],
    primaryStatus: 'Completed',
    accent: '#15803D',
    tint: '#F8FAFC',
    headerTint: '#ECFDF5',
  },
];

const MODULE_COLORS = [
  '#2563EB',
  '#1E40AF',
  '#1E293B',
  '#64748B',
  '#15803D',
  '#0F766E',
  '#1D4ED8',
  '#475569',
];

function columnForStatus(status) {
  return KANBAN_COLUMNS.find((c) => c.statuses.includes(status)) || KANBAN_COLUMNS[0];
}

function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveFilters(state) {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const KanbanColumn = memo(function KanbanColumn({
  column,
  tasks,
  canStatus,
  canEdit,
  canDelete,
  isOver,
  collapsedModules,
  onToggleModule,
  onOpen,
  onEdit,
  onDelete,
  onAddTask,
  groupByModule,
}) {
  const { setNodeRef, isOver: droppableOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });
  const highlighted = isOver || droppableOver;
  const [columnPage, setColumnPage] = useState(1);

  useEffect(() => {
    setColumnPage(1);
  }, [tasks.length, groupByModule]);

  const pageCount = Math.max(1, Math.ceil(tasks.length / COLUMN_PAGE_SIZE));
  const pagedTasks = useMemo(() => {
    const start = (columnPage - 1) * COLUMN_PAGE_SIZE;
    return tasks.slice(start, start + COLUMN_PAGE_SIZE);
  }, [tasks, columnPage]);

  const pagedGroups = useMemo(() => {
    if (!groupByModule) {
      return [{ key: '__all__', label: null, color: column.accent, tasks: pagedTasks }];
    }
    const map = {};
    pagedTasks.forEach((t) => {
      const key = t.module || 'General';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, list], idx) => ({
        key: `${column.id}:${label}`,
        label,
        color: MODULE_COLORS[idx % MODULE_COLORS.length],
        tasks: list,
      }));
  }, [pagedTasks, groupByModule, column]);

  const assignees = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (t.developer?.id) {
        map[t.developer.id] = {
          id: t.developer.id,
          name: getDeveloperDisplayName(t.developer),
          color: t.developer.color,
        };
      }
    });
    return Object.values(map);
  }, [tasks]);

  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      component="section"
      aria-label={`${column.title} column, ${tasks.length} tasks`}
      sx={{
        flex: {
          xs: '0 0 min(84vw, 300px)',
          sm: '0 0 min(42vw, 300px)',
          md: '0 0 calc((100% - 64px) / 3)',
          lg: '1 1 0',
        },
        width: { xs: 'min(84vw, 300px)', sm: 'min(42vw, 300px)', md: 'auto' },
        minWidth: { xs: 'min(84vw, 300px)', md: 260, lg: 0 },
        maxWidth: { lg: 'none' },
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'min(70vh, 640px)', md: 'calc(100vh - 300px)', lg: 'calc(100vh - 280px)' },
        minHeight: 420,
        borderRadius: `${tokens.radius.card}px`,
        border: '1px solid',
        borderColor: highlighted ? column.accent : '#E2E8F0',
        bgcolor: column.tint,
        boxShadow: highlighted
          ? `0 0 0 2px ${column.accent}55, 0 12px 28px rgba(15,23,42,0.08)`
          : '0 1px 3px rgba(15,23,42,0.05)',
        transition: 'box-shadow 160ms ease, border-color 160ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Sticky header */}
      <Box
        sx={{
          flexShrink: 0,
          zIndex: 2,
          px: 2,
          py: 1.5,
          minHeight: 56,
          bgcolor: column.headerTint,
          borderBottom: '1px solid',
          borderColor: 'rgba(15,23,42,0.08)',
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1
          }}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 1,
              minWidth: 0,
              flex: 1
            }}>
            <Box
              aria-hidden
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: column.accent,
                flexShrink: 0,
              }}
            />
            <Typography
              component="h2"
              sx={{
                fontWeight: 650,
                fontSize: '0.875rem',
                letterSpacing: '-0.01em',
                color: '#0F172A',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {column.title}
            </Typography>
            <Chip
              size="small"
              label={tasks.length}
              aria-label={`${tasks.length} tasks`}
              sx={{
                height: 22,
                minWidth: 28,
                fontWeight: 800,
                fontSize: '0.7rem',
                bgcolor: '#FFFFFF',
                color: column.accent,
                border: `1px solid ${column.accent}44`,
                flexShrink: 0,
              }}
            />
          </Stack>
          {canEdit ? (
            <Tooltip title={`Add task to ${column.title}`}>
              <IconButton
                size="small"
                aria-label={`Add task to ${column.title}`}
                onClick={() => onAddTask?.(column.primaryStatus)}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'rgba(255,255,255,0.7)',
                  '&:hover': { bgcolor: '#fff' },
                  '&:focus-visible': { outline: `2px solid ${column.accent}`, outlineOffset: 1 },
                }}
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
        {assignees.length > 0 ? (
          <Box sx={{ mt: 1 }}>
            <KanbanAssigneeStack developers={assignees} />
          </Box>
        ) : null}
      </Box>
      {/* Scrollable cards */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 1.5,
          py: 1.5,
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'transparent',
            borderRadius: 99,
          },
          '&:hover::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1' },
        }}
      >
        <SortableContext items={pagedTasks.map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <Box
              sx={{
                py: 5,
                px: 2,
                textAlign: 'center',
                border: '1.5px dashed',
                borderColor: highlighted ? column.accent : '#CBD5E1',
                borderRadius: 2,
                bgcolor: highlighted ? `${column.accent}14` : 'rgba(255,255,255,0.5)',
                minHeight: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 650 }}>
                {highlighted ? 'Drop here' : 'No tasks'}
              </Typography>
            </Box>
          ) : (
            pagedGroups.map((group) => {
              const collapsed = group.label ? collapsedModules[group.key] : false;
              return (
                <Box key={group.key} sx={{ mb: group.label ? 1.5 : 0 }}>
                  {group.label ? (
                    <Stack
                      direction="row"
                      role="button"
                      tabIndex={0}
                      aria-expanded={!collapsed}
                      aria-label={`${group.label} module, ${group.tasks.length} tasks`}
                      onClick={() => onToggleModule(group.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggleModule(group.key);
                        }
                      }}
                      sx={{
                        alignItems: "center",
                        gap: 0.75,
                        mb: 1,
                        px: 1,
                        py: 0.75,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        bgcolor: `${group.color}14`,
                        borderLeft: `3px solid ${group.color}`,
                        outline: 'none',
                        '&:hover': { bgcolor: `${group.color}22` },
                        '&:focus-visible': { outline: `2px solid ${group.color}`, outlineOffset: 1 }
                      }}>
                      {collapsed ? (
                        <CollapseIcon sx={{ fontSize: 16, color: group.color }} aria-hidden />
                      ) : (
                        <ExpandIcon sx={{ fontSize: 16, color: group.color }} aria-hidden />
                      )}
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: group.color,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {group.label}
                      </Typography>
                      <Chip
                        size="small"
                        label={group.tasks.length}
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          bgcolor: '#fff',
                          color: '#334155',
                        }}
                      />
                    </Stack>
                  ) : null}
                  <Collapse in={!collapsed} unmountOnExit={false}>
                    {group.tasks.map((task) => (
                      <KanbanTaskCard
                        key={task.id}
                        task={task}
                        columnAccent={column.accent}
                        canStatus={canStatus}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onOpen={onOpen}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </Collapse>
                </Box>
              );
            })
          )}
        </SortableContext>
        {tasks.length > COLUMN_PAGE_SIZE ? (
          <Stack
            sx={{
              alignItems: "center",
              pt: 1,
              pb: 0.5
            }}>
            <Pagination
              count={pageCount}
              page={columnPage}
              onChange={(_e, v) => setColumnPage(v)}
              size="small"
              color="primary"
              siblingCount={0}
              boundaryCount={1}
              aria-label={`${column.title} pagination`}
            />
            <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', mt: 0.5, fontWeight: 650 }}>
              {(columnPage - 1) * COLUMN_PAGE_SIZE + 1}–
              {Math.min(columnPage * COLUMN_PAGE_SIZE, tasks.length)} of {tasks.length}
            </Typography>
          </Stack>
        ) : null}
      </Box>
      {/* Fixed footer Add Task */}
      <Box
        sx={{
          flexShrink: 0,
          px: 1.5,
          py: 1.25,
          borderTop: '1px solid',
          borderColor: 'rgba(15,23,42,0.08)',
          bgcolor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {canEdit ? (
          <Button
            fullWidth
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => onAddTask?.(column.primaryStatus)}
            aria-label={`Add task to ${column.title}`}
            sx={{
              justifyContent: 'flex-start',
              fontWeight: 700,
              color: '#64748B',
              minHeight: 36,
              borderRadius: 2,
              '&:hover': { bgcolor: '#fff', color: column.accent },
              '&:focus-visible': { outline: `2px solid ${column.accent}`, outlineOffset: 1 },
            }}
          >
            Add Task
          </Button>
        ) : (
          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', py: 0.5 }}>
            {tasks.length} task{tasks.length === 1 ? '' : 's'}
          </Typography>
        )}
      </Box>
    </Paper>
  );
});

export default function KanbanBoard({
  tasks = [],
  developers = [],
  canStatus,
  canEdit,
  canDelete = false,
  loading = false,
  error = null,
  onStatusChange,
  onOpenTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onRetry,
}) {
  const saved = loadFilters();
  const [activeId, setActiveId] = useState(null);
  const [overColumnId, setOverColumnId] = useState(null);
  const [collapsedModules, setCollapsedModules] = useState({});
  const [groupByModule, setGroupByModule] = useState(saved?.groupByModule ?? true);
  const [moduleFilter, setModuleFilter] = useState(saved?.moduleFilter ?? 'all');
  const [assigneeFilter, setAssigneeFilter] = useState(saved?.assigneeFilter ?? 'all');
  const [priorityFilter, setPriorityFilter] = useState(saved?.priorityFilter ?? 'all');
  const [localSearch, setLocalSearch] = useState(saved?.localSearch ?? '');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    saveFilters({ groupByModule, moduleFilter, assigneeFilter, priorityFilter, localSearch });
  }, [groupByModule, moduleFilter, assigneeFilter, priorityFilter, localSearch]);

  const workTasks = useMemo(
    () => (tasks || []).filter((t) => t.recordType !== 'module'),
    [tasks]
  );

  const modules = useMemo(
    () =>
      [...new Set(workTasks.map((t) => t.module).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [workTasks]
  );

  const priorities = useMemo(
    () =>
      [...new Set(workTasks.map((t) => t.priority).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [workTasks]
  );

  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    return workTasks.filter((t) => {
      if (moduleFilter !== 'all' && (t.module || '') !== moduleFilter) return false;
      if (assigneeFilter === 'unassigned' && t.developerId) return false;
      if (
        assigneeFilter !== 'all' &&
        assigneeFilter !== 'unassigned' &&
        String(t.developerId) !== String(assigneeFilter)
      ) {
        return false;
      }
      if (
        priorityFilter !== 'all' &&
        String(t.priority || '').toLowerCase() !== priorityFilter.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        const hay = [t.taskName, t.taskId, t.module, t.feature, t.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [workTasks, moduleFilter, assigneeFilter, priorityFilter, localSearch]);

  const tasksByColumn = useMemo(() => {
    const map = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, []]));
    filtered.forEach((t) => {
      map[columnForStatus(t.status).id].push(t);
    });
    return map;
  }, [filtered]);

  const taskMap = useMemo(() => {
    const m = {};
    filtered.forEach((t) => {
      m[String(t.id)] = t;
    });
    return m;
  }, [filtered]);

  const activeTask = activeId ? taskMap[String(activeId)] : null;

  const resetKanbanFilters = () => {
    setModuleFilter('all');
    setAssigneeFilter('all');
    setPriorityFilter('all');
    setLocalSearch('');
  };

  const hasExtraFilters =
    moduleFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    priorityFilter !== 'all' ||
    Boolean(localSearch.trim());

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragOver = (event) => {
    const overId = event.over?.id;
    if (!overId) {
      setOverColumnId(null);
      return;
    }
    const asCol = KANBAN_COLUMNS.find((c) => c.id === overId);
    if (asCol) {
      setOverColumnId(asCol.id);
      return;
    }
    const overTask = taskMap[String(overId)];
    if (overTask) setOverColumnId(columnForStatus(overTask.status).id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);
    if (!over || !canStatus) return;

    const task = taskMap[String(active.id)];
    if (!task) return;

    let targetColumn = KANBAN_COLUMNS.find((c) => c.id === over.id);
    if (!targetColumn) {
      const overTask = taskMap[String(over.id)];
      if (overTask) targetColumn = columnForStatus(overTask.status);
    }
    if (!targetColumn) return;
    if (targetColumn.statuses.includes(task.status)) return;
    await onStatusChange?.(task.id, targetColumn.primaryStatus);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverColumnId(null);
  };

  const toggleModule = useCallback((key) => {
    setCollapsedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const filterSx = {
    minWidth: { xs: '100%', sm: 148 },
    flex: { xs: '1 1 100%', sm: '0 0 auto' },
    '& .MuiOutlinedInput-root': {
      height: 40,
      bgcolor: '#fff',
      borderRadius: 2,
      fontSize: '0.8125rem',
      fontWeight: 600,
    },
    '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }} aria-busy aria-label="Loading board">
        {KANBAN_COLUMNS.map((c) => (
          <Skeleton
            key={c.id}
            variant="rounded"
            sx={{ flex: '0 0 280px', height: 480, borderRadius: `${tokens.radius.card}px` }}
          />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Paper
        elevation={0}
        role="alert"
        sx={{
          p: 5,
          textAlign: 'center',
          borderRadius: `${tokens.radius.card}px`,
          border: '1px solid',
          borderColor: 'error.light',
          bgcolor: '#FEF2F2',
        }}
      >
        <Typography sx={{ fontWeight: 750, mb: 1, color: 'error.dark' }}>Couldn’t load the board</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.875rem' }}>{String(error)}</Typography>
        {onRetry ? (
          <Button variant="contained" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }} role="region" aria-label="Kanban task board">
      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          mb: 2,
          p: { xs: 1.5, md: 2 },
          borderRadius: `${tokens.radius.card}px`,
          border: '1px solid #E2E8F0',
          bgcolor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          useFlexGap
          sx={{
            gap: 1.5,
            alignItems: { xs: 'stretch', md: 'center' },
            flexWrap: "wrap"
          }}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 1,
              flexShrink: 0
            }}>
            <FilterIcon sx={{ fontSize: 18, color: '#64748B' }} aria-hidden />
            <Typography sx={{ fontWeight: 800, fontSize: '0.8125rem', color: '#475569' }}>
              Kanban Filters
            </Typography>
          </Stack>

          <TextField
            size="small"
            placeholder="Search board…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            aria-label="Search board"
            sx={{ flex: { xs: '1 1 100%', md: '1 1 220px' }, minWidth: { xs: '100%', md: 200 }, ...filterSx }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#64748B' }} />
                  </InputAdornment>
                ),
                endAdornment: localSearch ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Clear search" onClick={() => setLocalSearch('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }
            }}
          />

          <TextField
            select
            size="small"
            label="Module"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            sx={filterSx}
          >
            <MenuItem value="all">All Modules</MenuItem>
            {modules.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Assignee"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            sx={filterSx}
          >
            <MenuItem value="all">All Assignees</MenuItem>
            <MenuItem value="unassigned">Unassigned</MenuItem>
            {developers.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {getDeveloperDisplayName(d) || d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            sx={filterSx}
          >
            <MenuItem value="all">All Priorities</MenuItem>
            {priorities.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>

          <Chip
            icon={groupByModule ? <GroupIcon sx={{ fontSize: '16px !important' }} /> : <FlatIcon sx={{ fontSize: '16px !important' }} />}
            label={groupByModule ? 'Grouped by Module' : 'Flat list'}
            onClick={() => setGroupByModule((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setGroupByModule((v) => !v);
            }}
            clickable
            aria-pressed={groupByModule}
            sx={{
              height: 40,
              fontWeight: 700,
              bgcolor: groupByModule ? '#DBEAFE' : '#F1F5F9',
              color: groupByModule ? '#1E40AF' : '#64748B',
              border: '1px solid',
              borderColor: groupByModule ? '#93C5FD' : '#E2E8F0',
              '&:focus-visible': { outline: '2px solid #2563EB', outlineOffset: 1 },
            }}
          />

          {hasExtraFilters ? (
            <Button
              size="small"
              onClick={resetKanbanFilters}
              startIcon={<ClearIcon />}
              aria-label="Clear all Kanban filters"
              sx={{ height: 40, fontWeight: 700 }}
            >
              Clear filters
            </Button>
          ) : null}

          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#64748B',
              fontWeight: 650,
              ml: { md: 'auto' },
              alignSelf: { md: 'center' },
            }}
          >
            {filtered.length} task{filtered.length === 1 ? '' : 's'} on board
          </Typography>
        </Stack>
      </Paper>
      {filtered.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: `${tokens.radius.card}px`,
            border: '1.5px dashed #CBD5E1',
            bgcolor: '#fff',
          }}
        >
          <Typography sx={{ fontWeight: 750, mb: 1, color: '#0F172A' }}>No tasks on this board</Typography>
          <Typography sx={{ color: '#64748B', mb: 2, fontSize: '0.875rem' }}>
            Adjust filters or add a task to get started.
          </Typography>
          <Stack
            direction="row"
            useFlexGap
            sx={{
              gap: 1.5,
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
            {hasExtraFilters ? (
              <Button variant="outlined" onClick={resetKanbanFilters}>
                Clear filters
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => onAddTask?.('Assigned')}>
                Add Task
              </Button>
            ) : null}
          </Stack>
        </Paper>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'stretch',
              overflowX: 'auto',
              overflowY: 'hidden',
              pb: 1,
              px: 0.25,
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: { xs: 'x mandatory', lg: 'none' },
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E1 transparent',
              '&::-webkit-scrollbar': { height: 8 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 99 },
              '& > *': { scrollSnapAlign: { xs: 'start', lg: 'none' } },
            }}
          >
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] || []}
                canStatus={canStatus}
                canEdit={canEdit}
                canDelete={canDelete}
                isOver={overColumnId === column.id}
                collapsedModules={collapsedModules}
                onToggleModule={toggleModule}
                onOpen={onOpenTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onAddTask={onAddTask}
                groupByModule={groupByModule}
              />
            ))}
          </Box>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <Box sx={{ width: 280 }} aria-hidden>
                <KanbanTaskCard
                  task={activeTask}
                  columnAccent={columnForStatus(activeTask.status).accent}
                  canStatus={false}
                  isDragOverlay
                />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </Box>
  );
}
