import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  Drawer,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { splitTitleAndDescription } from '../TaskDetailsDrawer';
import { StatusBadge, PriorityBadge } from '../TaskBoard/Badges';
import { PRIORITY_BADGES_LIGHT, PRIORITY_BADGES_DARK } from '../TaskBoard/constants';
import { getDeveloperDisplayName } from '../../utils/developerDisplay';
import { getTaskProgressPercent } from '../../utils/taskProgress';
import { getOverdueDays, shouldShowOverdueAlert } from '../../utils/taskManagementConstants';
import {
  countDaySummary,
  formatDayHeader,
  groupDayTasks,
  parseDateKey,
} from '../../utils/calendarHelpers';
import { tokens } from '../../theme';

const GROUP_META = [
  { key: 'overdue', label: 'OVERDUE', color: '#DC2626' },
  { key: 'dueToday', label: 'DUE TODAY', color: '#D97706' },
  { key: 'upcoming', label: 'UPCOMING', color: '#2563EB' },
  { key: 'completed', label: 'COMPLETED', color: '#059669' },
];

function getDevInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function DayTaskCard({ task, developers, isClient, onClick, isDark }) {
  const { title } = splitTitleAndDescription(task.taskName, task.description);
  const dev = developers.find(
    (d) => d.id === task.developerId || d.id === parseInt(task.developerId, 10)
  );
  const devName = isClient ? null : getDeveloperDisplayName(dev);
  const overdue = shouldShowOverdueAlert(task);
  const overdueDays = overdue ? getOverdueDays(task) : 0;
  const pct = getTaskProgressPercent(task);
  const priorityBadges = isDark ? PRIORITY_BADGES_DARK : PRIORITY_BADGES_LIGHT;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onClick?.(task)}
      sx={{
        width: '100%',
        textAlign: 'left',
        border: '1px solid',
        borderColor: overdue ? '#FECACA' : 'divider',
        borderRadius: `${tokens.radius.button}px`,
        bgcolor: overdue ? (isDark ? '#450a0a22' : '#FEF2F2') : 'background.paper',
        p: 1.5,
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: tokens.shadow.hover,
        },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <StatusBadge status={task.status} isDark={isDark} size="small" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.35, mb: 0.35 }}>
            {title || 'Untitled task'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
            {task.taskId || '—'}
            {task.module ? ` · Module: ${task.module}` : ''}
          </Typography>
          {!isClient && devName && (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
              {dev && (
                <Avatar sx={{ width: 22, height: 22, fontSize: '0.62rem', bgcolor: dev.color }}>
                  {getDevInitials(devName)}
                </Avatar>
              )}
              <Typography variant="caption" sx={{ fontWeight: 650 }}>
                {devName}
              </Typography>
            </Stack>
          )}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
            {task.priority && (
              <PriorityBadge priority={task.priority} badges={priorityBadges} />
            )}
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {pct}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 4, borderRadius: 999, mt: 0.75, bgcolor: 'rgba(148,163,184,0.25)' }}
          />
          {overdue && (
            <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 800, display: 'block', mt: 0.75 }}>
              {overdueDays}d late
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

function PanelContent({ dateKey, tasks, developers, isClient, onTaskClick, onClose }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const date = parseDateKey(dateKey);
  const groups = groupDayTasks(tasks, dateKey);
  const summary = countDaySummary(groups);

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
          {formatDayHeader(date)}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close day details">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {summary.overdue > 0 && (
        <Chip
          label={`${summary.overdue} Overdue`}
          size="small"
          sx={{
            mb: 2,
            fontWeight: 800,
            bgcolor: isDark ? '#450a0a' : '#FEE2E2',
            color: '#DC2626',
            border: '1px solid #FECACA',
          }}
        />
      )}

      <Stack spacing={2.5} sx={{ overflowY: 'auto', flex: 1, minHeight: 0, pr: 0.5 }}>
        {GROUP_META.map(({ key, label, color }) => {
          const items = groups[key];
          if (!items?.length) return null;
          return (
            <Box key={key}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  color,
                  display: 'block',
                  mb: 1,
                }}
              >
                {label} ({items.length})
              </Typography>
              <Stack spacing={1}>
                {items.map((task) => (
                  <DayTaskCard
                    key={task.id}
                    task={task}
                    developers={developers}
                    isClient={isClient}
                    isDark={isDark}
                    onClick={onTaskClick}
                  />
                ))}
              </Stack>
            </Box>
          );
        })}

        {summary.total === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No tasks scheduled for this day.
          </Typography>
        )}
      </Stack>
    </>
  );
}

export default function DayDetailsPanel({
  dateKey,
  tasks,
  developers,
  isClient,
  onTaskClick,
  onClose,
  mobile = false,
  open = true,
}) {
  if (!dateKey) return null;

  if (mobile) {
    return (
      <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { height: '85vh', borderRadius: '16px 16px 0 0', p: 2 } }}>
        <PanelContent
          dateKey={dateKey}
          tasks={tasks}
          developers={developers}
          isClient={isClient}
          onTaskClick={onTaskClick}
          onClose={onClose}
        />
      </Drawer>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        width: { md: 340, lg: 360 },
        flexShrink: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${tokens.radius.card}px`,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { md: 'calc(100vh - 280px)' },
        minHeight: 420,
        bgcolor: 'background.paper',
      }}
    >
      <PanelContent
        dateKey={dateKey}
        tasks={tasks}
        developers={developers}
        isClient={isClient}
        onTaskClick={onTaskClick}
        onClose={onClose}
      />
    </Paper>
  );
}
