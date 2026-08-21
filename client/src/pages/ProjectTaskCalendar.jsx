import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Calendar as PrimeCalendar } from 'primereact/calendar';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  IconButton,
  CircularProgress,
  MenuItem,
  TextField,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  ListAlt as BoardIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import api from '../services/api';
import TaskDetailsDrawer, { splitTitleAndDescription } from '../components/TaskDetailsDrawer';
import { useProjectId } from '../hooks/useProjectId';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../context/RoleContext';
import { getTaskProgressPercent } from '../utils/taskProgress';

const STATUS_COLORS = {
  Upcoming: '#64748B',
  Assigned: '#3B82F6',
  'In Development': '#4F46E5',
  Testing: '#06B6D4',
  Completed: '#22C55E',
  Blocked: '#EF4444',
  'On Hold': '#F59E0B',
  'Code Review': '#06B6D4',
};

const ALL_STATUSES = [
  'Upcoming',
  'Assigned',
  'In Development',
  'Testing',
  'Completed',
  'Blocked',
  'On Hold',
];

function toDateOnly(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** FullCalendar end is exclusive for all-day events — bump by 1 day when spanning. */
function exclusiveEnd(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function taskToEvent(task) {
  const start = toDateOnly(task.startDate);
  const due = toDateOnly(task.dueDate);
  if (!start && !due) return null;

  const { title } = splitTitleAndDescription(task.taskName, task.description);
  const color = STATUS_COLORS[task.status] || '#64748B';
  const pct = getTaskProgressPercent(task);

  let eventStart = start || due;
  let eventEnd = null;
  if (start && due && due > start) {
    eventEnd = exclusiveEnd(due);
  } else if (start && due && due === start) {
    eventEnd = null;
  } else if (!start && due) {
    eventStart = due;
  }

  return {
    id: String(task.id),
    title: `${task.taskId ? `${task.taskId} · ` : ''}${title || 'Task'}`,
    start: eventStart,
    end: eventEnd || undefined,
    allDay: true,
    backgroundColor: color,
    borderColor: color,
    textColor: '#fff',
    extendedProps: {
      task,
      progress: pct,
      status: task.status,
    },
  };
}

export default function ProjectTaskCalendar() {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const calendarHeight = isXs ? 380 : isMobile ? 520 : 640;
  const { role, project: clientProject, clientMeta } = useRole();
  const isClient = role === 'client';
  const canEditPerm = usePermission('task.edit');
  const canEdit = !isClient && canEditPerm;

  const calendarRef = useRef(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('dayGridMonth');
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const tasksPath = isClient
    ? `/client/${clientMeta?.token}/tasks`
    : `/projects/${projectId}/tasks`;
  const dashboardPath = `/projects/${projectId}/dashboard`;

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setLoadError(false);
      if (isClient && clientProject) {
        setProject(clientProject);
      } else {
        const projects = await api.getProjects();
        const found = projects.find((p) => p.id === parseInt(projectId, 10));
        setProject(found || { name: `Project #${projectId}` });
      }
      const [res, devs] = await Promise.all([
        api.getProjectTasks(projectId, { limit: -1 }),
        api.getDevelopers().catch(() => []),
      ]);
      setDevelopers(devs || []);
      setTasks((res.tasks || []).filter((t) => t.recordType !== 'module'));
    } catch (err) {
      console.error('Failed to load calendar:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId, isClient, clientProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const events = useMemo(
    () => filteredTasks.map(taskToEvent).filter(Boolean),
    [filteredTasks]
  );

  const unscheduled = useMemo(
    () => filteredTasks.filter((t) => !toDateOnly(t.startDate) && !toDateOnly(t.dueDate)),
    [filteredTasks]
  );

  const tasksOnSelectedDay = useMemo(() => {
    const key = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      : null;
    if (!key) return [];
    return filteredTasks.filter((t) => {
      const start = toDateOnly(t.startDate);
      const due = toDateOnly(t.dueDate);
      if (!start && !due) return false;
      if (start && due) return key >= start && key <= due;
      return key === (start || due);
    });
  }, [filteredTasks, selectedDate]);

  const goToDate = (date) => {
    if (!date) return;
    setSelectedDate(date);
    const apiCal = calendarRef.current?.getApi();
    if (apiCal) apiCal.gotoDate(date);
  };

  const handleEventClick = (info) => {
    const task = info.event.extendedProps.task;
    if (!task) return;
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleDateClick = (info) => {
    setSelectedDate(info.date);
  };

  const persistDates = async (taskId, start, endExclusive) => {
    const updates = { startDate: start };
    if (endExclusive) {
      const d = new Date(`${endExclusive}T00:00:00`);
      d.setDate(d.getDate() - 1);
      updates.dueDate = d.toISOString().slice(0, 10);
    } else {
      updates.dueDate = start;
    }
    const updated = await api.updateTask(taskId, updates);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    if (selectedTask?.id === taskId) setSelectedTask(updated);
    return updated;
  };

  const handleEventDrop = async (info) => {
    if (!canEdit || isClient) {
      info.revert();
      return;
    }
    try {
      const start = info.event.startStr.slice(0, 10);
      const end = info.event.end ? info.event.endStr.slice(0, 10) : null;
      await persistDates(parseInt(info.event.id, 10), start, end);
      showAlert('Task dates updated');
    } catch (err) {
      console.error(err);
      info.revert();
      showAlert('Failed to update dates', 'error');
    }
  };

  const handleEventResize = async (info) => {
    if (!canEdit || isClient) {
      info.revert();
      return;
    }
    try {
      const start = info.event.startStr.slice(0, 10);
      const end = info.event.end ? info.event.endStr.slice(0, 10) : null;
      await persistDates(parseInt(info.event.id, 10), start, end);
      showAlert('Task duration updated');
    } catch (err) {
      console.error(err);
      info.revert();
      showAlert('Failed to update dates', 'error');
    }
  };

  const changeView = (_, next) => {
    if (!next) return;
    setViewMode(next);
    calendarRef.current?.getApi()?.changeView(next);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 420 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography
          variant="h6"
          sx={{
            color: "text.secondary",
            mb: 2
          }}>
          Could not load project calendar
        </Typography>
        <Button variant="contained" onClick={loadData} startIcon={<RefreshIcon />}>
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
        maxWidth: 1680,
        mx: 'auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          gap: { xs: 2, sm: 2.5 },
          mb: { xs: 2.5, md: 3 }
        }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "flex-start",
            gap: 1.25,
            flexWrap: "wrap",
            minWidth: 0
          }}>
          {!isClient && (
            <IconButton
              onClick={() => navigate('/projects')}
              size="small"
              sx={{ mt: 0.25, border: '1px solid', borderColor: 'divider' }}
            >
              <BackIcon />
            </IconButton>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.02em', mb: 0.75 }}
            >
              {project?.name || 'Project'} · Calendar
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                lineHeight: 1.5
              }}>
              {events.length} scheduled · {unscheduled.length} unscheduled
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          sx={{
            gap: 1.25,
            flexWrap: "wrap",
            flexShrink: 0,
            pt: { sm: 0.25 }
          }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<BoardIcon />}
            onClick={() => navigate(tasksPath)}
            sx={{ fontWeight: 700, textTransform: 'none', px: 1.75, py: 0.85 }}
          >
            Board
          </Button>
          {!isClient && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DashboardIcon />}
              onClick={() => navigate(dashboardPath)}
              sx={{ fontWeight: 700, textTransform: 'none', px: 1.75, py: 0.85 }}
            >
              Dashboard
            </Button>
          )}
          <IconButton
            onClick={loadData}
            size="small"
            title="Refresh"
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{
          gap: { xs: 2, md: 3 },
          alignItems: "stretch"
        }}>
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', md: 300, lg: 320 },
            flexShrink: 0,
            p: { xs: 2, md: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: isDark ? 'grey.900' : 'background.paper',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: 1.75,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              fontSize: '0.72rem',
              color: 'text.secondary',
            }}
          >
            Jump to date
          </Typography>
          <Box className={`tt-prime-calendar ${isDark ? 'tt-prime-dark' : ''}`} sx={{ mb: 2.5 }}>
            <PrimeCalendar
              value={selectedDate}
              onChange={(e) => goToDate(e.value)}
              inline
              showWeek
            />
          </Box>

          <TextField
            select
            fullWidth
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ mb: 2.75 }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            {ALL_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: 1.25,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              fontSize: '0.72rem',
              color: 'text.secondary',
            }}
          >
            On selected day
          </Typography>
          <Stack
            sx={{
              gap: 1,
              maxHeight: 220,
              overflow: 'auto',
              mb: 2.75,
              pr: 0.5
            }}>
            {tasksOnSelectedDay.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  py: 0.5
                }}>
                No tasks on this date
              </Typography>
            ) : (
              tasksOnSelectedDay.map((t) => {
                const { title } = splitTitleAndDescription(t.taskName, t.description);
                return (
                  <Chip
                    key={t.id}
                    label={`${t.taskId || 'T'} · ${title}`}
                    size="small"
                    onClick={() => {
                      setSelectedTask(t);
                      setDrawerOpen(true);
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      height: 'auto',
                      py: 0.85,
                      px: 0.25,
                      bgcolor: STATUS_COLORS[t.status] || '#64748B',
                      color: '#fff',
                      fontWeight: 600,
                      '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.35 },
                    }}
                  />
                );
              })
            )}
          </Stack>

          {unscheduled.length > 0 && (
            <>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  mb: 1.25,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  fontSize: '0.72rem',
                  color: 'text.secondary',
                }}
              >
                Unscheduled ({unscheduled.length})
              </Typography>
              <Stack
                sx={{
                  gap: 1,
                  maxHeight: 200,
                  overflow: 'auto',
                  pr: 0.75
                }}>
                {unscheduled.slice(0, 12).map((t) => {
                  const { title } = splitTitleAndDescription(t.taskName, t.description);
                  return (
                    <Box
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t);
                        setDrawerOpen(true);
                      }}
                      sx={{
                        cursor: 'pointer',
                        px: 1.25,
                        py: 1,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isDark ? 'grey.800' : 'grey.50',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: isDark ? 'grey.700' : 'primary.50',
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 650,
                          fontSize: '0.8rem',
                          lineHeight: 1.4,
                          color: 'text.primary',
                        }}
                      >
                        {t.taskId || 'T'} · {title}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2, md: 2.75 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: isDark ? 'grey.900' : 'background.paper',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 2.5
            }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={changeView}
              sx={{ flexWrap: 'wrap' }}
            >
              <ToggleButton value="dayGridMonth" sx={{ textTransform: 'none', fontWeight: 700, px: 1.75 }}>
                Month
              </ToggleButton>
              <ToggleButton value="timeGridWeek" sx={{ textTransform: 'none', fontWeight: 700, px: 1.75 }}>
                Week
              </ToggleButton>
              <ToggleButton value="timeGridDay" sx={{ textTransform: 'none', fontWeight: 700, px: 1.75 }}>
                Day
              </ToggleButton>
              <ToggleButton value="listWeek" sx={{ textTransform: 'none', fontWeight: 700, px: 1.75 }}>
                List
              </ToggleButton>
            </ToggleButtonGroup>

            <Stack
              direction="row"
              useFlexGap
              sx={{
                gap: 1,
                flexWrap: "wrap"
              }}>
              {ALL_STATUSES.slice(0, isXs ? 4 : 6).map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  sx={{
                    height: 26,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    bgcolor: STATUS_COLORS[s],
                    color: '#fff',
                    px: 0.25,
                  }}
                />
              ))}
            </Stack>
          </Stack>

          <Box
            className={`tt-fullcalendar ${isDark ? 'tt-fc-dark' : ''}`}
            sx={{
              '& .fc': { fontFamily: 'inherit' },
              '& .fc-toolbar': { mb: '1rem !important', gap: '0.75rem' },
              '& .fc-toolbar-title': { fontSize: '1.2rem', fontWeight: 800 },
              '& .fc-button': {
                textTransform: 'capitalize',
                fontWeight: 700,
                borderRadius: '8px !important',
                padding: '0.4rem 0.75rem !important',
              },
              '& .fc-button-group': { gap: '4px' },
              '& .fc-col-header-cell': { py: 1 },
              '& .fc-daygrid-day-frame': { minHeight: 96, p: '4px' },
              '& .fc-event': {
                cursor: 'pointer',
                borderRadius: '5px',
                fontWeight: 600,
                fontSize: '0.75rem',
                px: 0.5,
                my: '2px',
              },
              '& .fc-daygrid-event': { whiteSpace: 'nowrap' },
            }}
          >
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '',
              }}
              height="auto"
              contentHeight={calendarHeight}
              events={events}
              editable={canEdit && !isClient}
              eventStartEditable={canEdit && !isClient}
              eventDurationEditable={canEdit && !isClient}
              selectable={false}
              dayMaxEvents={3}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              datesSet={(arg) => {
                if (arg.start) setSelectedDate(arg.view.currentStart);
              }}
              eventDidMount={(info) => {
                const pct = info.event.extendedProps.progress;
                if (pct != null) {
                  info.el.title = `${info.event.title} · ${info.event.extendedProps.status} · ${pct}%`;
                }
              }}
            />
          </Box>

          {canEdit && !isClient && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block',
                mt: 2,
                pt: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                lineHeight: 1.5
              }}>
              Drag tasks to reschedule · resize multi-day bars to change duration
            </Typography>
          )}
        </Paper>
      </Stack>
      <TaskDetailsDrawer
        open={drawerOpen}
        task={selectedTask}
        developers={developers}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTask(updated);
        }}
      />
      <Snackbar
        open={alert.open}
        autoHideDuration={3500}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={alert.severity}
          onClose={() => setAlert((a) => ({ ...a, open: false }))}
          variant="filled"
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
