import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip as MuiTooltip,
  MenuItem,
  TextField,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ViewSidebar as SidebarIcon,
  Today as TodayIcon,
  Edit as EditIcon,
  OpenInNew as OpenIcon,
  PersonAdd as AssignIcon,
  CheckCircle as CompleteIcon,
  ChatBubbleOutlined as CommentIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { Gantt, Willow, WillowDark, Tooltip } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import './ProjectGantt.css';
import { VIEW_PRESETS, ZOOM_LEVELS } from './ganttScales';
import {
  buildGanttData,
  ganttDatesToApi,
  isHoliday,
  isSameDay,
  isWeekend,
  remainingDays,
  rowStartLabel,
  rowDueLabel,
  GROUP_BY_OPTIONS,
  STATUS_BAR_COLORS,
} from '../../utils/ganttMapper';
import { getPriorityStyle, normalizePriority } from '../../utils/taskManagementConstants';

function GanttTooltipContent({ data, showOverviewRemarks = false }) {
  const task = data?.task;
  if (!task) return null;
  const desc = task.$description || '';
  const remarks = (task.$remarks || '').trim();
  const workflow = task.$workflowStatus || '';
  const showRemark =
    showOverviewRemarks &&
    remarks &&
    (workflow === 'Blocked' || workflow === 'On Hold');

  return (
    <div className="tt-gantt-tooltip">
      <strong>{task.$taskId ? `${task.$taskId} · ` : ''}{task.text}</strong>
      {desc ? <div className="tt-desc">{desc}</div> : null}
      {showRemark ? (
        <div
          className="tt-desc"
          style={{
            marginTop: 6,
            padding: '6px 8px',
            borderRadius: 6,
            background: workflow === 'Blocked' ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.14)',
            borderLeft: `3px solid ${workflow === 'Blocked' ? '#EF4444' : '#6B7280'}`,
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2, opacity: 0.85 }}>
            {workflow === 'Blocked' ? 'Block reason' : 'Hold reason'}
          </div>
          {remarks}
        </div>
      ) : null}
      <div className="tt-row">
        <span>Assignee</span>
        <span>{task.$assignee || 'Unassigned'}</span>
      </div>
      <div className="tt-row">
        <span>Status</span>
        <span>{task.$statusLabel || task.$status || '—'}</span>
      </div>
      <div className="tt-row">
        <span>Priority</span>
        <span>{task.$priority || '—'}</span>
      </div>
      <div className="tt-row">
        <span>Start</span>
        <span>{rowStartLabel(task) || task.$startLabel || '—'}</span>
      </div>
      <div className="tt-row">
        <span>Due</span>
        <span>{rowDueLabel(task) || task.$endLabel || '—'}</span>
      </div>
      <div className="tt-row">
        <span>Progress</span>
        <span>{task.$progress ?? task.progress ?? 0}%</span>
      </div>
      <div className="tt-row">
        <span>Est. hours</span>
        <span>{task.$estimatedHours != null ? task.$estimatedHours : '—'}</span>
      </div>
      <div className="tt-row">
        <span>Remaining hrs</span>
        <span>{task.$remainingHours != null ? task.$remainingHours : '—'}</span>
      </div>
    </div>
  );
}

function TaskBarTemplate({ data }) {
  const color = data.color || STATUS_BAR_COLORS['In Development'] || '#2563EB';
  const progress = Math.min(100, Math.max(0, Number(data.progress) || 0));
  const isSummary = data.type === 'summary';
  const isMilestone = data.type === 'milestone';

  if (isMilestone) {
    return (
      <div
        className="tt-gantt-bar tt-gantt-bar--milestone wx-bar"
        style={{ background: color || '#0EA5E9' }}
        title={data.text}
      />
    );
  }

  return (
    <div
      className={`tt-gantt-bar wx-bar${isSummary ? ' tt-gantt-bar--summary' : ''}`}
      style={{
        background: isSummary ? undefined : color,
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        color: '#fff',
      }}
    >
      <div className="tt-gantt-bar__progress" style={{ width: `${progress}%` }} />
      {!isSummary && data.$taskId ? (
        <span className="tt-gantt-bar__id">{data.$taskId}</span>
      ) : null}
      <span className="tt-gantt-bar__name">{data.text}</span>
      <div className="tt-gantt-bar__meta">
        <span className="tt-gantt-bar__pct">{progress}%</span>
        {!isSummary && data.$statusLabel ? (
          <span className="tt-gantt-bar__badge">{data.$statusLabel}</span>
        ) : null}
        {!isSummary && data.$assigneeInitials ? (
          <span className="tt-gantt-bar__avatar" title={data.$assignee}>
            {data.$assigneeInitials}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ProgressCell({ row }) {
  if (row?.type === 'milestone' && row?.$isGroupMilestone) {
    return <span style={{ fontSize: 11, color: '#64748b' }}>—</span>;
  }
  const pct = Math.min(100, Math.max(0, Number(row?.$progress ?? row?.progress) || 0));
  const color = row?.color || STATUS_BAR_COLORS.Completed;
  return (
    <div className="tt-progress-cell">
      <div className="tt-progress-cell__track">
        <div
          className="tt-progress-cell__fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="tt-progress-cell__label">{pct}%</span>
    </div>
  );
}

function TaskNameCell({ row }) {
  const color = row?.color || '#94A3B8';
  const priority = normalizePriority(row?.$priority);
  const pStyle = getPriorityStyle(priority);
  return (
    <div className="tt-task-name-cell">
      {row?.type !== 'summary' && row?.type !== 'milestone' ? (
        <>
          <span className="tt-status-dot" style={{ background: color }} />
          <span className="tt-priority-flag" style={{ borderBottomColor: pStyle.color }} title={priority || ''} />
        </>
      ) : null}
      {row?.$taskId ? <span className="tt-task-name-cell__id">{row.$taskId}</span> : null}
      <span className="tt-task-name-cell__text">{row?.text}</span>
    </div>
  );
}

function AssigneeCell({ row }) {
  if (row?.type === 'summary' || row?.$isGroupMilestone) {
    return <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>;
  }
  const initials = row?.$assigneeInitials || '?';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span className="tt-avatar-chip" title={row?.$assignee}>
        {initials}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 650,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row?.$assignee || 'Unassigned'}
      </span>
    </div>
  );
}

function RemainingCell({ row }) {
  if (row?.type === 'summary' || row?.$isGroupMilestone) {
    return <span className="tt-date-cell">—</span>;
  }
  const due = rowDueLabel(row);
  const d = due != null ? remainingDays(due) : row?.$remainingDays;
  if (d == null) return <span className="tt-date-cell">—</span>;
  if (d < 0) return <span className="tt-date-cell tt-date-cell--overdue">{d}d</span>;
  if (d === 0) return <span className="tt-date-cell">Today</span>;
  return <span className="tt-date-cell">{d}d</span>;
}

function EpicCell({ row }) {
  if (row?.type === 'summary') {
    return <span className="tt-epic-cell tt-epic-cell--group">{row?.text || '—'}</span>;
  }
  const epic = row?.$epic || row?.$groupKey || '—';
  return <span className="tt-epic-cell">{epic}</span>;
}

function DateCell({ value }) {
  return <span className="tt-date-cell">{value || '—'}</span>;
}

/**
 * Reusable Project Gantt / Timeline chart.
 */
export default function ProjectGantt({
  tasks = [],
  developers = [],
  readonly = false,
  hideAssignee = false,
  dark = false,
  compact = false,
  groupBy: groupByProp,
  onGroupByChange,
  onDatesChange,
  onTaskClick,
  onQuickAction,
  height = 560,
}) {
  const apiRef = useRef(null);
  const [viewId, setViewId] = useState('week');
  const [listCollapsed, setListCollapsed] = useState(false);
  const [zoomBump, setZoomBump] = useState(0);
  const [groupByInternal, setGroupByInternal] = useState('epic');
  const [actionAnchor, setActionAnchor] = useState(null);
  const [actionTask, setActionTask] = useState(null);
  const savingRef = useRef(false);

  const groupBy = groupByProp ?? groupByInternal;
  const setGroupBy = (v) => {
    if (onGroupByChange) onGroupByChange(v);
    else setGroupByInternal(v);
  };

  const tooltipContent = useMemo(
    () =>
      function OverviewAwareTooltip(props) {
        return <GanttTooltipContent {...props} showOverviewRemarks={compact} />;
      },
    [compact]
  );

  // Collapse groups by default when very large datasets (virtualization-friendly)
  const defaultOpen = tasks.filter((t) => t.recordType !== 'module').length < 250;

  const { ganttTasks, links } = useMemo(
    () => buildGanttData(tasks, developers, { groupBy, defaultOpen }),
    [tasks, developers, groupBy, defaultOpen]
  );

  const preset = VIEW_PRESETS[viewId] || VIEW_PRESETS.week;
  const cellWidth = Math.max(28, Math.min(220, preset.cellWidth + zoomBump * 10));
  const cellHeight = compact ? 34 : 48;
  const scaleHeight = compact ? 26 : 32;

  const openActions = useCallback((event, appTask) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setActionAnchor(event.currentTarget);
    setActionTask(appTask);
  }, []);

  const closeActions = () => {
    setActionAnchor(null);
    setActionTask(null);
  };

  const runAction = (action) => {
    if (actionTask) onQuickAction?.(action, actionTask);
    closeActions();
  };

  const ActionsCell = useCallback(
    ({ row }) => {
      if (readonly || row?.$synthetic || row?.type === 'summary' || row?.type === 'milestone') {
        return null;
      }
      const appTask = row?.$task;
      if (!appTask) return null;
      return (
        <div className="tt-actions-cell">
          <IconButton
            size="small"
            aria-label="Task actions"
            onClick={(e) => openActions(e, appTask)}
            sx={{ p: 0.35 }}
          >
            <MoreIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </div>
      );
    },
    [readonly, openActions]
  );

  const columns = useMemo(() => {
    if (listCollapsed) return false;
    const w = compact
      ? { epic: 88, text: 168, progress: 88, assignee: 108, date: 88, left: 48, actions: 36 }
      : { epic: 110, text: 220, progress: 100, assignee: 124, date: 96, left: 52, actions: 40 };
    return [
      {
        id: '$epic',
        header: 'Epic',
        width: w.epic,
        resize: true,
        cell: EpicCell,
      },
      {
        id: 'text',
        header: 'Task',
        width: w.text,
        resize: true,
        cell: TaskNameCell,
      },
      {
        id: 'progress',
        header: 'Progress',
        width: w.progress,
        cell: ProgressCell,
      },
      // Hide assignee column for client view
      ...(!hideAssignee
        ? [
            {
              id: '$assignee',
              header: 'Assignee',
              width: w.assignee,
              cell: AssigneeCell,
            },
          ]
        : []),
      {
        id: '$startLabel',
        header: 'Start',
        width: w.date,
        align: 'center',
        cell: ({ row }) => <DateCell value={rowStartLabel(row)} />,
      },
      {
        id: '$endLabel',
        header: 'Due',
        width: w.date,
        align: 'center',
        cell: ({ row }) => <DateCell value={rowDueLabel(row)} />,
      },
      {
        id: '$remainingDays',
        header: 'Left',
        width: w.left,
        align: 'center',
        cell: RemainingCell,
      },
      ...(!readonly
        ? [
            {
              id: 'actions',
              header: '',
              width: w.actions,
              cell: ActionsCell,
            },
          ]
        : []),
    ];
  }, [listCollapsed, compact, readonly, hideAssignee, ActionsCell]);

  /** Fixed left-pane width so Epic→Left columns scroll horizontally instead of clipping. */
  const gridWidth = compact ? 360 : 520;

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const markers = useMemo(
    () => [
      {
        start: today,
        text: 'Today',
        css: 'tt-today-marker',
      },
    ],
    [today]
  );

  const highlightTime = useCallback(
    (date, unit) => {
      if (unit !== 'day' && unit !== 'hour') return '';
      if (isSameDay(date, today)) return 'tt-today';
      if (isHoliday(date)) return 'tt-holiday';
      if (isWeekend(date)) return 'tt-weekend';
      return '';
    },
    [today]
  );

  const handleInit = useCallback((api) => {
    apiRef.current = api;
  }, []);

  const handleUpdateTask = useCallback(
    async (ev) => {
      if (readonly || savingRef.current) return;
      if (ev?.inProgress) return;

      const id = ev?.id;
      const patch = ev?.task || {};
      if (typeof id === 'string') return;

      const appId = typeof id === 'number' ? id : Number(id);
      if (!Number.isFinite(appId)) return;

      const dates = ganttDatesToApi(patch);
      if (!dates?.startDate) return;

      try {
        savingRef.current = true;
        await onDatesChange?.(appId, dates);
      } finally {
        savingRef.current = false;
      }
    },
    [readonly, onDatesChange]
  );

  const handleSelectTask = useCallback(
    (ev) => {
      const id = ev?.id;
      if (id == null) return;
      if (typeof id === 'string') return;
      const appTask = tasks.find((t) => t.id === id || String(t.id) === String(id));
      if (appTask && appTask.recordType !== 'module') {
        onTaskClick?.(appTask);
      }
    },
    [tasks, onTaskClick]
  );

  const Theme = dark ? WillowDark : Willow;

  const scrollToToday = () => {
    const api = apiRef.current;
    if (!api) return;
    try {
      if (typeof api.exec === 'function') {
        api.exec('scroll-chart', { left: undefined, date: today });
      }
    } catch {
      /* ignore */
    }
  };

  const zoomIn = () => setZoomBump((z) => Math.min(z + 1, 8));
  const zoomOut = () => setZoomBump((z) => Math.max(z - 1, -6));

  if (!ganttTasks.length) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={compact ? 1 : 1.25}
        sx={{
          mb: compact ? 1 : 1.5,
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <TextField
          select
          size="small"
          label="Group by"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          sx={{
            minWidth: compact ? 120 : 150,
            '& .MuiInputBase-root': {
              borderRadius: 2,
              fontWeight: 650,
              fontSize: compact ? '0.75rem' : '0.82rem',
            },
          }}
        >
          {GROUP_BY_OPTIONS.map((o) => (
            <MenuItem key={o.key} value={o.key}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>

        <Stack
          direction="row"
          spacing={compact ? 0.5 : 1}
          useFlexGap
          sx={{
            flexWrap: 'wrap',
            alignItems: 'center',
            width: compact ? '100%' : 'auto',
            justifyContent: compact ? 'space-between' : 'flex-end',
            ml: 'auto',
          }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={viewId}
            onChange={(_e, v) => {
              if (v) {
                setViewId(v);
                setZoomBump(0);
              }
            }}
            aria-label="Timeline scale"
            sx={{
              bgcolor: dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
              borderRadius: 2,
              p: 0.25,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '8px !important',
                px: compact ? 0.85 : 1.35,
                py: compact ? 0.3 : 0.45,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: compact ? '0.7rem' : '0.78rem',
                '&.Mui-selected': {
                  bgcolor: dark ? '#1e293b' : '#fff',
                  color: '#2563EB',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                },
              },
            }}
          >
            {Object.values(VIEW_PRESETS).map((p) => (
              <ToggleButton key={p.id} value={p.id}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Stack direction="row" spacing={0.15}>
            <MuiTooltip title="Zoom out">
              <IconButton size="small" onClick={zoomOut} aria-label="Zoom out">
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title="Zoom in">
              <IconButton size="small" onClick={zoomIn} aria-label="Zoom in">
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title={listCollapsed ? 'Show task list' : 'Hide task list'}>
              <IconButton
                size="small"
                onClick={() => setListCollapsed((c) => !c)}
                aria-label="Toggle task list"
                color={listCollapsed ? 'default' : 'primary'}
              >
                <SidebarIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title="Jump to today">
              <IconButton size="small" onClick={scrollToToday} aria-label="Today">
                <TodayIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
          </Stack>
        </Stack>
      </Stack>

      <Box
        className={`tt-gantt-shell${dark ? ' tt-gantt-dark' : ''}`}
        sx={{
          height: compact ? height : { xs: Math.min(height, 480), md: height },
          minHeight: 0,
          borderRadius: compact ? 1.5 : undefined,
          overflow: 'hidden',
          border: compact ? '1px solid' : undefined,
          borderColor: compact ? 'divider' : undefined,
          contentVisibility: 'auto',
          '& .wx-willow-theme, & .wx-willow-dark-theme, & > *': {
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Theme fonts={false}>
          <Tooltip content={tooltipContent}>
            <Gantt
              tasks={ganttTasks}
              links={links}
              scales={preset.scales}
              lengthUnit={preset.lengthUnit}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              scaleHeight={scaleHeight}
              autoScale
              zoom={{ levels: ZOOM_LEVELS }}
              columns={columns}
              {...(listCollapsed ? {} : { gridWidth })}
              readonly={readonly}
              highlightTime={highlightTime}
              markers={markers}
              taskTemplate={TaskBarTemplate}
              init={handleInit}
              onUpdateTask={handleUpdateTask}
              onSelectTask={handleSelectTask}
            />
          </Tooltip>
        </Theme>
      </Box>

      {!readonly && !compact && (
        <Typography sx={{ mt: 1, fontSize: '0.72rem', color: 'text.secondary' }}>
          Drag bars to reschedule · Resize edges to change duration · Diamonds are milestones ·
          Arrows show dependencies · Collapse groups for large projects
        </Typography>
      )}

      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={closeActions}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => runAction('edit')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => runAction('details')}>
          <ListItemIcon>
            <OpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => runAction('assign')}>
          <ListItemIcon>
            <AssignIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Assign User</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => runAction('complete')} disabled={actionTask?.status === 'Completed'}>
          <ListItemIcon>
            <CompleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mark Complete</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => runAction('comment')}>
          <ListItemIcon>
            <CommentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Comment</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
